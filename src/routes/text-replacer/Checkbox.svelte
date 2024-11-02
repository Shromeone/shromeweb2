<script>
  // @ts-nocheck

  let { children, click } = $props();
  let checked = $state(false);

  function toggleCheck() {
    checked = !checked;
    click();
  }
</script>

<div class="checkbox">
  <button class={checked ? "checked" : ""} onclick={toggleCheck}
    >{@render children?.()}</button
  >
</div>

<style>
  .checkbox button {
    color: white;
    border: none;
    background-color: transparent;
    border-radius: 3rem;
    background-color: rgb(75, 75, 75);
  }

  .checkbox button.checked {
    background-color: rgb(42, 207, 0);
  }

  .checkbox {
    max-width: 40vw;
    display: flex;
    justify-content: space-between;
  }
</style>
