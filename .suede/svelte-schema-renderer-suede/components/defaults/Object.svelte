<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { attributes, title, tooltip } from "./common.js";
  let { node, model, renderChild }: Field.Props<"object"> = $props();
</script>

<fieldset>
  <legend title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </legend>
  {#each node.children as child (child.path)}
    {@render renderChild(child, "object")}
  {/each}
</fieldset>
