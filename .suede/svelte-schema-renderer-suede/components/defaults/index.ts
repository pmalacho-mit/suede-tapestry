import type { Component } from "svelte";
import type { Field } from "../Field.svelte";
import type { Kind } from "../../types";
import String from "./String.svelte";
import Number from "./Number.svelte";
import Boolean from "./Boolean.svelte";
import Enum from "./Enum.svelte";
import Object from "./Object.svelte";
import Array from "./Array.svelte";
import Tuple from "./Tuple.svelte";
import OneOf from "./OneOf.svelte";
import Unknown from "./Unknown.svelte";
import OptIn from "./OptIn.svelte";
import OptOut from "./OptOut.svelte";
import Push from "./Push.svelte";
import Splice from "./Splice.svelte";
import Insert from "./Insert.svelte";

export const component = {
  byKind: {
    string: String,
    number: Number,
    boolean: Boolean,
    enum: Enum,
    object: Object,
    array: Array,
    tuple: Tuple,
    oneOf: OneOf,
    unknown: Unknown,
  } satisfies {
    [K in Kind]: Component<Field.Props<K>>;
  },
  byAction: {
    opt_in__: OptIn,
    opt_out__: OptOut,
  } satisfies {
    [K in Field.RenderActions]: Component<Field.Props<any>>;
  },
  forArray: {
    push: Push,
    splice: Splice,
    insert: Insert,
  },
};
