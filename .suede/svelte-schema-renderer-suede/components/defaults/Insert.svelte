<script lang="ts">
  import { valueForNode } from "./common";
  import type { Field } from "../Field.svelte";
  import Action from "./Action.svelte";

  let { node, model, index }: Field.ArrayActionProps = $props();

  const onclick = async () =>
    model.get(node)?.splice(index, 0, await valueForNode(node.itemNode));
</script>

<Action {node} {model} {onclick} action="insert" detail="at {index}">
  + Insert
</Action>
