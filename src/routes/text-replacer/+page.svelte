<script>
  import { run } from "svelte/legacy";

  // @ts-nocheck
  import Input from "./Input.svelte";
  import Checkbox from "./Checkbox.svelte";
  import { onMount } from "svelte";
  import { quickSelectOptions } from "./quick-select";
  import { matchOptions } from "./match-options";

  let quickRegexList = [];
  let matchOptionsList = $state([]);

  let regexInput = $state();
  let regexCmd = $state("");
  let result = $state("");
  let textToReplace = $state("A quick brown fox jumps over the lazy dog.");
  let replacer = $state("");

  onMount(() => {
    updateResult();
  });

  function replaceFunc(match) {
    let matchWithOptions = match;

    for (let func of matchOptionsList) {
      matchWithOptions = func(matchWithOptions);
      matchWithOptions;
    }

    let newStr = replacer.replace(/(?<!\\)<m>/g, matchWithOptions);
    newStr = newStr.replace(/\\<m>/, "<m>");

    return newStr;
  }
  function updateResult() {
    try {
      result = textToReplace.replace(new RegExp(regexCmd, "g"), replaceFunc);
      regexInput.setError(false);
    } catch (err) {
      console.log(err.message);
      regexError();
    }
  }

  function regexError() {
    if (!regexInput) return;
    regexInput.setError(true);
  }

  function setRegexToQuick() {
    regexCmd = quickRegexList.join("|");
  }

  function quickRegexChange(val = "", add = true) {
    if (add) {
      if (!quickRegexList.includes(val)) quickRegexList.push(val);
    } else {
      if (quickRegexList.includes(val))
        quickRegexList.splice(quickRegexList.indexOf(val), 1);
    }
    setRegexToQuick();
  }

  function insertMatch() {
    replacer += "<m>";
  }

  function matchOptionChange(val = () => "", add = true) {
    if (add) {
      matchOptionsList.push(val);
      if (!replacer.includes("<m>")) replacer += "<m>";
    } else {
      matchOptionsList.splice(matchOptionsList.indexOf(val), 1);
    }
    matchOptionsList = matchOptionsList;

    console.log(matchOptionsList);
  }

  // function handleQuickCheckboxClick(regex, checked) {
  //   quickRegexChange(regex, e.detail.checked);
  // }

  // function handleMatchCheckboxClick(e) {
  //   matchOptionChange(e.detail.param, e.detail.checked);
  // }

  function pasteFromClipboard() {
    navigator.clipboard.readText().then((txt) => {
      textToReplace = txt;
      updateResult();
    });
  }

  function copyResult() {
    navigator.clipboard.writeText(result);
    alert("Copy success!");
  }

  run(() => {
    console.log(replacer, regexCmd, textToReplace, matchOptionsList);
    updateResult();
  });
</script>

<h1>Text Replacer</h1>
<h2>Remove, Replace, Modify customly selected words.</h2>
<div class="horizontal">
  <div class="input-output">
    <p>Input</p>
    <textarea
      class="content"
      name="content"
      rows="10"
      placeholder="Enter the text that you want to replace here"
      bind:value={textToReplace}
      oninput={updateResult}
      onchange={updateResult}
    ></textarea>
    <button onclick={pasteFromClipboard} class="paste-btn"
      >Paste from Clipboard</button
    >
    <p>Output</p>
    <div class="result">
      <div class="result-text">{result}</div>
    </div>
    <button onclick={copyResult} class="copy-btn">Copy Result</button>
  </div>
  <div class="options">
    <div class="fields">
      <Input
        on:update={updateResult}
        on:change={updateResult}
        bind:this={regexInput}
        bind:value={regexCmd}
      >
        <a style="color: white" href="https://regexr.com/" target="_blank"
          >Regex</a
        >
      </Input>
      <Input
        on:update={updateResult}
        on:change={updateResult}
        bind:value={replacer}>Replace with</Input
      >
    </div>
    <div class="insert-match">
      <p class="note">
        Note: use &lt;m&gt; to insert the matched characters.<br />(\&lt;m&gt;
        to escape)
      </p>
      <button onclick={insertMatch}>Insert match</button>
    </div>

    <div class="match-options">
      <p>Match options</p>
      <div class="quick-options">
        {#each matchOptions as option}
          <Checkbox
            param={option.func}
            on:click={(e) => matchOptionChange(option.func, e.detail)}
            >{option.text}</Checkbox
          >
        {/each}
      </div>
    </div>

    <div class="quick-select">
      <p>Quick select</p>
      <div class="quick-options">
        {#each quickSelectOptions as option}
          <Checkbox :click={(e) => quickRegexChange(option.regex, e.detail)}
            >{option.text}</Checkbox
          >
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  h2 {
    font-size: 1.3rem;
  }
  Input a {
    color: white;
  }
  .horizontal {
    display: grid;
    grid-template-columns: 30% 70%;
    gap: 0;
    margin: 1rem;
  }
  p {
    font-family: Verdana, Geneva, Tahoma, sans-serif;
  }

  .insert-match {
    display: flex;
    width: 100%;
    justify-content: space-between;
    gap: 1rem;
  }

  .insert-match button {
    flex: 1;
  }

  .note {
    font-size: 0.7rem;
  }

  .input-output {
    width: 20vw;
  }

  .input-output textarea {
    width: 100%;
  }

  .quick-options {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .result-text {
    display: inline-block;
    overflow-y: scroll;
    width: 100%;
    height: 12rem;
    border: 1px solid rgb(142, 142, 142);
    color: white;
  }
  .result {
    display: flex;
  }

  .error {
    border: red;
  }

  .copy-btn,
  .paste-btn {
    border-radius: 5rem;
    border: none;
    padding: 1em;
    font-size: 1rem;
    transition: all 0.3s;
  }

  .copy-btn:hover,
  .paste-btn:hover {
    background-color: rgb(125, 0, 21);
  }

  .copy-btn:active,
  .paste-btn:active {
    opacity: 80%;
  }
</style>
