<script lang="ts">
  import Button from "./components/Button.svelte";

  function convertVariables() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "CONVERT_VARIABLES",
        },
      },
      "*"
    );
  }
</script>

<div class="container">
  <div>
    <Button onclick={convertVariables}>convert variables</Button>
  </div>
</div>

<style>
</style>
