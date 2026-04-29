import type { FromKind, Kind, RenderNode } from "./types.js";
import type { RecursivePartial } from "./utils";

export type Mode = "edit" | "stream" | "view";
export type Data = Record<string, unknown>;

type State<TMode extends Mode, TData> = TMode extends "stream"
  ? RecursivePartial<TData>
  : TData;

export type SchemaModelOptions = {
  abbreviatePaths?: boolean;
};

type EventToHandle = Event & {
  currentTarget: (EventTarget & HTMLInputElement) | HTMLSelectElement;
};
type EventHandler = (event: EventToHandle) => void;

export class SchemaModel<TMode extends Mode = Mode, TData extends Data = Data> {
  data = $state({} as State<TMode, TData>);
  container = $state<HTMLDivElement>();

  readonly mode: TMode;
  readonly abbreviatePaths: boolean;

  get editable() {
    return this.mode === "edit";
  }

  constructor(
    mode: TMode,
    initial?: State<TMode, TData>,
    options?: SchemaModelOptions,
  ) {
    this.mode = mode;
    this.abbreviatePaths = options?.abbreviatePaths ?? true;
    if (initial) this.data = structuredClone(initial);
  }

  /**
   * Read a value at a dotted path
   */
  get<K extends Kind>({
    path,
  }: Pick<RenderNode, "path"> & { kind?: K }): FromKind<K> | undefined {
    if (path === "") return this.data as unknown as FromKind<K>;
    return path.split(".").reduce<any>((obj, key) => obj?.[key], this.data);
  }

  set<K extends Kind>(
    { path }: Pick<RenderNode, "path"> & { kind?: K },
    value: FromKind<K>,
  ): void {
    this.#set(path, value);
  }

  #set(path: string, value: unknown) {
    if (path === "") return (this.data = value as State<TMode, TData>);
    const keys = path.split(".");
    let target: any = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (target[k] === undefined)
        target[k] = isNaN(Number(keys[i + 1])) ? {} : [];
      target = target[k];
    }
    target[keys[keys.length - 1]] = value;
  }

  remove({ path }: Pick<RenderNode, "path">): void {
    const keys = path.split(".");
    let obj: any = this.data;
    for (const k of keys.slice(0, -1)) {
      if (obj?.[k] === undefined) return;
      obj = obj[k];
    }
    delete obj[keys[keys.length - 1]];
  }

  applyPartial(partial: Record<string, unknown>, basePath = ""): void {
    for (const [key, value] of Object.entries(partial)) {
      const path = basePath ? `${basePath}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value))
        this.applyPartial(value as Record<string, unknown>, path);
      else this.#set(path, value);
    }
  }

  /**
   * Returns an event handler that reads `event.currentTarget.value` and
   * writes it to the model at `node`'s path.
   *
   * Use the single-argument overload for string fields — no converter needed:
   * ```svelte
   * <input oninput={model.on(node)} />
   * ```
   *
   * Pass a converter for non-string fields so the raw string value is cast
   * to the correct type before writing:
   * ```svelte
   * <input type="number" oninput={model.on(node, Number)} />
   * ```
   */
  on<K extends Kind>(
    node: Pick<RenderNode, "path"> & { kind?: "string" },
  ): EventHandler;
  on<K extends Kind>(
    node: Pick<RenderNode, "path"> & { kind?: K },
    converter: (value: string) => FromKind<K>,
  ): EventHandler;
  on<K extends Kind>(
    node: Pick<RenderNode, "path"> & { kind?: K },
    converter?: (value: string) => FromKind<K>,
  ): EventHandler {
    return ({ currentTarget: { value } }) =>
      this.set(node, converter ? converter(value) : (value as FromKind<K>));
  }

  element({ path }: Pick<RenderNode, "path">) {
    return this.container?.querySelector<HTMLDivElement>(
      `[data-path="${path}"]`,
    );
  }
}
