import type { JSONSchema7 } from "json-schema";
import type { Context } from "../types.js";
import { asDef } from "./schema.js";
import { resolve } from "./refs.js";

export const merge = (schema: JSONSchema7, ctx: Context): JSONSchema7 => {
  let result = { ...schema };

  // allOf: always merge everything together
  if (result.allOf) {
    for (const sub of result.allOf) {
      const resolved = resolve(asDef(sub), ctx);
      result = mergeSchemas(result, resolved);
    }
    delete result.allOf;
  }

  // anyOf with a single variant is just that variant
  if (result.anyOf?.length === 1) {
    const resolved = resolve(asDef(result.anyOf[0]), ctx);
    result = mergeSchemas(result, resolved);
    delete result.anyOf;
  }

  // oneOf with a single variant — same treatment
  if (result.oneOf?.length === 1) {
    const resolved = resolve(asDef(result.oneOf[0]), ctx);
    result = mergeSchemas(result, resolved);
    delete result.oneOf;
  }

  // if/then/else: merge "then" and "else" properties in so the
  // render tree shows all possible fields. Conditional visibility
  // is a renderer concern, not a schema-tree concern.
  if (result.then || result.else) {
    if (result.then)
      result = mergeSchemas(result, resolve(asDef(result.then), ctx));
    if (result.else)
      result = mergeSchemas(result, resolve(asDef(result.else), ctx));

    delete result.if;
    delete result.then;
    delete result.else;
  }

  return result;
};

/**
 * Shallow-merge two schemas. Properties, required arrays, and
 * validation keywords all combine. Conflicting scalars (like
 * `type`) use the override (right-hand side).
 */
export const mergeSchemas = (
  base: JSONSchema7,
  override: JSONSchema7,
): JSONSchema7 => {
  const merged: JSONSchema7 = { ...base, ...override };

  // Deep-merge properties
  if (base.properties || override.properties)
    merged.properties = {
      ...(base.properties ?? {}),
      ...(override.properties ?? {}),
    };

  // Union required arrays
  if (base.required || override.required)
    merged.required = [
      ...new Set([...(base.required ?? []), ...(override.required ?? [])]),
    ];

  if (base.minimum != null && override.minimum != null)
    merged.minimum = Math.max(base.minimum, override.minimum);

  if (base.maximum != null && override.maximum != null)
    merged.maximum = Math.min(base.maximum, override.maximum);

  if (base.minLength != null && override.minLength != null)
    merged.minLength = Math.max(base.minLength, override.minLength);

  if (base.maxLength != null && override.maxLength != null)
    merged.maxLength = Math.min(base.maxLength, override.maxLength);

  return merged;
};
