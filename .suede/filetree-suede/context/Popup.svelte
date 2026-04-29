<script lang="ts" module>
  import { onMount, type Snippet } from "svelte";
  import type { MouseEventHandler } from "svelte/elements";

  export type Props = {
    items: {
      content: Snippet;
      onclick: MouseEventHandler<HTMLButtonElement>;
    }[];
    close: () => void;
    style?: string;
  };
</script>

<script lang="ts">
  let { items, close, style = "" }: Props = $props();

  let visible = $state(false);

  let element: HTMLElement;

  onMount(() => {
    const { top, height } = element.getBoundingClientRect();
    const { innerHeight } = window;
    if (top + height > innerHeight)
      element.style.top = `${innerHeight - top - height}px`;
    visible = true;
  });
</script>

<svelte:window onclick={close} />

<div
  {style}
  style:position="absolute"
  style:overflow="visible"
  style:visibility="visible"
  style:clear="both"
  style:z-index="10000"
  style:top="100%"
  style:left="0"
  style:box-shadow="0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 /
  0.1)"
  style:border-radius="0.5rem"
  style:background-color="rgb(38 38 38)"
  style:border="1px solid rgb(64 64 64)"
  style:transition-property="opacity"
  style:transition-duration="50ms"
  style:opacity={visible ? "1" : "0"}
  role="menu"
  aria-orientation="vertical"
  aria-labelledby="hs-default"
  bind:this={element}
>
  <ul style:padding="0.25rem" style:border-bottom="1px solid rgb(38 38 38)">
    {#each items as { onclick, content }, i}
      <li
        style:white-space="nowrap"
        style:margin-top={i > 0 ? "0.125rem" : "0"}
      >
        <button
          type="button"
          {onclick}
          style:width="100%"
          style:display="flex"
          style:align-items="center"
          style:column-gap="0.75rem"
          style:padding="0.375rem 0.75rem"
          style:border-radius="0.5rem"
          style:font-size="0.875rem"
          style:line-height="1.25rem"
          style:color="rgb(212 212 212)"
          style:background-color="transparent"
          style:border="none"
          style:cursor="pointer"
          onmouseenter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgb(64 64 64)")}
          onmouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
          onfocus={(e) => {
            e.currentTarget.style.outline = "none";
            e.currentTarget.style.backgroundColor = "rgb(64 64 64)";
          }}
          onblur={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {@render content()}
        </button>
      </li>
    {/each}
  </ul>
</div>
