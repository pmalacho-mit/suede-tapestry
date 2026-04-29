<script lang="ts" module>
  import type { RenderNode, Kind, PathMap, ArrayPathMap } from "../types.js";
  import type { Data, SchemaModel } from "../models.svelte.js";
  import type { Component, Snippet } from "svelte";

  export type RenderChild = Snippet<
    | [node: RenderNode, parent: "object" | "oneOf"]
    | [node: RenderNode, parent: "array" | "tuple", index: number]
  >;

  export namespace Field {
    export type Props<TKind extends Kind = Kind> = {
      node: RenderNode & { kind: TKind };
      model: SchemaModel;
      parent?: "object" | "array" | "oneOf" | "tuple";
      index?: number;
    } & (TKind extends "array"
      ? {
          pushRenderer: Snippet<[ArrayActionProps]> | null;
          spliceRenderer: Snippet<[ArrayActionProps]> | null;
          insertRenderer: Snippet<[ArrayActionProps]> | null;
        }
      : {}) &
      (TKind extends "object" | "array" | "oneOf" | "tuple"
        ? {
            renderChild: RenderChild;
          }
        : {});

    export type RenderActions = "opt_in__" | "opt_out__" | "opted_out__";

    export type RenderKeys = "" | RenderActions;

    type RendererByPath<TData extends Data = Data> = {
      // Path-based: "user__name", "tags___item", etc.
      // Also action-based: "opt_in__user__name", "opt_out__tags___item", etc.
      [Path in keyof PathMap<TData> & string as Path extends ""
        ? never
        : `${RenderKeys}${PathToSnippetName<Path>}`]: Snippet<
        [Field.Props<PathMap<TData>[Path]>]
      >;
    };

    type ActionRenderers = {
      [K in RenderActions]: Snippet<
        [
          {
            node: RenderNode;
            model: SchemaModel;
          },
        ]
      >;
    };

    export type ArrayActions = "push__" | "splice__" | "insert__";

    export type ArrayActionProps = {
      node: RenderNode & { kind: "array" };
      model: SchemaModel;
      index: number;
    };

    type ArrayActionByPath<TData extends Data = Data> = {
      [Path in keyof ArrayPathMap<TData> & string]: Snippet<[ArrayActionProps]>;
    };

    type KindRenderers = {
      [K in Kind]: Snippet<[Field.Props<K>]>;
    };

    export type Renderers<TData extends Data = Data> = Partial<
      KindRenderers &
        RendererByPath<TData> &
        ArrayActionByPath<TData> &
        ActionRenderers
    >;
  }

  export type Props = {
    node: RenderNode;
    model: SchemaModel;
    renderers?: Field.Renderers;
    parent?: "object" | "array" | "oneOf" | "tuple";
    index?: number;
  };
</script>

<script lang="ts">
  import { pathToSnippetName, type PathToSnippetName } from "./naming.js";
  import { component } from "./defaults";
  import Self from "./Field.svelte";
  import { attributes } from "./defaults/common.js";

  let { node, model, renderers, parent, index }: Props = $props();

  const snippetKey = $derived(pathToSnippetName(node.path));
  const value = $derived(model.get(node));
  const resolved = $derived(value !== undefined && value !== null);
  const optedOut = $derived(node.optional && !resolved);
  const canOptOut = $derived(!optedOut && node.optional && model.editable);
  const editableArray = $derived(node.kind === "array" && model.editable);

  const renderer = <T extends Field.RenderKeys | Field.ArrayActions>(
    prefix?: T,
  ) =>
    (renderers?.[(prefix ?? "") + snippetKey] ?? // path specific
      renderers?.[prefix ? prefix : node.kind] ?? // top-level
      null) as Snippet<[Field.Props<any>]> | null;

  const nodeRenderer = $derived(!optedOut ? renderer() : null);
  const optInRenderer = $derived(
    optedOut && model.editable ? renderer("opt_in__") : null,
  );
  const optedOutRenderer = $derived(
    optedOut && !model.editable ? renderer("opted_out__") : null,
  );
  const optOutRenderer = $derived(canOptOut ? renderer("opt_out__") : null);

  const rendererArgs = $derived(
    nodeRenderer || optInRenderer || optedOutRenderer || optOutRenderer
      ? { node, model, renderChild }
      : null,
  );

  const pushRenderer = $derived(editableArray ? renderer("push__") : null);
  const spliceRenderer = $derived(editableArray ? renderer("splice__") : null);
  const insertRenderer = $derived(editableArray ? renderer("insert__") : null);
</script>

{#snippet renderChild(
  childNode: RenderNode,
  parent: "array" | "tuple" | "object" | "oneOf",
  index?: number,
)}
  <Self node={childNode} {model} {renderers} {parent} {index} />
{/snippet}

<div {...attributes(node)} data-index={index}>
  {#if optedOut}
    {#if !model.editable}
      {#if optedOutRenderer}
        {@render optedOutRenderer(rendererArgs!)}
      {/if}
    {:else if optInRenderer}
      {@render optInRenderer(rendererArgs!)}
    {:else}
      {@const Component = component.byAction["opt_in__"]}
      <Component {node} {model} />
    {/if}
  {:else}
    {#if canOptOut}
      {#if optOutRenderer}
        {@render optOutRenderer(rendererArgs!)}
      {:else}
        {@const Component = component.byAction["opt_out__"]}
        <Component {node} {model} />
      {/if}
    {/if}

    {#if nodeRenderer}
      {@render nodeRenderer(rendererArgs!)}
    {:else}
      {@const Component = component.byKind[node.kind] as Component<
        Field.Props<any>
      >}
      <Component
        {node}
        {model}
        {parent}
        {index}
        {renderChild}
        {pushRenderer}
        {spliceRenderer}
        {insertRenderer}
      />
    {/if}
  {/if}
</div>
