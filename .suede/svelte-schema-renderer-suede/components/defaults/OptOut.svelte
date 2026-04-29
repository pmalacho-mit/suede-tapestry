<script lang="ts">
  import type { Field } from "../Field.svelte";
  import Action from "./Action.svelte";

  let { node, model }: Field.Props = $props();

  const onclick = () => model.remove(node);
</script>

<Action {node} {model} {onclick} action="opt-out">×</Action>
