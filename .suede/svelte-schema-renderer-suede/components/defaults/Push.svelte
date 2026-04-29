<script lang="ts">
  import { valueForNode } from "./common";
  import type { Field } from "../Field.svelte";
  import Action from "./Action.svelte";

  let { node, model }: Field.ArrayActionProps = $props();

  const onclick = async () => model.get(node)?.push(await valueForNode(node.itemNode));
</script>

<Action {node} {model} {onclick} action="push">+ Add item</Action>
