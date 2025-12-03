<script lang="ts">
  import "./styles.css";
  import { onMount } from "svelte";
  import Button from "./components/Button.svelte";

  
  let variables = $state("");
  let repoName = $state("");
  let prStatus = $state("");
  let isCreatingPR = $state(false);



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

  const createPR = async () => {
    if (!repoName || !variables) return;
    
    isCreatingPR = true;
    prStatus = "Creating PR...";

    try {
      // Using api/auth as requested by user
      const response = await fetch(`https://9b727f3c3870.ngrok-free.app/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo: repoName,
          content: variables
        })
      }); 

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        prStatus = `PR Created: ${data.url}`;
      } else {
        prStatus = `Error: ${data.error || 'Failed to create PR'}`;
      }
    } catch (error) {
      prStatus = `Error connecting to server: ${error}`;
    } finally {
      isCreatingPR = false;
    }
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
  <div class="flex flex-col p-4 gap-4">
    <Button onclick={convertVariables}>Convert variables</Button>

    {#if variables}
      <div class="flex flex-col gap-2 border-t pt-4">
        <label for="repo-name" class="font-bold text-xs">GitHub Repository (owner/repo)</label>
        <input 
          id="repo-name"
          type="text" 
          bind:value={repoName} 
          placeholder="e.g. owner/repo-name" 
          class="border p-2 rounded text-xs"
        />
        <Button onclick={createPR} disabled={!repoName || isCreatingPR}>
          {isCreatingPR ? 'Creating...' : 'Create Pull Request'}
        </Button>
        {#if prStatus}
          <div class="text-xs text-blue-600 break-all">{prStatus}</div>
        {/if}
      </div>

      <pre
        class="border-l p-4 overflow-auto text-xs whitespace-pre-wrap wrap-break-word max-h-60">{variables}</pre>
    {/if}
  </div>
</div>
