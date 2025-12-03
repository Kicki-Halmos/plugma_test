<script lang="ts">
  interface ButtonProps {
    children: () => any;
    onclick?: () => void;
    disabled?: boolean;
  }
  let { children, onclick, disabled }:ButtonProps = $props();
</script>

<button disabled={disabled} class="p-2 w-fit- h-fit border rounded cursor-pointer" {onclick}>
  {@render children()}
</button>
