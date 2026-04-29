<script lang="ts" module>
  import { File, Folder } from "..";
  import { untrack, type Snippet } from "svelte";
  import Name from "./Name.svelte";
  import {
    classified,
    type Classify,
    type WithClassify,
  } from "../utils/classes";
  import type { Items } from "../context";
  import { Classes as RootClasses } from "../Root.svelte";

  type Props = {
    model: File.Model | Folder.Model;
    depth: number;
    indent?: (depth: number) => string;
    icon: Snippet;
    children?: Snippet;
    focused?: boolean;
    name?: Name;
    transitionTimeMsPerContextItem?: number;
  } & WithClassify;

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      container: "row-container",
      entry: "row-entry",
      elements: "row-entry-elements",
      focused: "row-focused",
      icon: "row-icon",
      children: "row-children",
      indented: "row-indented",
      track: "row-inner-track",
      depth: <T extends number>(n: T) => `row-depth-${n}` as const,
      contextContainer: "row-context-menu-container",
      contextDisplay: "row-context-menu-dsiplay",
      contextIsVisible: "row-context-menu-visible",
    });

  class Elements {
    container = $state<HTMLElement>();
    entry = $state<HTMLElement>();
    indented = $state<HTMLElement>();
    children = $state<HTMLElement>();
    context = $state<HTMLElement>();
    contextHeight = $state(0);
  }

  class ContextMenu {
    items = $state<Items>();

    anchor: { top: number } | { bottom: number } = { top: 0 };
    left = 0;
    minWidth = 0;

    show(args: Pick<ContextMenu, "items" | "anchor" | "left" | "minWidth">) {
      this.anchor = args.anchor;
      this.left = args.left;
      this.minWidth = args.minWidth;
      this.items = args.items;
    }

    hide() {
      this.items = undefined;
    }
  }

  const defaultIndent: Required<Props>["indent"] = (depth) =>
    `${depth * 0.5}rem`;

  const inFocus = new WeakSet<File.Model | Folder.Model>();
</script>

<script lang="ts">
  import { getContextMenuItems, type Events } from "../models.svelte";
  import { easeInOut, px } from "../utils";
  import ContextMenuItem from "./ContextMenuItem.svelte";
  import { trySetFirstChildOpacity } from "../utils/transitions";

  let {
    model,
    depth,
    icon,
    children,
    focused = $bindable(),
    name = $bindable(),
    indent = defaultIndent,
    classify,
    transitionTimeMsPerContextItem = 75,
  }: Props = $props();

  $effect(() => {
    focused = inFocus.has(model);
  });

  const classes = $derived(Classes(classify));
  const elements = new Elements();
  const context = new ContextMenu();

  const exitContext = () => {
    name?.highlight(false);
    context.hide();
  };

  const showingContext = $derived((context.items?.length ?? 0) > 0);

  const onclick = () => (model as Events.WithItemEvents).fire("clicked", model);
  const oncontextmenu = (event: MouseEvent) => {
    const items = getContextMenuItems(model);
    if (!items || items.length === 0) return;
    event.preventDefault();
    const entry = elements.entry!.getBoundingClientRect();
    const indented = elements.indented!.getBoundingClientRect();
    name?.highlight(true);
    const root = elements
      .entry!.closest(`.${RootClasses(classify).container}`)!
      .getBoundingClientRect();
    const entryMidPointY = entry.y + entry.height / 2 - root.y;
    const showAbove = entryMidPointY > root.height / 2;
    const anchor = showAbove
      ? { bottom: indented.height }
      : { top: indented.height };

    context.show({
      items,
      anchor,
      left: indented.left - entry.left,
      minWidth: indented.right - indented.left,
    });
  };

  $effect(() =>
    (model as Events.WithItemEvents).subscribe({
      "request focus toggle": () => {
        focused = !focused;
        inFocus[focused ? "add" : "delete"](model);
      },
    })
  );

  $effect(() => {
    const { context: _context } = elements;
    if (!_context) return;
    const { style } = _context;

    const transitionTimeMs =
      untrack(() => context.items?.length ?? 0) *
      transitionTimeMsPerContextItem;

    style.transition = "none";
    style.overflow = "hidden";

    requestAnimationFrame(() => {
      style.transition = `max-height ${transitionTimeMs}ms ${easeInOut.id}`;
      style.maxHeight = px(untrack(() => elements.contextHeight));
      trySetFirstChildOpacity(_context, true);
    });

    const unset = () => {
      style.maxHeight = "none";
      style.overflow = "visible";
      _context.removeEventListener("transitionend", unset);
    };

    _context.addEventListener("transitionend", unset);
  });
</script>

<svelte:window
  onclick={() => {
    exitContext();
  }}
  oncontextmenu={({ target }) => {
    if (target instanceof HTMLElement && elements.entry?.contains(target))
      return;
    exitContext();
  }}
/>

<div
  class={showingContext
    ? classes("container", "contextIsVisible")
    : classes.container}
  style:width="100%"
  style:display="flex"
  style:flex-direction="column"
  style:--depth={depth}
>
  {#if children}
    <div
      bind:this={elements.children}
      class={`${classes.children} ${classes.depth(depth)}`}
      style:position="relative"
      style:height="fit-content"
      style:width="100%"
      style:overflow-x="visible"
      style:padding="0"
      style:margin="0"
      style:order="2"
    >
      {@render psuedoBorder(indent(depth + 1))}
      {@render children()}
    </div>
  {/if}
  <button
    bind:this={elements.entry}
    {onclick}
    {oncontextmenu}
    class={focused ? classes("focused", "entry") : classes("entry")}
    style:order="1"
    style:position="relative"
    style:width="100%"
    style:margin="0"
    style:padding="0"
    style:border="none"
    style:font-size="inherit"
  >
    {#if context.items}
      {@render contextMenu()}
    {/if}
    <span
      bind:this={elements.indented}
      class={classes.elements}
      class:indented={depth > 0}
      style:position="relative"
      style:display="flex"
      style:background-color="transparent"
      style:flex-direction="row"
      style:align-items="center"
      style:margin="0"
      style:margin-left={indent(depth)}
      style:outline="1px solid transparent"
    >
      <span
        class={classes.icon}
        style:display="flex"
        style:align-items="center"
        style:flex-shrink="0"
        style:height="100%"
      >
        {@render icon()}
      </span>
      <Name bind:this={name} {model} {classify} />
    </span>
  </button>
</div>

{#snippet psuedoBorder(left: string)}
  <div
    style:left
    class={classes.track}
    style:padding="0"
    style:margin="0"
    style:position="absolute"
    style:height="100%"
    style:z-index="2"
  ></div>
{/snippet}

{#snippet contextMenu()}
  {@const transitionMs =
    (context.items?.length ?? 0) * transitionTimeMsPerContextItem}
  <div
    bind:this={elements.context}
    style={"top" in context.anchor
      ? `top: ${px(context.anchor.top)}`
      : `bottom: ${px(context.anchor.bottom)}`}
    class={classes.contextContainer}
    style:position="absolute"
    style:left={px(context.left)}
    style:min-width={px(context.minWidth)}
    style:will-change="max-height"
    style:overflow-y="scroll"
    style:max-height="0"
    style:z-index="1000"
    style:padding="0"
    style:margin="0"
  >
    <div
      bind:clientHeight={elements.contextHeight}
      class={classes.contextDisplay}
      style:display="flex"
      style:flex-direction="column"
      style:opacity="0"
      style:transition="opacity {transitionMs}ms ease-in-out"
      style:width="100%"
      style:transform-origin="top center"
    >
      {#each context.items as item}
        <ContextMenuItem {item} onclick={exitContext} />
      {/each}
    </div>
  </div>
{/snippet}

<style>
  /** Assumption is only a single button exists in this component,
   * so styles can be applied directly to button element. 
   */

  button {
    /* Define as css (not inline) so "!important" isn't needed to override */
    background-color: inherit;
  }

  button:hover {
    overflow-x: visible !important;
    min-width: 100% !important;
    width: fit-content !important;
  }
</style>
