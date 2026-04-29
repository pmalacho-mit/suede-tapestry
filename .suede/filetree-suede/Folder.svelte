<script lang="ts" module>
  import Row from "./shared/Row.svelte";

  export { folderOpen, folderClosed, addFolderIcon, addFolder };

  const expandOnMount = new WeakSet<Folder.Model>();
  const lastHeightByFolder = new WeakMap<Folder.Model, number>();

  export const trigger = (
    expanded: boolean,
    folder: Folder.Model,
    depth: "local" | "recursive",
  ) => {
    if (folder.parent.type === "folder")
      expandOnMount[expanded ? "add" : "delete"](folder);
    if (depth === "recursive")
      for (const child of folder.children)
        if (child.is("folder"))
          trigger(expanded, child as Folder.Model, "recursive");
  };

  const duration = (_: HTMLElement, duration: number) => ({ duration });

  type HeightOnDestroy = (height: number) => void;
</script>

<script lang="ts">
  import { File, type Folder } from "./";
  import Self from "./Folder.svelte";
  import Name from "./shared/Name.svelte";
  import { onDestroy, onMount, tick, untrack } from "svelte";
  import { renderer } from "../svelte-snippet-renderer-suede/SnippetRenderer.svelte";
  import { easeInOut, px } from "./utils/";
  import type { WithClassify } from "./utils/classes";

  let {
    model,
    depth = 0,
    heightOnDestroy,
    transitionTimeMs = 300,
    classify,
  }: {
    model: Folder.Model;
    depth?: number;
    heightOnDestroy?: HeightOnDestroy;
    transitionTimeMs?: number;
  } & WithClassify = $props();

  let name = $state<Name>();
  let expanded = $state(false);
  let focused = $state(false);

  $effect(() => model.sort());
  $effect(() => model.propagate(model));

  $effect(() =>
    model.subscribe({
      "request rename": (config) => {
        if (model.readonly) return;
        const cursor = config?.cursor ?? model.name.length;
        name!.rename(cursor, config?.force);
      },
      "request focus": () => (focused = true),
      "request open": (depth) => trigger((expanded = true), model, depth),
      "request close": (depth) => trigger((expanded = false), model, depth),
      "request expansion toggle": (depth) =>
        trigger((expanded = !expanded), model, depth),
    }),
  );

  let clientHeight = $state(0);
  let childContainer = $state<HTMLElement>();
  let childFolderHeights = 0;
  const onChildDestroy: HeightOnDestroy = (height) =>
    (childFolderHeights += height);

  $effect(() => {
    if (childContainer) childContainer.style.opacity = "1";
  });

  const createSlideAnimation = () => {
    let lastAnimationTrigger = 0;
    let animationVersion = Number.MIN_SAFE_INTEGER;

    const height = (target: HTMLElement) => {
      const { height } = target.getBoundingClientRect();
      const now = performance.now();

      const delta = now - lastAnimationTrigger;
      const elapsedRatio = Math.min(delta / transitionTimeMs, 1);
      const t = easeInOut.t(elapsedRatio);

      lastAnimationTrigger = now;
      return expanded ? height * (1 - t) : height * t;
    };

    const trySetFirstChildOpacity = ({ children: [child] }: HTMLElement) => {
      if (child) (child as HTMLElement).style.opacity = expanded ? "1" : "0";
    };

    return () => {
      if (!childContainer) return;

      if (transitionTimeMs === 0) {
        const { style } = childContainer;
        style.transition = "none";
        style.maxHeight = expanded ? "none" : "0px";
        trySetFirstChildOpacity(childContainer);
        return;
      }

      const from = px(height(childContainer));
      const to = px(
        expanded
          ? untrack(() => clientHeight) + childFolderHeights
          : (childFolderHeights = 0),
      );

      if (from === to) return;

      const { style } = childContainer;

      untrack(() =>
        expanded ? model.fire("opening", model) : model.fire("closing", model),
      );

      style.transition = "none";
      style.maxHeight = from;
      style.overflow = "hidden";
      trySetFirstChildOpacity(childContainer);

      requestAnimationFrame(() => {
        style.transition = `max-height ${transitionTimeMs}ms ${easeInOut.id}`;
        style.maxHeight = to;
      });

      const version = ++animationVersion;

      const expanding = expanded;

      const unset = () => {
        if (version === animationVersion) {
          if (expanding) style.maxHeight = "none";
          expanding ? model.fire("opened", model) : model.fire("closed", model);
          style.overflow = "visible";
        }
        childContainer!.removeEventListener("transitionend", unset);
      };

      childContainer.addEventListener("transitionend", unset);
    };
  };

  $effect(createSlideAnimation());

  onMount(() => {
    if (model.parent.type !== "folder") return;
    const lastHeight = lastHeightByFolder.get(model) ?? 0;
    lastHeightByFolder.delete(model);
    if (!expandOnMount.has(model)) return;
    childFolderHeights = lastHeight;
    tick().then(() => (expanded = true));
  });

  onDestroy(() => {
    heightOnDestroy?.(clientHeight);
    lastHeightByFolder.set(model, clientHeight);
  });
</script>

<Row {model} {depth} {classify} bind:name bind:focused>
  {#snippet icon()}
    {#if expanded}
      {#if model.icon.open.current !== undefined}
        {@render renderer(model.icon.open)}
      {:else}
        {@render folderOpen()}
      {/if}
    {:else if model.icon.closed.current !== undefined}
      {@render renderer(model.icon.closed)}
    {:else}
      {@render folderClosed()}
    {/if}
  {/snippet}
  <div bind:this={childContainer} style:will-change="max-height">
    {#if expanded}
      <ul
        bind:clientHeight
        out:duration={transitionTimeMs + 100}
        style:opacity="0"
        style:transition="opacity {transitionTimeMs}ms ease-in-out"
        style:list-style="none"
        style:padding="0"
        style:margin="0"
      >
        {#each model.children as child}
          <li style:padding="0">
            {#if child.is("folder")}
              <Self
                model={child}
                depth={depth + 1}
                heightOnDestroy={onChildDestroy}
                {classify}
              />
            {:else}
              <File.Component model={child} depth={depth + 1} {classify} />
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Row>

{#snippet folderOpen()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
    />
  </svg>
{/snippet}

{#snippet folderClosed()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    />
  </svg>
{/snippet}

{#snippet addFolderIcon()}
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L12 7H19C20.1046 7 21 7.89543 21 9V11"
      stroke="var(--color, currentColor)"
      stroke-width="var(--stroke-width, 1.4)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M18 14V17M18 20V17M18 17H15M18 17H21"
      stroke="var(--color, currentColor)"
      stroke-width="var(--stroke-width, 1.4)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

{#snippet addFolder()}
  {@render addFolderIcon()} Add Folder
{/snippet}
