<script lang="ts">
  import type { Field } from "../Field.svelte";
  import { arrayItemAtIndex } from "../naming.js";
  import { component } from ".";
  import { attributes, title, tooltip } from "./common.js";

  let {
    node,
    model,
    renderChild,
    pushRenderer,
    spliceRenderer,
    insertRenderer,
  }: Field.Props<"array"> = $props();

  const items = $derived(model.get(node)!);
  const addable = $derived(
    model.editable && (node.maxItems == null || items!.length < node.maxItems),
  );
</script>

<fieldset>
  <legend title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </legend>

  {#each items as _, index (index)}
    {@const child = arrayItemAtIndex(node, index)}

    {#if addable}
      {#if insertRenderer}
        {@render insertRenderer({ node, model, index })}
      {:else}
        {@const Component = component.forArray["insert"]}
        <Component {node} {model} {index} />
      {/if}
    {/if}

    {@render renderChild(child, "array", index)}

    {#if model.editable}
      {#if spliceRenderer}
        {@render spliceRenderer({ node, model, index })}
      {:else}
        {@const Component = component.forArray["splice"]}
        <Component {node} {model} {index} />
      {/if}
    {/if}
  {/each}

  {#if addable}
    {@const index = items!.length}
    {#if pushRenderer}
      {@render pushRenderer({ node, model, index })}
    {:else}
      {@const Component = component.forArray["push"]}
      <Component {node} {model} {index} />
    {/if}
  {/if}
</fieldset>
