<script>
  import { onMount } from 'svelte';
  import cangjieData from './cangjie-practice.json';
  import deformationData from './cangjie-deformations.json';
  import radicalData from './cangjie-radicals.json';

  let basicChecked = $state(true);
  let deformationChecked = $state(false);
  let radicalChecked = $state(false);
  let selectedMode = $state('basic');
  let nextMode = $state('basic');
  let nextNextMode = $state('basic');
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

  let checkedModes = $derived([basicChecked ? 'basic' : null, deformationChecked ? 'deformation' : null, radicalChecked ? 'radical' : null].filter(Boolean));
  let currentData = $state(cangjieData);
  let codes = $state(Object.keys(cangjieData));

  function pickRandomCode() {
    previousQuestion = currentQuestion;
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
      currentQuestion = deformations[randomDefIndex];
    } else {
      currentQuestion = currentData[currentCode];
    }
    // Pre-make the next question
    if (nextQuestion === "") {
      const { question: nextQ, code: nextC, mode: nextM } = pickNewQuestion();
    nextQuestion = nextQ;
    nextCode = nextC;
    nextMode = nextM;
    }

    if (nextNextQuestion === "") {
    // Pre-make the next-next question
    const { question: nextNextQ, code: nextNextC, mode: nextNextM } = pickNewQuestion();
    nextNextQuestion = nextNextQ;
    nextNextCode = nextNextC;
    nextNextMode = nextNextM;
    }

    userInput = '';
    feedback = '';
    feedbackClass = '';
  }

  function pickNewQuestion() {
    if (checkedModes.length === 0) return { question: '', code: '', mode: 'basic' };
    const randomModeIndex = Math.floor(Math.random() * checkedModes.length);
    const mode = checkedModes[randomModeIndex];
    let data = cangjieData;
    if (mode === 'deformation') data = deformationData;
    else if (mode === 'radical') data = radicalData;
    const keys = Object.keys(data);
    const randomIndex = Math.floor(Math.random() * keys.length);
    const code = keys[randomIndex];
    let question;
    if (mode === 'deformation' || mode === 'radical') {
      const deformations = data[code];
      const randomDefIndex = Math.floor(Math.random() * deformations.length);
      question = deformations[randomDefIndex];
    } else {
      question = data[code];
    }
    return { question, code, mode };
  }

  function animateQuestions() {
    // Use the pre-made next question
    animate = true;
    setTimeout(() => {
      previousQuestion = currentQuestion;
      currentQuestion = nextQuestion;
      currentCode = nextCode;
      selectedMode = nextMode;
      // Pre-make the next question for the next round
      nextQuestion = nextNextQuestion;
      nextCode = nextNextCode;
      nextMode = nextNextMode;
      // Pre-make the next-next question for the next round
      const { question: nextNextQ, code: nextNextC, mode: nextNextM } = pickNewQuestion();
      nextNextQuestion = nextNextQ;
      nextNextCode = nextNextC;
      nextNextMode = nextNextM;
      feedback = '';
      feedbackClass = '';
      animate = false;
    }, 200);
    setTimeout(() => {
    handleInput();
    }, 240);
  }

  function checkInput() {
    const correctAnswer = currentCode;
    if (userInput.toUpperCase() === correctAnswer) {
      userInput = '';
      feedbackClass = 'correct';
      animateQuestions();
    } else {
      feedback = '錯誤，請再試一次。';
      feedbackClass = 'incorrect';
      userInput = '';
    }
  }

  function handleInput() {
    if (animate) return;
    const requiredLength = selectedMode === 'radical' ? 2 : 1;
    if (userInput.length >= requiredLength) {
      checkInput();
    }
  }

  function handleCheckboxChange() {
    pickRandomCode();
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
    <div class="question previous">{previousQuestion}</div>
    <div class="question current">{currentQuestion}</div>
    <div class="question next">{nextQuestion}</div>
    <div class="question next-next">{nextNextQuestion}</div>
  </div>
  <input
    bind:value={userInput}
    on:input={handleInput}
    bind:this={inputRef}
    placeholder="輸入倉頡碼"
    class="input-field"
  />
  <p class="feedback {feedbackClass}">{feedback}</p>
  <div class="mode-checkboxes">
    <label><input type="checkbox" bind:checked={basicChecked} on:change={handleCheckboxChange} /> 基本</label>
    <label><input type="checkbox" bind:checked={deformationChecked} on:change={handleCheckboxChange} /> 變形</label>
    <label><input type="checkbox" bind:checked={radicalChecked} on:change={handleCheckboxChange} /> 部首</label>
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

  .question-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 5vw;
    margin: 40px 0;
    /* overflow: hidden; */
  }



  .question {
    position: absolute;
    font-weight: bold;
    z-index: 0;
  }

  .question-container.animate .question {
    transition: transform 0.2s ease, font-size 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  }

  .question.previous {
    transform: translateX(-6vw);
    color: grey;
    font-size: 3vw;
  }

  .question.current {
    transform: translateX(0);
    font-size: 5vw;
  }

  .question.next {
    transform: translateX(6vw);
    color: grey;
    font-size: 3vw;
    opacity: 1;
  }

  .question-container.animate .current {
    transform: translateX(-6vw);
    color: grey;
    font-size: 3vw;
  }

  .question-container.animate .next {
    transform: translateX(0);
    color: white;
    font-size: 5vw;
    opacity: 1;
  }

  .question-container.animate .previous {
    transform: translateX(-10vw);
    font-size: 1vw;
    opacity: 0;

  }

  .question.next-next {
    transform: translateX(6vw);
    color: grey;
    font-size: 1vw;
    opacity: 0;
  }

  .question-container.animate .next-next {
    transform: translateX(6vw);
    color: grey;
    font-size: 3vw;
    opacity: 1;
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

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .question-container {
      height: 20vw;
    }

    .question.previous {
      transform: translateX(-20vw);
      font-size: 10vw;
    }

    .question.current {
      font-size: 20vw;
    }

    .question.next {
      transform: translateX(20vw);
      font-size: 10vw;
    }

    .question-container.animate .current {
      transform: translateX(-20vw);
      font-size: 10vw;
    }

    .question-container.animate .next {
      font-size: 20vw;
    }

    .question-container.animate .previous {
      transform: translateX(-30vw);
      font-size: 5vw;
    }

    .question.next-next {
      transform: translateX(20vw);
      font-size: 5vw;
    }

    .question-container.animate .next-next {
      transform: translateX(20vw);
      font-size: 10vw;
    }
  }
</style>
