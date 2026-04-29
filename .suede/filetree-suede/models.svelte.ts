import { type IWithEvents, WithEvents } from "../with-events-suede";
import { mixin } from "../mixin-suede";
import { renderable } from "../svelte-snippet-renderer-suede";
import { type Find, byName, byPath } from "./utils/find";
import { flushSync, tick, type Snippet } from "svelte";
import { addFile, fileIcon, symlinkIcon } from "./File.svelte";
import { folderOpen, folderClosed, trigger, addFolder } from "./Folder.svelte";
import type { Items } from "./context";
import type { Choose, Join, Expand } from "./utils";
import { rename } from "./Root.svelte";

type HighLevel = {
  /**
   * A regular file entry
   */
  file: "file";
  /**
   * A regular folder entry
   */
  folder: "folder";
  /**
   * The root entry of the file tree
   */
  root: "root";
  /**
   * A symbolic link to a file or folder entry
   */
  symlink: "symlink";
  /**
   * A view into a file, folder, or symlink entry
   * (used for the ancestors of a folder symlink)
   */
  view: "view";
};

/**
 * TODO: Utilize once symlinks and views are supported
 */
type Specifc = Expand<
  Pick<HighLevel, "root" | "file" | "folder"> & {
    [k in Join<
      [HighLevel["file" | "folder"], HighLevel["symlink" | "view"]],
      " "
    >]: k;
  }
>;

/**
 * TODO: Support symlinks (which, in the case of symlinked folders, require views)
 */
export type Type = Exclude<
  HighLevel[keyof HighLevel],
  HighLevel["symlink" | "view"]
>;

export type ItemType = Exclude<Type, HighLevel["root" | "view"]>;
export type DisplayableType = Exclude<Type, HighLevel["root"]>;
export type PrimitiveType = HighLevel["file" | "folder"];
export type ParentType = HighLevel["folder" | "root"];
export type ReferentialType = HighLevel["symlink" | "view"];

export type Models = {
  file: File;
  folder: Folder;
  root: Root;
};

export type SomeModel<T extends keyof Models = "file" | "folder"> = Models[T];

export namespace Events {
  export type Item = {
    clicked: [SomeModel];
    "request rename": [config: { cursor?: number; force?: string } | undefined];
    "request focus toggle": [];
    renamed: [SomeModel, from: string, to: string];
    reparented: [SomeModel];
  };

  export type Parent = {
    opening: [entry: SomeModel<ParentType>];
    opened: [entry: SomeModel<ParentType>];
    closing: [entry: SomeModel<ParentType>];
    closed: [entry: SomeModel<ParentType>];
    "child add finalized": [entry: SomeModel];
    "child clicked": [entry: SomeModel, index: number];
    "child renamed": [
      entry: SomeModel,
      from: string,
      to: string,
      index: number,
    ];
    "request open": [depth: "recursive" | "local"];
    "request close": [depth: "recursive" | "local"];
    "request expansion toggle": [depth: "recursive" | "local"];
  };

  export type WithParentEvents = IWithEvents<Parent>;
  export type WithItemEvents = IWithEvents<Item>;
}

const is = Object.assign(
  <T extends Type>(
    entry: Pick<SomeModel<Type>, "type">,
    query: T,
  ): entry is Models[T] => entry.type === (query as T),
  {
    primitive: (
      entry: Pick<SomeModel, "type">,
    ): entry is Models[PrimitiveType] =>
      entry.type === "file" || entry.type === "folder",
  },
);

namespace Factories {
  export type MakeItem<T extends ItemType> = (
    type: T,
    parent: Models[ParentType],
  ) => Models[T];

  export type FolderLikeIcon = (
    type: HighLevel["folder" | "symlink"],
    state: "open" | "closed",
  ) => Snippet<[]>;

  export type FileLikeIcon = (
    type: HighLevel["file" | "symlink"],
  ) => Snippet<[]>;

  export type NameForType = (type: PrimitiveType) => string;

  export type GetContextMenuItems<T extends Models[keyof Models]> = (
    self: T,
  ) => Items | undefined;

  export type GetNameVariant = (current: string, attempt: number) => string;

  export type ValidNameContent = (
    candidate: string,
  ) => true | { error?: string; suggestion?: string };

  export type Sort = (a: SomeModel, b: SomeModel) => number;

  export type All = {
    make: MakeItem<ItemType>;
    validNameContent: ValidNameContent;
    getNameVariant: GetNameVariant;
    getContextMenuItems: GetContextMenuItems<Models[keyof Models]>;
    defaultNameForType: NameForType;
    defaultFileIcon: FileLikeIcon;
    defaultFolderIcon: FolderLikeIcon;
    defaultSort: Sort;
  };
}

const make = (<T extends ItemType>(type: T, parent: Models[ParentType]) =>
  (
    (is(parent, "root") ? parent.make : (parent.make ?? parent.root.make)) ??
    defaults.make
  )(type, parent) as Models[T]) satisfies Factories.MakeItem<ItemType>;

export const validNameContent = (
  model: SomeModel,
  candidate: string,
): ReturnType<Factories.ValidNameContent> =>
  (
    model.parent.validNameContent ??
    model.root.validNameContent ??
    ((candidate) => {
      const unique = model.parent.isNameUnique(candidate);
      if (!unique) return { error: "Name must be unique" };
      return defaults.validNameContent(candidate);
    })
  )?.(candidate);

export const getContextMenuItems = <T extends SomeModel>(model: T) =>
  (
    (model.getContextMenuItems as Factories.GetContextMenuItems<T>) ??
    model.parent.defaultContextMenuItems ??
    model.root.defaultContextMenuItems ??
    defaults.getContextMenuItems
  )(model);

const defaults: Factories.All = {
  make: (type, parent) =>
    type === "file" ? new File({ parent }) : new Folder({ parent }),
  validNameContent: (candidate) =>
    candidate.trim() === "" ? { error: "Name can't be empty" } : true,
  getNameVariant: (current: string, attempt: number) => {
    const dot = current.lastIndexOf(".");
    let base = current;
    let ext = "";

    if (dot >= 0) {
      base = current.slice(0, dot);
      ext = current.slice(dot);
    }

    const match = base.match(/^(.+)\((\d+)\)$/);
    if (match) base = match[1];

    return `${base}(${attempt + 1})${ext}`;
  },
  defaultNameForType: (type) => type,
  defaultFileIcon: (type) => {
    switch (type) {
      case "file":
        return fileIcon;
      case "symlink":
        return symlinkIcon;
    }
  },
  defaultFolderIcon: (type, state) =>
    type === "folder"
      ? state === "open"
        ? folderOpen
        : folderClosed
      : state === "open"
        ? folderOpen
        : folderClosed,
  getContextMenuItems: (model) => {
    if (model.type === "root") {
      return model.readonly ? [] : [];
    } else if (model.type === "folder") {
      return model.readonly
        ? []
        : [
            {
              content: rename,
              onclick: () =>
                model.fire("request rename", {
                  cursor: model.name.lastIndexOf("."),
                }),
            },
            {
              content: addFile,
              onclick: () => model.add("file"),
            },
            {
              content: addFolder,
              onclick: () => model.add("folder"),
            },
          ];
    } else if (model.type === "file") {
      return model.readonly
        ? []
        : [
            {
              content: rename,
              onclick: () =>
                model.fire("request rename", {
                  cursor: model.name.lastIndexOf("."),
                }),
            },
          ];
    }
  },
  defaultSort: (a, b) => a.name.localeCompare(b.name),
};

class RawParent {
  children = $state(new Array<SomeModel>());

  validNameContent?: Factories.ValidNameContent;
  getNameVariant?: Factories.GetNameVariant;
  defaultNameForType?: Factories.NameForType;
  make?: Factories.MakeItem<ItemType>;
  defaultContextMenuItems?: Factories.GetContextMenuItems<Models[keyof Models]>;
  defaultSort?: Factories.Sort;

  constructor(
    args?: Choose<
      RawParent,
      {
        optional:
          | "validNameContent"
          | "getNameVariant"
          | "defaultNameForType"
          | "make"
          | "defaultContextMenuItems";
      }
    >,
  ) {
    this.make = args?.make;
    this.validNameContent = args?.validNameContent;
    this.getNameVariant = args?.getNameVariant;
    this.defaultNameForType = args?.defaultNameForType;
    this.defaultContextMenuItems = args?.defaultContextMenuItems;
  }

  isNameUnique(name: string) {
    return !this.children.some((child) => child.name === name);
  }

  getUniqueName(candidate: string) {
    let counter = 0;
    while (true) {
      const result = this.validNameContent?.(candidate);
      if (typeof result === "object" && result.suggestion)
        candidate = result.suggestion;
      if (this.isNameUnique(candidate)) return candidate;
      candidate =
        this.getNameVariant?.(candidate, counter) ??
        defaults.getNameVariant(candidate, counter);
      counter++;
    }
  }

  walk(fn: (node: Models[ItemType]) => void) {
    for (const child of this.children) {
      fn(child);
      if (child.is("folder")) child.walk(fn);
    }
  }

  find<T extends Find.Query>(query: T) {
    return (
      "path" in query
        ? byPath(query.path, this.children)
        : byName(query.name, this.children)
    ) as Find.Result<T>;
  }

  sort() {
    this.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  propagate(parent: IWithEvents<Events.Parent>) {
    return WithEvents.Collect(
      this.children as any as WithEvents<Events.Item & Events.Parent>[],
    ).subscribe({
      clicked: (child, _, index) => parent.fire("child clicked", child, index),
      renamed: (child, from, to, _, index) =>
        parent.fire("child renamed", child, from, to, index),
      "child clicked": (child, index) =>
        parent.fire("child clicked", child, index),
      "child renamed": (child, from, to, index) =>
        parent.fire("child renamed", child, from, to, index),
      "child add finalized": (entry) =>
        parent.fire("child add finalized", entry),
    });
  }

  insert<const T extends Models[ItemType] | Models[ItemType][]>(
    item: T,
    index?: number,
  ): T {
    if (index === undefined)
      Array.isArray(item)
        ? this.children.push(...item)
        : this.children.push(item);
    else
      Array.isArray(item)
        ? this.children.splice(index, 0, ...item)
        : this.children.splice(index, 0, item);
    return item;
  }

  async addNew(
    typeOrItem: ItemType | Folder | File,
    parent: Models[ParentType],
  ) {
    const child =
      typeof typeOrItem === "string" ? make(typeOrItem, parent) : typeOrItem;
    child.parent = parent;
    const parentEvents = parent as IWithEvents<Events.Parent>;
    this.insert(child);
    parentEvents.fire("request open", "local");
    await tick();
    const childEvents = child as Events.WithItemEvents;
    childEvents.once({
      renamed: () => parentEvents.fire("child add finalized", child),
    });
    childEvents.fire("request rename", { force: "" });
    return child;
  }
}

class Icon {
  /**
   * Base class for supporting an icon for file-like entries
   * (entries with only a single state, as managed by this library)
   */
  static readonly FileLike = class FileLikeIcon {
    readonly icon: renderable.Returns<"single", "optional">;

    constructor(
      args: { type: HighLevel["file" | "symlink"] } & Partial<
        renderable.Initial<FileLikeIcon["icon"]> & {
          defaultFileIcon?: Factories.FileLikeIcon;
        }
      >,
    ) {
      this.icon = renderable("single");
      if (args.renderables)
        renderable.init(
          this.icon,
          args as renderable.Initial<FileLikeIcon["icon"]>,
        );
      else {
        const getIcon = args.defaultFileIcon ?? defaults.defaultFileIcon;
        this.icon.set((render) => render(getIcon(args.type)));
      }
    }
  };

  /**
   * Base class for supporting an icon for folder-like entries
   * (entries with open and closed states)
   */
  static readonly FolderLike = class FolderLikeIcon {
    readonly icon: {
      closed: renderable.Returns<"single", "optional">;
      open: renderable.Returns<"single", "optional">;
    };

    constructor(
      args: { type: HighLevel["folder" | "symlink"] } & Partial<
        renderable.Initial<FolderLikeIcon["icon"]> & {
          defaultFolderIcon: Factories.FolderLikeIcon;
        }
      >,
    ) {
      this.icon = { open: renderable("single"), closed: renderable("single") };
      if (args.renderables)
        renderable.init(
          this.icon,
          args as renderable.Initial<FolderLikeIcon["icon"]>,
        );
      else {
        const getIcon = args.defaultFolderIcon ?? defaults.defaultFolderIcon;
        this.icon.open.set((render) => render(getIcon(args.type, "open")));
        this.icon.closed.set((render) => render(getIcon(args.type, "closed")));
      }
    }
  };
}

/**
 * Base class for file and folder entries
 */
class Item<T extends ItemType> {
  name: string;
  parent: Models[ParentType];
  readonly: boolean;

  readonly type: T;
  readonly path: string;
  readonly onNameChange?: (from: string, to: string) => void;

  /**
   * Get context menu items specific to this item
   */
  readonly getContextMenuItems?: Factories.GetContextMenuItems<Models[T]>;

  get root(): Root {
    let current: Models[ParentType] = this.parent;
    while (!is(current, "root")) current = current.parent;
    return current as Root;
  }

  get defaultName() {
    return (
      (this.parent ?? this.root).defaultNameForType ??
      defaults.defaultNameForType
    )(this.type);
  }

  constructor({
    type,
    name,
    parent,
    readonly,
    onNameChange,
    getContextMenuItems,
  }: Choose<
    Item<T>,
    {
      required: "type" | "parent";
      optional: "readonly" | "name" | "onNameChange" | "getContextMenuItems";
    }
  > &
    (T extends PrimitiveType ? { name?: string } : { name: string }) & {
      defaultNameForType?: Factories.NameForType;
    }) {
    this.type = type;
    this.readonly = $state(readonly ?? false);
    this.parent = $state(parent);
    this.name = $state(name ?? this.parent.getUniqueName(this.defaultName));
    this.path = $derived(`${this.parent.path ?? ""}/${this.name}`);
    this.onNameChange = onNameChange;
    this.getContextMenuItems = getContextMenuItems;
  }

  is<Type extends keyof Models>(query: Type): this is Models[Type] {
    return is(this, query);
  }
}

namespace Serialized {
  type _File = string;
  type _Folder = [name: string, children: Entry[]];

  type Construct<T extends abstract new (...args: any) => any> = (
    Constructor: T,
    name: string,
    parent: Models[ParentType],
  ) => InstanceType<T>;

  export type Factory = Partial<{
    file: Construct<typeof File>;
    folder: Construct<typeof Folder>;
    root: (Constructor: typeof Root) => Root;
  }>;
  export type Entry = _File | _Folder;
}

export class Root extends mixin([RawParent, WithEvents<Events.Parent>]) {
  readonly: boolean;
  path?: undefined;
  name?: undefined;
  readonly type = "root";

  constructor(
    args?: ConstructorParameters<typeof RawParent>[0] & {
      readonly?: boolean;
    },
  ) {
    super([args]);
    this.readonly = $state(args?.readonly ?? false);
  }

  create<T extends ItemType>(type: T, parent: Models[ParentType]) {
    return (this.make ?? defaults.make)(type, parent);
  }

  static Initialize(
    facotory: Serialized.Factory,
    ...entries: Serialized.Entry[]
  ): Root;
  static Initialize(...entries: Serialized.Entry[]): Root;
  static Initialize(
    factoryOrEntry: Serialized.Factory | Serialized.Entry,
    ...entries: Serialized.Entry[]
  ): Root {
    let factory: Serialized.Factory;

    if (typeof factoryOrEntry === "string" || Array.isArray(factoryOrEntry)) {
      factory = {};
      entries.unshift(factoryOrEntry);
    } else factory = factoryOrEntry;

    factory.file ??= (Ctor, name, parent) => new Ctor({ name, parent });
    factory.folder ??= (Ctor, name, parent) => new Ctor({ name, parent });
    factory.root ??= (Ctor) => new Ctor();

    const root = factory.root(Root);

    const build = (node: Serialized.Entry, parent: Models[ParentType]) => {
      if (typeof node === "string") {
        const file = factory.file!(File, node, parent);
        parent.insert(file);
      } else {
        const [name, children] = node;
        const folder = factory.folder!(Folder, name, parent);
        parent.insert(folder);
        for (const child of children) build(child, folder);
      }
    };

    for (const entry of entries) build(entry, root);
    return root;
  }

  async add<T extends File | Folder>(item: Folder | File): Promise<T>;
  async add<T extends ItemType>(type: T): Promise<Models[T]>;
  async add(typeOrItem: ItemType | Folder | File) {
    this.addNew(typeOrItem, this);
  }
}

function argify<T extends Type, Args>(
  type: T,
  target: Args,
): [Args & { type: T }];
function argify<T extends Type, Args>(
  type: T,
  target: Args,
  name: string,
): [Args & { type: T; name: string }];
function argify<T extends Type, Args>(type: T, target: Args, name?: string) {
  const casted = target as Args & { type: T };
  casted.type = type;
  return [casted];
}

type ModelArgs<T extends typeof File | typeof Folder> =
  ConstructorParameters<T>[0];

export class File extends mixin([
  Item<"file">,
  Icon.FileLike,
  WithEvents<Events.Item>,
]) {
  constructor(
    args: Omit<ConstructorParameters<typeof Item>[0], "type"> &
      Omit<ConstructorParameters<(typeof Icon)["FileLike"]>[0], "type">,
  ) {
    const tuple = File.Argify(args);
    super(tuple, tuple);
  }

  static Argify(args: ModelArgs<typeof File>) {
    const casted = args as ModelArgs<typeof File> & { type: "file" };
    casted.type = "file";
    return [casted] as [typeof casted];
  }
}

export class Folder extends mixin([
  Item<"folder">,
  RawParent,
  Icon.FolderLike,
  WithEvents<Events.Item & Events.Parent>,
]) {
  constructor(
    args: Omit<ConstructorParameters<typeof Item>[0], "type"> &
      Exclude<ConstructorParameters<typeof RawParent>[0], undefined> &
      Omit<ConstructorParameters<(typeof Icon)["FolderLike"]>[0], "type">,
  ) {
    const tuple = argify("folder", args);
    super(tuple, tuple, tuple);
  }

  async add<T extends File | Folder>(item: Folder | File): Promise<T>;
  async add<T extends ItemType>(type: T): Promise<Models[T]>;
  async add(typeOrItem: ItemType | Folder | File) {
    this.addNew(typeOrItem, this);
  }
}
