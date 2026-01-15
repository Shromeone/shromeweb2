<script>
  import { onMount } from 'svelte';
  import questionsData from './cangjie-practice-questions.json';
  import settingsIcon from '$lib/images/settings-svgrepo-com.svg';

  const cangjieMap = {};
  for (const q of questionsData) {
    cangjieMap[q.character] = q.code;
  }

  const radicalMap = {
    'A': '日', 'B': '月', 'C': '金', 'D': '木', 'E': '水',
    'F': '火', 'G': '土', 'H': '竹', 'I': '戈', 'J': '十',
    'K': '大', 'L': '中', 'M': '一', 'N': '弓', 'O': '人',
    'P': '心', 'Q': '手', 'R': '口', 'S': '尸', 'T': '廿',
    'U': '山', 'V': '女', 'W': '田', 'X': '難', 'Y': '卜', 'Z': '重'
  };

  function convertCodeToRadicals(code) {
    return code.split('').map(letter => radicalMap[letter] || letter).join('');
  }

  function isSvgPath(character) {
    return typeof character === 'string' && character.endsWith('.svg');
  }

  function convertInput(input) {
    let result = '';
    for (const char of input) {
      result += cangjieMap[char] || char;
    }
    return result.toUpperCase();
  }

  let basicChecked = $state(true);
  let auxiliaryChecked = $state(false);
  let radicalChecked = $state(false);
  let twoChecked = $state(false);
  let hardChecked = $state(false);
  let selectedCategory = $state('basic');
  let nextCategory = $state('basic');
  let nextNextCategory = $state('basic');
  let currentCode = $state('');
  let currentQuestion = $state('');
  let previousQuestion = $state('');
  let nextQuestion = $state('');
  let nextCode = $state('');
  let nextNextQuestion = $state('');
  let nextNextCode = $state('');
  let userInput = $state('');
  let feedback = $state('');
  let feedbackClass = $state('');
  let animate = $state(false);
  let inputRef;
  let warningMessage = $state('');
  let settingsOpen = $state(false);
  let isSpinning = $state(false);
  let spinDirection = $state('clockwise');
  let hintThreshold = $state(2);
  let hintType = $state('alphabets');
  let showHintImage = $state(true);
  let hintImageUrl = $state('');
  let wrongAttempts = $state(0);
  let hintText = $state('');

  let checkedCategories = $derived([basicChecked ? 'basic' : null, auxiliaryChecked ? 'auxiliary' : null, radicalChecked ? 'radical' : null, twoChecked ? 'two' : null, hardChecked ? 'hard' : null].filter(Boolean));
  let filteredQuestions = $derived(questionsData.filter(q => checkedCategories.some(cat => q.category.includes(cat))));

  function pickRandomCode() {
    previousQuestion = currentQuestion;
    if (checkedCategories.length === 0) return; // no categories checked
    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    const question = filteredQuestions[randomIndex];
    currentCode = question.code;
    currentQuestion = question.character;
    selectedCategory = question.category[0]; // use first category for length check
    // Pre-make the next question
    if (nextQuestion === "") {
      const nextQ = pickNewQuestion();
      nextQuestion = nextQ.character;
      nextCode = nextQ.code;
      nextCategory = nextQ.category[0];
    }

    if (nextNextQuestion === "") {
      // Pre-make the next-next question
      const nextNextQ = pickNewQuestion();
      nextNextQuestion = nextNextQ.character;
      nextNextCode = nextNextQ.code;
      nextNextCategory = nextNextQ.category[0];
    }

    userInput = '';
    feedback = '';
    feedbackClass = '';
    wrongAttempts = 0;
    updateHintText();
  }

  function pickNewQuestion() {
    if (checkedCategories.length === 0) return { character: '', code: '', category: ['basic'] };
    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    return filteredQuestions[randomIndex];
  }

  function animateQuestions() {
    feedback = '';

    // Use the pre-made next question
    animate = true;
    setTimeout(() => {
      previousQuestion = currentQuestion;
      currentQuestion = nextQuestion;
      currentCode = nextCode;
      selectedCategory = nextCategory;
      // Pre-make the next question for the next round
      nextQuestion = nextNextQuestion;
      nextCode = nextNextCode;
      nextCategory = nextNextCategory;
      // Pre-make the next-next question for the next round
      const nextNextQ = pickNewQuestion();
      nextNextQuestion = nextNextQ.character;
      nextNextCode = nextNextQ.code;
      nextNextCategory = nextNextQ.category[0];
      feedback = '';
      feedbackClass = '';
      animate = false;
      updateHintText();
    }, 200);
    setTimeout(() => {
    handleInput();
    }, 240);
  }

  function checkInput() {
    const correctAnswer = currentCode;
    const convertedInput = convertInput(userInput);
    if (convertedInput === correctAnswer) {
      userInput = '';
      feedbackClass = 'correct';
      wrongAttempts = 0;
      animateQuestions();
    } else {
      wrongAttempts++;
      updateHintText();
      feedback = '錯誤，請再試一次。';
      feedbackClass = 'incorrect';
      userInput = userInput.slice(0, currentCode.length);
      userInput = userInput.slice(1); // Remove first character, keep the rest
    }
  }

  function updateHintText() {
    if (hintThreshold === 0 || wrongAttempts >= hintThreshold) {
      if (hintType === 'alphabets') {
        hintText = `提示: ${currentCode}`;
      } else {
        hintText = `提示: ${convertCodeToRadicals(currentCode)}`;
      }

      if (showHintImage && currentCode.length >= 2) {
        hintImageUrl = `https://www.hkcards.com/img/cj/${currentQuestion}.png`;
      } else {
        hintImageUrl = '';
      }
    } else {
      hintText = "";
      hintImageUrl = '';
    }
  }

  function handleInput() {
    if (animate) return;
    const requiredLength = currentCode.length;
    const convertedLength = convertInput(userInput).length;
    if (convertedLength >= requiredLength) {
      checkInput();
    }
  }

  function handleCheckboxChange() {
    nextQuestion = '';
    nextCode = '';
    nextCategory = '';
    nextNextQuestion = '';
    nextNextCode = '';
    nextNextCategory = '';
    pickRandomCode();
    previousQuestion = '';
    if (checkedCategories.length === 0) {
      warningMessage = '請在設定(右上角)揀至少一種題目類別';
    } else {
      warningMessage = '';
    }
  }

  function handleSettingsToggle() {
    const isOpening = !settingsOpen;
    spinDirection = isOpening ? 'anticlockwise' : 'clockwise';
    isSpinning = true;
    settingsOpen = !settingsOpen;
    setTimeout(() => isSpinning = false, 300);
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
  <div class="question-container" class:animate>
    <div class="question previous">
      {#if isSvgPath(previousQuestion)}
        <img src={previousQuestion} alt="Previous question" class="question-svg" />
      {:else}
        {previousQuestion}
      {/if}
    </div>
    <div class="question current">
      {#if isSvgPath(currentQuestion)}
        <img src={currentQuestion} alt="Current question" class="question-svg" />
      {:else}
        {currentQuestion}
      {/if}
    </div>
    <div class="question next">
      {#if isSvgPath(nextQuestion)}
        <img src={nextQuestion} alt="Next question" class="question-svg" />
      {:else}
        {nextQuestion}
      {/if}
    </div>
    <div class="question next-next">
      {#if isSvgPath(nextNextQuestion)}
        <img src={nextNextQuestion} alt="Next next question" class="question-svg" />
      {:else}
        {nextNextQuestion}
      {/if}
    </div>
  </div>
  <input
    bind:value={userInput}
    on:input={handleInput}
    bind:this={inputRef}
    placeholder="輸入倉頡碼"
    class="input-field"
    disabled={checkedCategories.length === 0}
  />
  {#if hintText}
    <p class="hint">{hintText}</p>
  {/if}
  {#if hintImageUrl}
    <img class="hint-image" src={hintImageUrl} alt="Cangjie code hint" />
  {/if}
  <p class="warning">{warningMessage}</p>
  <p class="feedback {feedbackClass}">{feedback}</p>
</div>

<button class="settings-btn" on:click={handleSettingsToggle}>
  <img src={settingsIcon} alt="settings" class="settings-icon {isSpinning ? 'spinning' : ''} {spinDirection}" />
</button>

{#if settingsOpen}
<div class="overlay" on:click={() => settingsOpen = false}></div>
{/if}

<div class="settings-panel" class:open={settingsOpen}>
  <div class="settings-header">
    <h2>設定</h2>
  </div>
  <div class="setting">
    <h3>題目類別</h3>
    <div class="category-buttons">
      <button class="category-btn {basicChecked ? 'checked' : 'unchecked'}" on:click={() => { basicChecked = !basicChecked; handleCheckboxChange(); }}>基本</button>
      <button class="category-btn {auxiliaryChecked ? 'checked' : 'unchecked'}" on:click={() => { auxiliaryChecked = !auxiliaryChecked; handleCheckboxChange(); }}>輔助</button>
      <button class="category-btn {radicalChecked ? 'checked' : 'unchecked'}" on:click={() => { radicalChecked = !radicalChecked; handleCheckboxChange(); }}>部首</button>
      <button class="category-btn {twoChecked ? 'checked' : 'unchecked'}" on:click={() => { twoChecked = !twoChecked; handleCheckboxChange(); }}>二字</button>
      <button class="category-btn {hardChecked ? 'checked' : 'unchecked'}" on:click={() => { hardChecked = !hardChecked; handleCheckboxChange(); }}>難字</button>
    </div>
  </div>
  <div class="setting">
    <h3>錯誤X次後提示</h3>
    <div class="threshold-buttons">
      <button class="threshold-btn {hintThreshold === 0 ? 'selected' : ''}" on:click={() => hintThreshold = 0}>經常出現</button>
      <button class="threshold-btn {hintThreshold === 1 ? 'selected' : ''}" on:click={() => hintThreshold = 1}>1 次</button>
      <button class="threshold-btn {hintThreshold === 2 ? 'selected' : ''}" on:click={() => hintThreshold = 2}>2 次</button>
      <button class="threshold-btn {hintThreshold === 3 ? 'selected' : ''}" on:click={() => hintThreshold = 3}>3 次</button>
      <button class="threshold-btn {hintThreshold === 5 ? 'selected' : ''}" on:click={() => hintThreshold = 5}>5 次</button>
    </div>
  </div>
  <div class="setting">
    <h3>提示類型</h3>
    <div class="hint-type-buttons">
      <button class="hint-type-btn {hintType === 'alphabets' ? 'selected' : ''}" on:click={() => { hintType = 'alphabets'; updateHintText(); }}>字母</button>
      <button class="hint-type-btn {hintType === 'radicals' ? 'selected' : ''}" on:click={() => { hintType = 'radicals'; updateHintText(); }}>倉頡碼</button>
    </div>
  </div>
  <div class="setting">
    <label class="checkbox-label">
      <input
        type="checkbox"
        bind:checked={showHintImage}
        on:change={updateHintText}
      />
      <span>顯示圖片</span>
    </label>
  </div>
</div>

<style>
  :global(:root) {
    --current-font-size: 7rem;
    --prev-next-font-size: 4rem;
    --small-font-size: 1rem;
    --translate-distance: 7rem;
    --translate-large: 9rem;
  }

  .container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: top;
    height: 100vh;
    font-family: Arial, sans-serif;
  }

  h1 {
    margin-bottom: 20px;
  }

  .question-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 6rem;
    margin: 3rem 0;
    overflow: hidden;
  }



  .question {
    position: absolute;
    font-weight: bold;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .question-svg {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .question-container.animate .question {
    transition: transform 0.2s ease, font-size 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  }

  .question.previous {
    transform: translateX(calc(-1 * var(--translate-distance)));
    color: grey;
    font-size: var(--prev-next-font-size);
  }

  .question.current {
    transform: translateX(0);
    font-size: var(--current-font-size);
  }

  .question.next {
    transform: translateX(var(--translate-distance));
    color: grey;
    font-size: var(--prev-next-font-size);
    opacity: 1;
  }

  .question-container.animate .current {
    transform: translateX(calc(-1 * var(--translate-distance)));
    color: grey;
    font-size: var(--prev-next-font-size);
  }

  .question-container.animate .next {
    transform: translateX(0);
    color: white;
    font-size: var(--current-font-size);
    opacity: 1;
  }

  .question-container.animate .previous {
    transform: translateX(calc(-1 * var(--translate-large)));
    font-size: var(--small-font-size);
    opacity: 0;

  }

  .question.next-next {
    transform: translateX(var(--translate-large));
    color: grey;
    font-size: var(--small-font-size);
    opacity: 0;
  }

  .question-container.animate .next-next {
    transform: translateX(var(--translate-distance));
    color: grey;
    font-size: var(--prev-next-font-size);
    opacity: 1;
  }

  .input-field {
    font-size: 2rem;
    padding: 10px;
    width: 200px;
    text-align: center;
    margin-bottom: 20px;
  }

  .hint {
    font-size: 1.5rem;
    margin-top: 10px;
    color: lightblue;
  }

  .hint-image {
    max-width: 30vw;
    height: auto;
    margin-top: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .feedback {
    font-size: 1.5rem;
    margin-top: 20px;
  }

  .warning {
    font-size: 1.5rem;
    margin-top: 10px;
    color: orange;
  }

  .correct {
    color: green;
  }

  .incorrect {
    color: red;
  }

  .category-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 0.625rem;
  }

  .category-btn {
    border: 1px solid;
    background: none;
    padding: 0.3125rem 0.625rem;
    margin: 0 0.3125rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .category-btn.unchecked {
    color: grey;
    border-color: grey;
  }

  .category-btn.checked {
    color: lightblue;
    border-color: lightblue;
  }

  .threshold-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 0.625rem;
  }

  .threshold-btn {
    border: 1px solid;
    background: none;
    padding: 0.3125rem 0.625rem;
    margin: 0 0.3125rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .threshold-btn.selected {
    color: lightblue;
    border-color: lightblue;
  }

  .threshold-btn:not(.selected) {
    color: grey;
    border-color: grey;
  }

  .hint-type-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 0.625rem;
  }

  .hint-type-btn {
    border: 1px solid;
    background: none;
    padding: 0.3125rem 0.625rem;
    margin: 0 0.3125rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .hint-type-btn.selected {
    color: lightblue;
    border-color: lightblue;
  }

  .hint-type-btn:not(.selected) {
    color: grey;
    border-color: grey;
  }

  .image-toggle-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 0.625rem;
  }

  .image-toggle-btn {
    border: 1px solid;
    background: none;
    padding: 0.3125rem 0.625rem;
    margin: 0 0.3125rem;
    cursor: pointer;
    font-size: 1rem;
  }

  .image-toggle-btn.selected {
    color: lightblue;
    border-color: lightblue;
  }

  .image-toggle-btn:not(.selected) {
    color: grey;
    border-color: grey;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    color: white;
    margin-bottom: 0.625rem;
  }

  .checkbox-label input[type="checkbox"] {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: lightblue;
    cursor: pointer;
  }

  .checkbox-label span {
    user-select: none;
  }

  .settings-btn {
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 102;
    width: 7em;
    height: 7em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-icon {
    width: 100%;
    height: 100%;
    object-fit:fill;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .settings-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 20rem;
    height: 100vh;
    background: rgb(61, 61, 61);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 101;
    padding: 1.25rem;
    box-sizing: border-box;
  }

  .settings-panel.open {
    transform: translateX(0);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .settings-header h2 {
    margin: 0;
  }


  .setting h3 {
    margin-bottom: 0.625rem;
  }

  @keyframes spin-clockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(180deg); }
  }

  @keyframes spin-anticlockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(-180deg); }
  }

  .settings-icon.spinning.clockwise {
    animation: spin-clockwise 0.3s ease;
    transform-origin: center;
  }

  .settings-icon.spinning.anticlockwise {
    animation: spin-anticlockwise 0.3s ease;
    transform-origin: center;
  }

  body {
    overflow-x: hidden;
  }

  /* Mobile responsive styles - using aspect ratio */
  @media (max-aspect-ratio: 1/1)  {
    :global(:root) {
      --current-font-size: 9.6rem;
      --prev-next-font-size: 4.8rem;
      --small-font-size: 2.4rem;
      --translate-distance: 9.6rem;
      --translate-large: 14.4rem;
    }

    .question-container {
      height: var(--current-font-size);
    }

    .settings-panel {
      left: 0;
      right: auto;
      width: 80vw;
      transform: translateX(-100%);
    }

    .settings-panel.open {
      transform: translateX(0);
    }
  }
</style>
