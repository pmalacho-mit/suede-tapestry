<script lang="ts" module>
  import {
    classified,
    type Classify,
    type WithClassify,
  } from "../utils/classes";

  export const Classes = (classify?: Classify) =>
    classified(classify, {
      item: "context-menu-item",
    });
</script>

<script lang="ts">
  import type { Items } from "../context";
  type Item = Items[number];
  let {
    item,
    onclick,
    classify,
  }: { item: Item; onclick?: () => void } & WithClassify = $props();

  const classes = $derived(Classes(classify));
</script>

<button
  class={classes.item}
  style:display="flex"
  style:flex-direction="row"
  style:white-space="nowrap"
  style:align-items="center"
  style:border="none"
  style:cursor="pointer"
  style:width="100%"
  onclick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onclick?.();
    item.onclick(event);
  }}
>
  {@render item.content()}
</button>
