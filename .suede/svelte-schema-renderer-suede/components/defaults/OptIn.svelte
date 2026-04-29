<script lang="ts">
  import type { Field } from "../Field.svelte";
  import Action from "./Action.svelte";
  import { title, valueForNode } from "./common.js";

  let { node, model }: Field.Props = $props();

  const onclick = async () => model.set(node, await valueForNode(node));
</script>

<Action {node} {model} {onclick} action="opt-in">
  + {title(node, model)}
</Action>
