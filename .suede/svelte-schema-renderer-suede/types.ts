import type { JSONSchema7 } from "json-schema";
import type { JoinPath, UnionToIntersection } from "./utils";

export type Primitives = {
  string: string;
  number: number;
  boolean: boolean;
};

export type Base<Kind extends string, T = {}> = {
  kind: Kind;
  path: string;
  title?: string;
  description?: string;
  optional?: boolean;
} & T &
  (Kind extends keyof Primitives
    ? { default?: Primitives[Kind]; options?: Primitives[Kind][] }
    : {});

export type RenderNode =
  | Base<
      "string",
      {
        format?: string;
        const?: string | number | boolean;
      }
    >
  | Base<
      "number",
      {
        min?: number;
        max?: number;
      }
    >
  | Base<"boolean">
  | Base<
      "object",
      {
        children: RenderNode[];
        required: Set<string>;
      }
    >
  | Base<
      "array",
      {
        itemNode: RenderNode;
        minItems?: number;
        maxItems?: number;
      }
    >
  | Base<
      "tuple",
      {
        itemNodes: RenderNode[];
        minItems?: number;
        maxItems?: number;
      }
    >
  | Base<
      "enum",
      {
        options: unknown[];
      }
    >
  | Base<
      "oneOf",
      {
        variants: RenderNode[];
      }
    >
  | Base<"unknown", { schema: unknown }>;

export type Kind = RenderNode["kind"];
export type SpecificNode<K extends Kind> = Extract<RenderNode, { kind: K }>;
export type PrimitiveKind = Extract<Kind, keyof Primitives>;

export interface Context {
  rootSchema: JSONSchema7;
  /** Track visited $refs to detect circular references */
  refStack: Set<string>;
  /** Pre-fetched external schemas keyed by document URL (no fragment) */
  externalSchemas: Map<string, JSONSchema7>;
}

export type KindOf<T> = T extends string
  ? "string"
  : T extends number
    ? "number"
    : T extends boolean
      ? "boolean"
      : T extends unknown[]
        ? "array"
        : T extends Record<string, unknown>
          ? "object"
          : "unknown";

export type FromKind<K> = K extends keyof Primitives
  ? Primitives[K]
  : K extends "array"
    ? unknown[]
    : K extends "object"
      ? Record<string, unknown>
      : unknown;

export type PathMap<T, Prefix extends string = ""> =
  // The node for the current path
  { [K in Prefix]: KindOf<T> } &
    // Recurse into object properties
    (T extends Record<string, unknown>
      ? {
          [K in keyof T & string as JoinPath<Prefix, K>]: KindOf<T[K]>;
        } & UnionToIntersection<
          {
            [K in keyof T & string]: PathMap<
              NonNullable<T[K]>,
              JoinPath<Prefix, K>
            >;
          }[keyof T & string]
        >
      : {}) &
    // Recurse into array items
    (T extends (infer Item)[]
      ? { [K in JoinPath<Prefix, "*">]: KindOf<Item> } & PathMap<
          NonNullable<Item>,
          JoinPath<Prefix, "*">
        >
      : {});

export type ArrayPathMap<T, Prefix extends string = ""> = {
  [K in keyof PathMap<T, Prefix> as K extends `${infer Parent}.*`
    ? Parent
    : never]: K extends `${infer Parent extends keyof PathMap<T, Prefix> & string}.*`
    ? PathMap<T, Prefix>[Parent]
    : never;
};
