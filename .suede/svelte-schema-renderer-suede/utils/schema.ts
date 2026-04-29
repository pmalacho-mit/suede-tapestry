import type {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7TypeName,
} from "json-schema";

export const isSchema = (
  v: JSONSchema7Definition | undefined | null,
): v is JSONSchema7 => typeof v === "object" && v !== null;

/** Normalize a JSONSchema7Definition (which can be `boolean`) to a schema */
export const asDef = (v: JSONSchema7Definition): JSONSchema7 =>
  typeof v === "boolean" ? (v ? {} : { not: {} }) : v;

export const infer = (schema: JSONSchema7): JSONSchema7TypeName | undefined => {
  if (schema.type)
    return Array.isArray(schema.type) ? schema.type[0] : schema.type;

  // Infer from a const value
  if (schema.const !== undefined) {
    const t = typeof schema.const;
    if (t === "string" || t === "number" || t === "boolean") return t;
  }

  // Infer from the presence of type-specific keywords
  if (schema.properties || schema.additionalProperties || schema.required)
    return "object";

  if (schema.items || schema.minItems != null || schema.maxItems != null)
    return "array";

  if (
    schema.minimum != null ||
    schema.maximum != null ||
    schema.multipleOf != null
  )
    return "number";

  if (schema.minLength != null || schema.maxLength != null || schema.pattern)
    return "string";

  return undefined;
};
