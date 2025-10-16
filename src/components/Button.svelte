<script lang="ts">
  let { children, onclick } = $props();
</script>

<button class="Button" {onclick}>
  {@render children()}
</button>

<style>
  .Button {
    display: block;
    border-radius: 5px;
    border: 1px solid var(--figma-color-border);
    padding: 0 7px;
    line-height: 22px;
    text-decoration: none;
    color: var(--figma-color-text);
    cursor: pointer;
  }
</style>
