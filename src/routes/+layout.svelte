<script>
  import "../app.css";
  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" type="image/ico" href="favicon.ico" />
  <title>Shromeone's Web</title>
</svelte:head>

<nav>
  <a href="/">Home</a>
  <!-- <a href="/about">about</a> -->
  <!-- <a href="/cart-quantity">Cart quantity</a> -->
  <!-- <a href="/todo-list">Todo List</a> -->
  <a href="/typing">打字練習</a>
  <a href="/text-replacer">Text Replacer</a>
  <a href="/mark-6-generator">六合彩神器</a>
  <a href="/gas">Testing</a>
</nav>
{@render children?.()}

<style>
  nav {
    width: 100%;
    height: 2rem;
    background-color: var(--dark);
  }
  a {
    font-family: Verdana;
    color: white;
  }
</style>
