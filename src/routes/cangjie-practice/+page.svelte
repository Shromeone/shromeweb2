<script>
  import { onMount } from 'svelte';
  import cangjieData from '$lib/data/cangjie-practice.json';
  import deformationData from '$lib/data/cangjie-deformations.json';
  import radicalData from '$lib/data/cangjie-radicals.json';

  let basicChecked = $state(true);
  let deformationChecked = $state(false);
  let radicalChecked = $state(false);
  let selectedMode = $state('basic');
  let currentCode = $state('');
  let currentDeformation = $state('');
  let userInput = $state('');
  let feedback = $state('');
  let feedbackClass = $state('');
  let inputRef;

  let checkedModes = $derived([basicChecked ? 'basic' : null, deformationChecked ? 'deformation' : null, radicalChecked ? 'radical' : null].filter(Boolean));
  let currentData = $state(cangjieData);
  let codes = $state(Object.keys(cangjieData));

  function pickRandomCode() {
    if (checkedModes.length === 0) return; // no modes checked
    const randomModeIndex = Math.floor(Math.random() * checkedModes.length);
    selectedMode = checkedModes[randomModeIndex];
    if (selectedMode === 'basic') currentData = cangjieData;
    else if (selectedMode === 'deformation') currentData = deformationData;
    else if (selectedMode === 'radical') currentData = radicalData;
    codes = Object.keys(currentData);
    const randomIndex = Math.floor(Math.random() * codes.length);
    currentCode = codes[randomIndex];
    if (selectedMode === 'deformation' || selectedMode === 'radical') {
      const deformations = currentData[currentCode];
      const randomDefIndex = Math.floor(Math.random() * deformations.length);
      currentDeformation = deformations[randomDefIndex];
    } else {
      currentDeformation = currentData[currentCode];
    }
    userInput = '';
    feedback = '';
    feedbackClass = '';
  }

  function checkInput() {
    const correctAnswer = currentCode;
    if (userInput.toUpperCase() === correctAnswer) {
      // feedback = '正確！';
      feedbackClass = 'correct';
      pickRandomCode();
    } else {
      feedback = '錯誤，請再試一次。';
      feedbackClass = 'incorrect';
      userInput = '';
    }
  }

  function handleInput() {
    const requiredLength = selectedMode === 'radical' ? 2 : 1;
    if (userInput.length === requiredLength) {
      checkInput();
    }
  }

  onMount(() => {
    pickRandomCode();
  });
</script>

<svelte:head>
  <title>倉頡字碼練習</title>
</svelte:head>

<div class="container">
  <h1>倉頡字碼練習</h1>
  <p>看到漢字時，請輸入對應的倉頡碼。</p>
  <div class="code-display">{currentDeformation}</div>
  <input
    bind:value={userInput}
    on:input={handleInput}
    bind:this={inputRef}
    placeholder="輸入倉頡碼"
    class="input-field"
  />
  <p class="feedback {feedbackClass}">{feedback}</p>
  <div class="mode-checkboxes">
    <label><input type="checkbox" bind:checked={basicChecked} /> 基本</label>
    <label><input type="checkbox" bind:checked={deformationChecked} /> 變形</label>
    <label><input type="checkbox" bind:checked={radicalChecked} /> 部首</label>
  </div>
</div>

<style>
  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: Arial, sans-serif;
  }

  h1 {
    margin-bottom: 20px;
  }

  .code-display {
    font-size: 5rem;
    margin: 40px 0;
    font-weight: bold;
  }

  .input-field {
    font-size: 2rem;
    padding: 10px;
    width: 200px;
    text-align: center;
    margin-bottom: 20px;
  }



  .feedback {
    font-size: 1.5rem;
    margin-top: 20px;
  }

  .correct {
    color: green;
  }

  .incorrect {
    color: red;
  }

  .mode-checkboxes {
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    font-size: 1rem;
  }

  .mode-checkboxes label {
    margin: 5px 0;
  }
</style>
