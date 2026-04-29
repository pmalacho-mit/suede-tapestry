<script lang="ts" module>
  import type { SpecificNode } from "../../types.js";

  const formats = {
    email: "email",
    uri: "url",
    "date-time": "datetime-local",
    date: "date",
    default: "text",
  } as const;

  const format = ({ format }: SpecificNode<"string">) =>
    format && format in formats
      ? formats[format as keyof typeof formats]
      : formats.default;
</script>

<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { tooltip, title, attributes } from "./common.js";
  import PlaceholderOption from "./PlaceholderOption.svelte";

  let { node, model }: Field.Props<"string"> = $props();

  const value = $derived(node.const ? String(node.const) : model.get(node));
  const type = $derived(format(node));
  const disabled = $derived(!model.editable || node.const !== undefined);
</script>

<label>
  <span title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </span>

  {#if node.options}
    <select {value} {disabled} onchange={model.on(node)}>
      <PlaceholderOption />
      {#each node.options as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  {:else}
    <input {value} {type} {disabled} oninput={model.on(node)} />
  {/if}
</label>
