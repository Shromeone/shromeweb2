<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function update() {
    dispatch("update");
  }
  export function setError(isError = true) {
    error = isError;
  }

  let error = $state(false);
  /** @type {{text?: string, placeholder?: string, value?: string, children?: import('svelte').Snippet}} */
  let {
    text = "Item",
    placeholder = "",
    value = $bindable(""),
    children
  } = $props();
</script>

<div class="input">
  <p>{@render children?.()}</p>
  <input
    class={error ? "error" : ""}
    bind:value
    {placeholder}
    oninput={update}
    onchange={update}
    type="text"
  />

  <button onclick={() => (value = "")}>Clear</button>
</div>

<style>
  .input {
    display: flex;
    width: 100%;
    gap: 2em;
  }

  .input input {
    color: lightgray;
    background-color: rgb(62, 62, 62);
    flex: 1;
    align-items: right;
  }

  .error {
    border: 1px solid red;
  }
</style>
