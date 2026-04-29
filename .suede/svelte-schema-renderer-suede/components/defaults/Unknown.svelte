<script lang="ts">
  import type { Field } from "../Field.svelte";

  let { node }: Field.Props<"unknown"> = $props();
</script>

<p>Unsupported kind: {node.kind}</p>
