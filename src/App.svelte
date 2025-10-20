<script lang="ts">
  import "./styles.css";
  import { onMount } from "svelte";
  import Button from "./components/Button.svelte";
  let variables = $state("");

  const convertVariables = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "CONVERT_VARIABLES",
        },
      },
      "*"
    );
  };

  const resizeUi = (width: number, height: number) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "RESIZE_UI",
          width,
          height,
        },
      },
      "*"
    );
  };

  $effect(() => {
    variables && resizeUi(780, 560);
  });

  onMount(() => {
    window.onmessage = (event) => {
      const { type } = event.data.pluginMessage;
      if (type === "VARIABLES_CONVERTED") {
        const { data } = event.data.pluginMessage;
        variables = data;
      }
      if (type === "CLOSE_PLUGIN") {
        figma.closePlugin();
      }
    };
  });

  $effect(() => {
    console.log("Variables updated:", variables);
  });
</script>

<div class="text-sm">
  <div class="flex p-4 justify-around">
    <Button onclick={convertVariables}>Convert variables</Button>
    {#if variables}
      <pre
        class="border-l p-4 overflow-auto text-xs whitespace-pre-wrap wrap-break-word">{variables}</pre>
    {/if}
  </div>
</div>
