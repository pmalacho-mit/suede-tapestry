<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { attributes, title, tooltip } from "./common.js";

  let { node, model }: Field.Props<"boolean"> = $props();
</script>

<label>
  <input
    type="checkbox"
    checked={model.get(node) ?? false}
    onchange={({ currentTarget: { checked } }) => model.set(node, checked)}
    disabled={!model.editable}
  />
  <span title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </span>
</label>
