<script lang="ts" module>
  const Classes = (classify: Classify) =>
    classified(classify, {
      text: "name-text",
      input: "name-input",
      snapshot: "name-snapshot",
      highlighted: "name-highlighted",
    });

  export type Props = {
    model: File.Model | Folder.Model;
  } & WithClassify;
</script>

<script lang="ts">
  import { mouseEventToCaretIndex, px } from "../utils";
  import type { File, Folder } from "..";
  import {
    classified,
    type Classify,
    type WithClassify,
  } from "../utils/classes";
  import { validNameContent } from "../models.svelte";

  let { model, classify }: Props = $props();

  const name = $derived(model.name);
  const classes = $derived(Classes(classify));

  let editing = $state(false);
  let input = $state<HTMLInputElement>();
  let snapshot = $state<HTMLSpanElement>();
  let snapshotWidth = $state(0);
  let caretIndex = $state(-1);
  let scrollLeft = $state(-1);
  let highlighted = $state(false);
  let editableNameOverride: string | undefined;

  export const edit = <
    Condition extends true | false,
    Detail extends Condition extends true ? typeof caretIndex : string,
  >(
    condition: Condition,
    detail: Detail,
    override?: string
  ) => {
    scrollLeft = -1;
    editing = condition;
    editableNameOverride = override;
    if (condition) caretIndex = detail as number;
    else {
      highlight(false);
      const from = model.name;
      let to = detail as string;
      const result = validNameContent(model, to);
      if (result !== true) to = from;
      model.name = to;
      (model as File.Model).fire("renamed", model, from, to);
      model.onNameChange?.(from, to);
    }
  };

  export const highlight = (setting?: boolean) => {
    setting ??= !highlighted;
    highlighted = setting;
  };

  export const rename = (detail: number, override?: string) => {
    highlight();
    edit(true, detail, override);
  };

  $effect(() => {
    if (!input) return;
    input.value = editableNameOverride ?? name;
    input.focus();
    if (caretIndex >= 0) input.setSelectionRange(caretIndex, caretIndex);
    if (scrollLeft >= 0) input.scrollLeft = scrollLeft;
  });
</script>

{#if editing}
  <input
    bind:this={input}
    class={classes("input", "text")}
    style:width={px(snapshotWidth)}
    type="text"
    style:font-size="inherit"
    style:color="inherit"
    onblur={({ currentTarget: { value } }) => edit(false, value)}
    onkeydown={({ key, currentTarget }) =>
      key !== "Enter" || currentTarget.blur()}
    onclick={(event) => {
      event.stopPropagation();
    }}
  />
{:else}
  <span
    bind:this={snapshot}
    bind:clientWidth={snapshotWidth}
    class={highlighted
      ? classes("highlighted", "snapshot", "text")
      : classes("snapshot", "text")}
    style:width="100%"
    role="button"
    style:font-size="inherit"
    style:color="inherit"
    tabindex="0"
    ondblclick={(event) => {
      const result = mouseEventToCaretIndex(event, name);
      edit(true, result.caretIndex);
      scrollLeft = event.offsetX - result.approxCharacterWidth;
    }}
  >
    {name}
  </span>
{/if}

<style>
  span {
    width: 100%;
    position: relative;
    flex-grow: 1;
    overflow-x: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    outline-style: solid;
    outline-color: transparent;
  }
  input {
    border: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
    background-color: transparent;
    outline-style: solid;
    outline-color: transparent;
    border-radius: 0.125rem;
  }
</style>
