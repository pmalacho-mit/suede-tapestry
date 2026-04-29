<script lang="ts" module>
  import type { File } from "./";
  export { symlinkIcon, fileIcon, addFileIcon, addFile };

  const indexBeforeExtension = ({ name }: Pick<File.Model, "name">) => {
    const lastDot = name.lastIndexOf(".");
    return lastDot === -1 ? name.length : lastDot;
  };
</script>

<script lang="ts">
  import Row from "./shared/Row.svelte";
  import Name from "./shared/Name.svelte";
  import { renderer } from "../svelte-snippet-renderer-suede";
  import type { WithClassify } from "./utils/classes";

  let {
    model,
    depth = 0,
    classify,
  }: { model: File.Model; depth?: number } & WithClassify = $props();

  let name = $state<Name>();
  let focused = $state(false);

  $effect(() =>
    model.subscribe({
      "request rename": (config) => {
        if (model.readonly) return;
        const cursor = config?.cursor ?? indexBeforeExtension(model);
        name!.rename(cursor, config?.force);
      },
    }),
  );
</script>

<Row {model} {depth} {classify} bind:name bind:focused>
  {#snippet icon()}
    {#if model.icon.current !== undefined}
      {@render renderer(model.icon)}
    {:else}
      {@render fileIcon()}
    {/if}
  {/snippet}
</Row>

{#snippet symlinkIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <g>
      <path
        fill-rule="evenodd"
        d="M3 3a2 2 0 012-2h9.982a2 2 0 011.414.586l4.018 4.018A2 2 0 0121 7.018V21a2 2 0 01-2 2H4.75a.75.75 0 010-1.5H19a.5.5 0 00.5-.5V8.5h-4a2 2 0 01-2-2v-4H5a.5.5 0 00-.5.5v6.25a.75.75 0 01-1.5 0V3zm12-.5v4a.5.5 0 00.5.5h4a.5.5 0 00-.146-.336l-4.018-4.018A.5.5 0 0015 2.5zm-5.692 12l-2.104-2.236a.75.75 0 111.092-1.028l3.294 3.5a.75.75 0 010 1.028l-3.294 3.5a.75.75 0 11-1.092-1.028L9.308 16H4.09a2.59 2.59 0 00-2.59 2.59v3.16a.75.75 0 01-1.5 0v-3.16a4.09 4.09 0 014.09-4.09h5.218z"
      />
    </g>
  </svg>
{/snippet}

{#snippet fileIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color, currentColor)"
    stroke-width="var(--stroke-width, 1.4)"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
{/snippet}

{#snippet addFileIcon()}
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17 19H21M19 17V21M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H12M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V12M9 17H12M9 13H15M9 9H10"
      stroke="var(--color, currentColor)"
      stroke-width="var(--stroke-width, 1.4)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

{#snippet addFile()}
  {@render addFileIcon()} Add file
{/snippet}
