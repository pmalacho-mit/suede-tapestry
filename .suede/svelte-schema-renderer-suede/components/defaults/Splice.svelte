<script lang="ts">
  import type { Field } from "../Field.svelte";
  import Action from "./Action.svelte";

  let { node, model, index }: Field.ArrayActionProps = $props();

  const onclick = () => model.get(node)?.splice(index, 1);
</script>

<Action {node} {model} {onclick} action="splice" detail={`at ${index}`}>
  Remove
</Action>
