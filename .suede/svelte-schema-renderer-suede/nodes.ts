import type { JSONSchema7 } from "json-schema";
import type { Context, RenderNode } from "./types";
import { valid } from "./utils/index.js";
import { merge, mergeSchemas } from "./utils/merge.js";
import { isSchema, infer } from "./utils/schema.js";
import { resolve } from "./utils/refs.js";

export const root = async (
  schema: JSONSchema7,
  path: string = "",
): Promise<RenderNode> => {
  const externalSchemas = new Map<string, JSONSchema7>();
  await prefetchExternalRefs(schema, externalSchemas);
  return node(schema, path, {
    rootSchema: schema,
    refStack: new Set(),
    externalSchemas,
  });
};

const collectExternalRefs = (schema: unknown, refs: Set<string>): void => {
  if (Array.isArray(schema)) {
    schema.forEach((item) => collectExternalRefs(item, refs));
    return;
  }
  if (!schema || typeof schema !== "object") return;
  const obj = schema as Record<string, unknown>;
  if (typeof obj.$ref === "string" && !obj.$ref.startsWith("#")) {
    const hashIdx = obj.$ref.indexOf("#");
    const docUrl = hashIdx === -1 ? obj.$ref : obj.$ref.slice(0, hashIdx);
    if (docUrl) refs.add(docUrl);
  }
  for (const value of Object.values(obj)) collectExternalRefs(value, refs);
};

const prefetchExternalRefs = async (
  schema: unknown,
  externalSchemas: Map<string, JSONSchema7>,
  fetching: Set<string> = new Set(),
): Promise<void> => {
  const refs = new Set<string>();
  collectExternalRefs(schema, refs);

  await Promise.all(
    Array.from(refs)
      .filter((ref) => !externalSchemas.has(ref) && !fetching.has(ref))
      .map(async (ref) => {
        fetching.add(ref);
        try {
          const response = await fetch(ref);
          if (!response.ok) return;
          const fetched = (await response.json()) as JSONSchema7;
          externalSchemas.set(ref, fetched);
          // Recursively pre-fetch any refs found in the fetched schema
          await prefetchExternalRefs(fetched, externalSchemas, fetching);
        } catch {
          // Fetch failed; ref will remain unresolved and fall back to the
          // existing "unresolved $ref" warning path
        }
      }),
  );
};

const node = (raw: JSONSchema7, path: string, ctx: Context): RenderNode => {
  const schema = merge(resolve(raw, ctx), ctx);
  const { oneOf, anyOf, title, description, enum: options } = schema;

  // If we still have oneOf/anyOf that couldn't be merged,
  // produce a variant node (discriminated union in the UI)
  if (oneOf || anyOf) return variant(schema, path, ctx);

  const kind = infer(schema);

  // Catch *untyped* enums as a generic enum node.
  if (options && !kind)
    return { kind: "enum", path, title, description, options };

  switch (kind) {
    case "string":
      if (!valid.options("string", options))
        throw new Error(
          `Invalid enum options for ${path}: expected array of strings.`,
        );
      if (!valid.default("string", schema.default))
        throw new Error(`Invalid default value for ${path}: expected string.`);
      return {
        kind,
        path,
        title,
        description,
        options,
        format: schema.format,
        default: schema.default,
        const: schema.const as string | number | boolean | undefined,
      };
    case "number":
    case "integer":
      const min = schema.minimum ?? schema.exclusiveMinimum;
      const max = schema.maximum ?? schema.exclusiveMaximum;
      if (!valid.options("number", options))
        throw new Error(
          `Invalid enum options for ${path}: expected array of numbers.`,
        );
      if (!valid.default("number", schema.default))
        throw new Error(`Invalid default value for ${path}: expected number.`);
      return {
        kind: "number",
        min,
        max,
        path,
        title,
        description,
        options,
        default: schema.default,
      };

    case "boolean":
      if (!valid.options("boolean", options))
        throw new Error(
          `Invalid enum options for ${path}: expected array of booleans.`,
        );
      if (!valid.default("boolean", schema.default))
        throw new Error(`Invalid default value for ${path}: expected boolean.`);
      return { kind, path, title, description, default: schema.default };
    case "object":
      return object(schema, path, ctx);
    case "array":
      return array(schema, path, ctx);
    default:
      return { kind: "unknown", path, schema };
  }
};

const variant = (schema: JSONSchema7, path: string, ctx: Context) => {
  const { oneOf, anyOf, title, description } = schema;
  const branches = (oneOf ?? anyOf)!;

  const variants = branches.filter(isSchema).map((branch, i) => {
    const resolved = resolve(branch as JSONSchema7, ctx);
    // Merge parent-level constraints into each variant so
    // shared properties (title, description, base fields) propagate
    const { oneOf, anyOf, ...parentFields } = schema;
    const effective = mergeSchemas(parentFields, resolved);
    return node(effective, path, ctx);
  });

  return {
    kind: "oneOf",
    path,
    title,
    description,
    variants,
  } satisfies RenderNode;
};

const object = (schema: JSONSchema7, path: string, ctx: Context) => {
  const { properties, title, description } = schema;
  const required = new Set(schema.required ?? []);

  const children = Object.entries(properties ?? {})
    .filter(([, v]) => isSchema(v))
    .map(([key, sub]) => {
      const childPath = path ? `${path}.${key}` : key;
      const child = node(sub as JSONSchema7, childPath, ctx);
      child.optional = !required.has(key);
      return child;
    });

  return {
    kind: "object",
    path,
    title,
    description,
    children,
    required,
  } satisfies RenderNode;
};

const array = (schema: JSONSchema7, path: string, ctx: Context) => {
  if (Array.isArray(schema.items)) return tuple(schema, path, ctx);

  const itemSchema = isSchema(schema.items) ? schema.items : {};
  const itemNode = node(itemSchema, `${path}.*`, ctx);

  return {
    kind: "array",
    path,
    itemNode,
    title: schema.title,
    description: schema.description,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
  } satisfies RenderNode;
};

const tuple = (schema: JSONSchema7, path: string, ctx: Context) => {
  const itemNodes = (schema.items as JSONSchema7[])
    .filter(isSchema)
    .map((itemSchema, i) => node(itemSchema as JSONSchema7, `${path}.${i}`, ctx));

  return {
    kind: "tuple",
    path,
    itemNodes,
    title: schema.title,
    description: schema.description,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
  } satisfies RenderNode;
};
