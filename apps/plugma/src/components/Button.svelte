<script lang="ts">
  let { children, onclick } = $props();
</script>

<button class="p-2 w-fit- h-fit border rounded cursor-pointer" {onclick}>
  {@render children()}
</button>
