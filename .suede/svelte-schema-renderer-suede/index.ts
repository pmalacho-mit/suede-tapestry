export { SchemaModel as Model } from "./models.svelte.js";
import type { RenderNode, Kind as TKind } from "./types.js";
export { default as Schema } from "./components/Root.svelte";
export { root } from "./nodes.js";
export * as defaults from "./components/defaults/index.js";

export namespace Schema {
  export type Node = RenderNode;
  export type Kind = TKind;
}
