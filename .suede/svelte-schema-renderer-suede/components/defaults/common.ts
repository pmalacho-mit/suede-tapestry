import type { Model } from "../..";
import type { Kind, RenderNode, SpecificNode } from "../../types";
import { basename } from "../naming.js";

export const is = {
  const: (node: RenderNode): node is SpecificNode<"string"> =>
    node.kind === "string" && node.const !== undefined,
};

/** Extracts const-valued string children as a key→value map, keyed by field basename. */
export const constDiscriminators = (
  children: SpecificNode<"object">["children"],
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const child of children)
    if (is.const(child)) result[basename(child.path)] = child.const;
  return result;
};

type Defaultable = Exclude<Kind, "oneOf" | "enum" | "unknown">;

export const defaults = {
  string: "",
  number: 0,
  boolean: false,
  get object() {
    return {};
  },
  array: [],
} satisfies Record<Defaultable, unknown>;

export const defaultable = (
  node: RenderNode,
): node is RenderNode & { kind: Defaultable } => node.kind in defaults;

export const valueForNode = (node: RenderNode): unknown => {
  if (node.kind === "array") {
    const itemDefault = valueForNode(node.itemNode);
    return itemDefault !== null ? [itemDefault] : [];
  }
  if (node.kind === "object") return constDiscriminators(node.children);
  if ("default" in node)
    return node.default ?? defaults[node.kind as Defaultable];
  return defaultable(node) ? defaults[node.kind] : null;
};

export const title = (node: RenderNode, model: Model) =>
  node.title ?? (model.abbreviatePaths ? basename(node.path) : node.path);

export const tooltip = (node: RenderNode, model: Model) =>
  !node.title && model.abbreviatePaths ? node.path : undefined;

export const attributes = Object.assign(
  (node: RenderNode) => ({
    "data-kind": node.kind,
    "data-path": node.path,
  }),
  {
    role: (
      detail:
        | "container"
        | "name"
        | "placeholder"
        | "variant-selector"
        | "root-container",
    ) => ({
      "data-role": detail,
    }),
  },
);
