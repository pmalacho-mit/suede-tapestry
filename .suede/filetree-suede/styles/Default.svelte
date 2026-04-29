<script lang="ts" module>
  import Root, { type Props as RootProps } from "../Root.svelte";

  type CssVariables = {
    "--background-color": string;
    "--font-size": string;
    "--color": string;
    "--folder-track-color": string;
    "--folder-track-width": string;
    "--folder-track-style": string;
    "--row-icon-size": string;
    "--row-icon-stroke-width": string;
    "--row-focused-background-color": string;
    "--row-hover-background-color": string;
    "--row-item-gap": string;
    "--row-item-padding-y": string;
    "--row-item-padding-x": string;
    "--name-input-outline-color": string;
    "--name-text-border-radius": string;
    "--name-text-outline-width": string;
  };

  /**
   * Props for DefaultStyle component
   *
   * NOTE: 'classify' prop is omitted because DefaultStyle is implemented assuming no class-name customization.
   */
  export type Props = Omit<RootProps, "classify"> & Partial<CssVariables>;
</script>

<script lang="ts">
  let { model, ...vars }: Props = $props();
</script>

<div
  style:height="100%"
  style:width="100%"
  style={Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ")}
  style:--default-color="black"
  style:--default-background-color="white"
  style:--default-font-size="1rem"
  style:--default-row-item-padding="0.25rem"
  style:--default-row-item-gap="0.25rem"
  style:--default-row-hover-background-color="rgb(240, 240, 240)"
  style:--default-row-focused-background-color="skyblue"
  style:--default-name-input-outline-color="skyblue"
  style:--default-name-text-border-radius="0.25rem"
  style:--default-name-text-outline-width="2px"
  style:--default-folder-track-color="black"
  style:--default-folder-track-width="1px"
  style:--default-folder-track-style="solid"
>
  <Root {model} />
</div>

<style>
  div :global(.root-container) {
    color: var(--color, var(--default-color));
    background-color: var(--background-color, var(--default-background-color));
    font-size: var(--font-size, var(--default-font-size));
  }

  div :global(.root-container *) {
    color: var(--color, var(--default-color));
  }

  div :global(.name-highlighted),
  div :global(.name-input:focus) {
    outline-color: var(
      --name-input-outline-color,
      var(--default-name-input-outline-color)
    );
  }

  div :global(.row-entry-elements) {
    padding: var(--row-item-padding-y, var(--default-row-item-padding))
      var(--row-item-padding-x, var(--default-row-item-padding));
    gap: var(--row-item-gap, var(--default-row-item-gap));
  }

  div :global(.name-text) {
    color: var(--color, var(--default-color));
    border-radius: var(
      --name-text-border-radius,
      var(--default-name-text-border-radius)
    );
    outline-width: var(
      --name-text-outline-width,
      var(--default-name-text-outline-width)
    );
  }

  div :global(.row-indented),
  div :global(.row-inner-track) {
    border-left-style: var(
      --folder-track-style,
      var(--default-folder-track-style)
    );
    border-left-width: var(
      --folder-track-width,
      var(--default-folder-track-width)
    );
    border-left-color: var(
      --folder-track-color,
      var(--default-folder-track-color)
    );
  }

  div :global(.row-entry.row-focused) {
    background-color: var(
      --row-focused-background-color,
      var(--default-row-focused-background-color)
    ) !important;
  }

  div :global(.row-entry:hover),
  div :global(.row-entry.row-entry-overflow-hover),
  div :global(.row-entry:hover .name-input),
  div :global(.row-entry.row-entry-overflow-hover .name-input) {
    background-color: var(
      --row-hover-background-color,
      var(--default-row-hover-background-color)
    );
  }

  div :global(.name-input) {
    background-color: var(--background-color, white);
  }

  div :global(.row-children:hover) + :global(.row-name),
  div :global(.row-children.row-name-overflow-hover) + :global(.row-name) {
    background-color: blue !important;
  }

  /** Style context menu container */
  div :global(.row-context-menu-container) {
    border-top: 1px solid lightgray;
    border-bottom: 1px solid lightgray;
    border-left: 0.5px solid lightgray;
    border-right: 0.5px solid lightgray;
    border-radius: 0.25rem;
    background-color: var(--background-color, white);
    box-shadow:
      0 5px 10px -3px rgb(0 0 0 / 0.3),
      0 4px 6px -4px rgb(0 0 0 / 0.3),
      -4px 0 6px -2px rgb(0 0 0 / 0.2);
  }

  div :global(.row-context-menu-display) {
    gap: 0.25rem;
    padding: 0.25rem;
    margin: 0.25rem;
  }

  div :global(.context-menu-item) {
    border-radius: 0.125rem;
    background: transparent;
    gap: 0.25rem;
    padding: 0.25rem 0.25rem;
  }

  div :global(.context-menu-item:hover) {
    background-color: rgb(240, 240, 240);
  }

  div :global(.row-icon) {
    margin-left: 0.125rem;
    --size: var(--row-icon-size, 1.4rem);
    --stroke-width: var(--row-icon-stroke-width, 0.125rem);
  }

  div :global(svg) {
    will-change: transform, opacity;
    backface-visibility: hidden;
    width: var(--size, 1.5rem);
    height: var(--size, 1.5rem);
  }

  :global(.name-overflow-tooltip) {
    z-index: 2;
  }
</style>
