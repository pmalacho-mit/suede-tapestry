import type { JSONSchema7 } from "json-schema";
import type { Context } from "../types.js";
import { isSchema } from "./schema.js";

export const warnings = {
  circularRef: (ref: string) => `Circular $ref detected: ${ref}`,
  unresolvedRef: (ref: string) => `Unresolved $ref: ${ref}`,
};

export const resolve = (schema: JSONSchema7, ctx: Context): JSONSchema7 => {
  if (!schema.$ref) return schema;

  const ref = schema.$ref;

  // Circular reference guard
  if (ctx.refStack.has(ref)) {
    console.warn(warnings.circularRef(ref));
    return { type: "object", title: `(circular: ${ref})` };
  }

  const resolved = lookup(ref, ctx.rootSchema, ctx.externalSchemas);
  if (!resolved) {
    console.warn(warnings.unresolvedRef(ref));
    return { type: "object", title: `(unresolved: ${ref})` };
  }

  // Merge any sibling keywords from the referencing schema
  // (JSON Schema 2019-09+ allows siblings alongside $ref).
  // Deep-merge properties/required so sibling keywords don't overwrite
  // the resolved schema's fields — use the same strategy as mergeSchemas
  // (can't import it here without creating a circular dependency).
  const { $ref, ...siblings } = schema;
  const merged: JSONSchema7 = { ...resolved, ...siblings };
  if (resolved.properties || siblings.properties)
    merged.properties = {
      ...(resolved.properties ?? {}),
      ...(siblings.properties ?? {}),
    };
  if (resolved.required || siblings.required)
    merged.required = [
      ...new Set([...(resolved.required ?? []), ...(siblings.required ?? [])]),
    ];

  ctx.refStack.add(ref);
  const result = resolve(merged, ctx); // refs can chain
  ctx.refStack.delete(ref);

  return result;
};

const lookup = (
  ref: string,
  root: JSONSchema7,
  externalSchemas?: Map<string, JSONSchema7>,
): JSONSchema7 | null => {
  // Plain-name fragment: "#AnchorName" — walk the schema tree for a matching $anchor
  if (ref.startsWith("#") && !ref.startsWith("#/")) {
    const anchor = ref.slice(1);
    return findAnchor(anchor, root);
  }

  // Local JSON pointer refs: "#/definitions/Foo" or "#/$defs/Foo"
  if (ref.startsWith("#/")) {
    const segments = ref
      .slice(2) // strip "#/"
      .split("/")
      .map(decodeJsonPointer);

    let current: any = root;
    for (const seg of segments) {
      if (current == null || typeof current !== "object") return null;
      current = current[seg];
    }

    return isSchema(current) ? current : null;
  }

  // External ref — look up in pre-fetched map
  if (externalSchemas) {
    const hashIdx = ref.indexOf("#");
    const docUrl = hashIdx === -1 ? ref : ref.slice(0, hashIdx);
    const fragment = hashIdx === -1 ? null : ref.slice(hashIdx);

    const externalRoot = externalSchemas.get(docUrl);
    if (externalRoot) {
      if (!fragment) return externalRoot;
      return lookup(fragment, externalRoot, externalSchemas);
    }
  }

  return null;
};

const decodeJsonPointer = (segment: string): string =>
  // JSON Pointer escapes: ~1 = /, ~0 = ~
  segment.replace(/~1/g, "/").replace(/~0/g, "~");

const findAnchor = (anchor: string, node: unknown): JSONSchema7 | null => {
  if (node == null || typeof node !== "object" || Array.isArray(node))
    return null;
  const obj = node as Record<string, unknown>;
  if (obj.$anchor === anchor) return isSchema(obj) ? (obj as JSONSchema7) : null;
  for (const value of Object.values(obj)) {
    const found = findAnchor(anchor, value);
    if (found) return found;
  }
  return null;
};
