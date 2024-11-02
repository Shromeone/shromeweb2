<script>
  let count = $state(0);
  let inputVal = $state("");
  let selected = $state([""]);
  let txt = $derived(3);
  function addCount() {
    count++;
  }
</script>

<h1>About</h1>
<p>{inputVal}</p>
<p>Count: {count}</p>
<input type="text" bind:value={inputVal} />
<button onclick={addCount}>Click me</button>

{#each [1, 2, 3, 4] as num}
  <label>
    <input type="checkbox" name="num" value={num} bind:group={selected} />

    Click {num}
  </label>
{/each}

<p>Clicked {selected}</p>
