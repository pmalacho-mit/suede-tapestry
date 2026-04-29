<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { attributes, title, tooltip } from "./common.js";
  import PlaceholderOption from "./PlaceholderOption.svelte";

  let { node, model }: Field.Props<"enum"> = $props();

  const onchange = $derived(
    model.on(node, (value) =>
      node.options.find((option) => String(option) === value),
    ),
  );
</script>

<label>
  <span title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </span>
  <select value={model.get(node)} disabled={!model.editable} {onchange}>
    <PlaceholderOption />
    {#each node.options as option}
      <option value={option}>{option}</option>
    {/each}
  </select>
</label>
