<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { attributes, title, tooltip } from "./common.js";

  let { node, model, renderChild }: Field.Props<"tuple"> = $props();
</script>

<fieldset>
  <legend title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </legend>

  {#each node.itemNodes as itemNode, index (index)}
    {@render renderChild(itemNode, "tuple", index)}
  {/each}
</fieldset>
