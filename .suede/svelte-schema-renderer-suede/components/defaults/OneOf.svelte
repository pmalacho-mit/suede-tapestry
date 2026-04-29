<script lang="ts" module>
  import type { RenderNode, SpecificNode } from "../../types.js";
  import type { SchemaModel } from "../../models.svelte.js";
  import type { RenderChild } from "../Field.svelte";
  import { constDiscriminators, is, valueForNode } from "./common.js";

  export const match = {
    /**
     * Exact structural match: checks whether the current value is described
     * by the given variant node based on type and const discriminators.
     * Does not check required field presence — use `fuzzyMatch` as a fallback
     * for object variants that lack const discriminators.
     */
    exact: (value: unknown, variant: RenderNode): boolean => {
      switch (variant.kind) {
        case "string":
          if (typeof value !== "string") return false;
          if (variant.options && !variant.options.includes(value)) return false;
          return true;
        case "number":
          return typeof value === "number";
        case "boolean":
          return typeof value === "boolean";
        case "object":
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          )
            return false;
          for (const [key, val] of Object.entries(
            constDiscriminators(variant.children),
          ))
            if ((value as Record<string, unknown>)[key] !== val) return false;
          return true;
        case "array":
          return Array.isArray(value);
        case "enum":
          return (variant as SpecificNode<"enum">).options.includes(value);
        default:
          return false;
      }
    },
    /**
     * Fuzzy fallback for object variants without const discriminators.
     * Scores each variant by how many of its required fields are present
     * in the value, and returns the index of the best match.
     * Returns -1 if no variant scores above zero.
     */
    fuzzy: (value: unknown, variants: RenderNode[]): number => {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        return -1;
      const casted = value as Record<string, unknown>;
      let bestIndex = -1;
      let bestScore = 0;
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (variant.kind !== "object") continue;
        let score = 0;
        for (const key of variant.required) if (key in casted) score++;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      return bestIndex;
    },

    find: (value: unknown, { variants }: SpecificNode<"oneOf">) => {
      const exact = variants.findIndex(match.exact.bind(null, value));
      return exact >= 0 ? exact : match.fuzzy(value, variants);
    },
  };

  const label = (variant: RenderNode, index: number): string => {
    if (variant.title) return variant.title;
    if (variant.kind === "object")
      for (const child of variant.children)
        if (is.const(child)) return String(child.const);
    return `Option ${index + 1}`;
  };

  export type Props = {
    node: SpecificNode<"oneOf">;
    model: SchemaModel;
    renderChild: RenderChild;
  };
</script>

<script lang="ts">
  import { attributes, tooltip, title } from "./common.js";
  import PlaceholderOption from "./PlaceholderOption.svelte";

  let { node, model, renderChild }: Props = $props();

  const value = $derived.by(() => match.find(model.get(node), node));
  const set = async (index: string | number) =>
    model.set(node, await valueForNode(node.variants[Number(index)]));
</script>

<fieldset>
  <legend title={tooltip(node, model)} {...attributes.role("name")}>
    {title(node, model)}
  </legend>

  {#if model.editable}
    <label {...attributes.role("variant-selector")}>
      <span {...attributes.role("name")}>Type</span>
      <select {value} onchange={({ currentTarget: { value } }) => set(value)}>
        <PlaceholderOption />
        {#each node.variants as variant, i}
          <option value={i}>{label(variant, i)}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#if value >= 0}
    {@render renderChild(node.variants[value], "oneOf")}
  {/if}
</fieldset>
