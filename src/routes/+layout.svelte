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
  <a href="/cangjie-practice">倉頡字碼練習</a>
  <a href="/text-replacer">Text Replacer</a>
  <a href="/mark-6-generator">六合彩神器</a>
  <a href="/gas">Testing</a>
</nav>
{@render children?.()}

<footer class="version-footer">
  <p>Last update: 2026-01-22</p>
</footer>

<style>
  nav {
    width: 100%;
    height: 2rem;
    background-color: var(--dark);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 0 0.5rem;
    box-sizing: border-box;
  }

  nav a {
    font-family: Verdana;
    color: white;
    margin: 0 0.5rem 0 0;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .version-footer {
    position: fixed;
    bottom: 0;
    right: 0;
    padding: 0.5rem;
    background-color: rgba(0, 0, 0, 0.1);
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
    z-index: 100;
    border-radius: 0.25rem 0 0 0;
  }

  .version-footer p {
    margin: 0;
    font-family: Verdana;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    nav {
      height: auto;
      min-height: 2rem;
      padding: 0.25rem 0.5rem;
    }

    nav a {
      font-size: 0.8rem;
      margin: 0.25rem 0.25rem 0.25rem 0;
      display: inline-block;
    }

    .version-footer {
      font-size: 0.7rem;
      padding: 0.25rem;
    }
  }

  @media (max-width: 480px) {
    nav a {
      font-size: 0.75rem;
      margin: 0.2rem 0.2rem 0.2rem 0;
    }

    .version-footer {
      font-size: 0.65rem;
      padding: 0.2rem;
    }
  }
</style>
