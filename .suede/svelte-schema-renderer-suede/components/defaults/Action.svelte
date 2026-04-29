<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import type { Field } from "../Field.svelte";
  import type { Snippet } from "svelte";

  let {
    node,
    action,
    detail,
    onclick,
    children,
  }: Field.Props & {
    action: string;
    detail?: string;
    onclick: MouseEventHandler<HTMLButtonElement>;
    children: Snippet;
  } = $props();
</script>

<button
  data-action={action}
  title={`${action} ${node.title ?? node.path}` + (detail ? ` ${detail}` : "")}
  {onclick}
>
  {@render children()}
</button>
