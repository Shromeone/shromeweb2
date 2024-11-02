<script>
  import { run, handlers } from "svelte/legacy";
  // @ts-nocheck
  import { timeToChinese } from "$lib/utils/time-converter.js";
  import { passages } from "./passages.json";
  import { onDestroy, onMount, tick } from "svelte";
  import { charPoints, bonus } from "./bonus-points.json";
  import { timeLimits } from "./time-limits.json";
  import "./passages.json";
  const GameState = Object.freeze({
    START: 0,
    PLAY: 1,
    FINISH: 2,
  });
  const removeContentSpace = true;

  let content = $state(passages[0].content);

  let currentWordIndex = $state(0);
  let input = $state();

  let correctIndexes = $state([]);
  let wrongIndexes = $state([]);
  let startTime = 0;
  let gameState = $state(GameState.START);
  let timeTakenInMs = $state(0);
  let WPM = $state(0);
  let accuracy = $state(0);

  let timeElapsed = $state(0);
  let updateTimerInterval = null;
  let updateInfoInterval = null;
  let focusInputInterval = null;

  let inputBox = $state();
  let inputDisplay = $state();
  let typePrep = $state();
  let typeCancelled = false;
  let resultsScreen = $state();

  let settingsOpen = $state(false);

  let focused = $state(false);

  let isCompo = $state(false);
  let timeLimit = $state(0);

  let points = $state(0);
  let basePoints = $state(0);
  let accuracyPoint = $state(0);
  let speedPoint = $state(0);
  let timePoint = $state(0);
  let accuracyCutoff = $state(0);
  let accuracyMultiplier = $state(0);
  let speedCutoff = $state(0);
  let speedMultiplier = $state(0);
  let timeLeft = $state(0);

  let isTimeUp = false;
  const autoScrollPercentage = 0.3;
  const autoScrollOffset = 0.1;
  const inputBoxOffset = {
    x: 0,
    y: 20,
  };
  onMount(() => {
    setResultsPanelVisibility(false);
    // setSettingsVisibility(false);
    content = content.replace(/(?:\r\n|\r|\n)/g, "");
    if (removeContentSpace) content = content.replace(/\s/g, "");
    updateInputBoxPos();
    inputBox.focus();
    document.onkeydown = (e) => {
      tryPressEnterFocus(e);
      if (document.activeElement === inputBox) return;
      if (document.activeElement === typePrep) return;
      if (settingsOpen) return;
      e.preventDefault();
      console.log("focused");
      inputBox.focus();
    };
  });

  onDestroy(() => {
    document.onkeydown = null;
  });

  function tryFocus() {
    if (document.activeElement === inputBox) return;
    if (document.activeElement.localName === "button") return;
    inputBox.focus();
  }

  function tryPressEnterFocus(e) {
    if (document.activeElement !== typePrep) return;
    if (e.key !== "Enter") return;
    inputBox.focus();
  }

  function clearInput() {
    // console.log("cleared input");
    inputBox.innerHTML = "";
    input = "";
  }

  function cancelInput() {
    clearInput();
    typeCancelled = true;
  }

  function toHalfWidth(x) {
    if (x === "。") return ".";
    return x.replace(/[\uff01-\uff5e]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    });
  }

  function startTimer(e) {
    if (gameState !== GameState.START) return;
    isTimeUp = false;
    timeTakenInMs = 0;
    gameState = GameState.PLAY;
    startTime = Date.now();
    updateInfoInterval = setInterval(updateInfo, 2000);
    updateTimerInterval = setInterval(updateTimer, 100);
    focusInputInterval = setInterval(tryFocus, 300);
  }

  function updateTimer(time = -1) {
    if (time >= 0) {
      timeElapsed = time;
      return;
    }
    timeElapsed = Date.now() - startTime;

    const timeElapsedInSec = timeElapsed / 1000;
    if (timeLimit <= 0) return;
    if (timeElapsedInSec > timeLimit) {
      timeUp();
    }
  }

  function timeUp() {
    isTimeUp = true;
    finishGame();
  }

  async function compoUpdate(e) {
    isCompo = true;
  }

  function finishGame() {
    clearInterval(updateTimerInterval);
    clearInterval(updateInfoInterval);
    clearInterval(focusInputInterval);
    gameState = GameState.FINISH;
    console.log(wrongWords, content.length);
    updateInfo();
    calcFinalPoints();
    setResultsPanelVisibility(true);
  }

  function updateInfo() {
    timeTakenInMs = isTimeUp ? timeLimit * 1000 : Date.now() - startTime;
    const wrongs = wrongIndexes.length;
    const corrects = correctIndexes.length;
    const wordsTyped = corrects + wrongs;
    accuracy = 1 - wrongs / wordsTyped;
    WPM = ((wordsTyped * accuracy) / timeTakenInMs) * 60000;
  }

  function wordCorrect(word) {
    let correct = toHalfWidth(word) === toHalfWidth(currentWord);
    return correct;
  }

  function updateInputBoxPos() {
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    const rect = currentChar.getBoundingClientRect();
    inputBox.style.top = rect.top + scrollY + inputBoxOffset.y + "px";
    inputBox.style.left = rect.left + inputBoxOffset.x + "px";
    currentChar.appendChild(inputDisplay);
  }

  function keyDown(e) {
    typeCancelled = false;
    if (e.key === "Backspace") {
      tryDelete();
    }
  }

  function halfInput(e) {
    if (e.inputType === "deleteContentBackward") return;
    if (e.inputType === "insertCompositionText") {
      typeCancelled = false;
      return;
    }

    isCompo = false;
    validateInput(e.data);
    // console.log(e.inputType);
    setTimeout(clearInput, 0);
  }

  function updateScroll() {
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    const y = currentChar.getBoundingClientRect().top + scrollY;
    const percentage = Math.abs(scrollY - y) / innerHeight;
    // console.log(percentage);
    if (percentage < autoScrollPercentage) return;
    let scrY = scrollY;
    scroll({ top: y - autoScrollOffset * innerHeight, behavior: "smooth" });
    // scroll({ top: y - autoScrollOffset * innerHeight, behavior: "smooth" });
  }

  function validateInput(word) {
    if (gameState === GameState.FINISH) return;
    if (typeCancelled) {
      return;
    }
    for (let i = 0; i < word.length; i++) {
      currentWord = content[currentWordIndex];
      const char = word[i];
      if (!wordCorrect(char)) {
        wrongIndexes = [...wrongIndexes, currentWordIndex];
      } else {
        correctIndexes = [...correctIndexes, currentWordIndex];
      }
      currentWordIndex++;
      if (currentWordIndex >= content.length) {
        finishGame();
      }
    }
    updateScroll();
    clearInput();
    updateInputBoxPos();

    if (gameState !== GameState.FINISH) calcTempPoints();
  }

  function calcTempPoints() {
    points =
      correctIndexes.length * charPoints.correct +
      wrongIndexes.length * charPoints.wrong;
  }

  function calcFinalPoints() {
    basePoints =
      correctIndexes.length * charPoints.correct +
      wrongIndexes.length * charPoints.wrong;
    accuracyPoint = getAccuracyPoint();
    speedPoint = getSpeedPoint();
    timePoint = getTimePoint();
    points = basePoints + accuracyPoint + speedPoint + timePoint;

    console.log(`points: ${points}`);
  }

  function getTimePoint() {
    if (timeLimit <= 0) return 0;
    timeLeft = (timeLimit * 1000 - timeTakenInMs) / 1000;
    return Math.round(timeLeft * bonus.timeLeft);
  }

  function getSpeedPoint() {
    const speedPoints = Object.keys(bonus.speed);
    speedPoints.sort((a, b) => Number(b) - Number(a));
    for (let speed of speedPoints) {
      // console.log(WPM, Number(speed));
      if (WPM >= Number(speed)) {
        // console.log(`speed: ${bonus.speed[speed]}`);
        speedCutoff = speed;
        speedMultiplier = bonus.speed[speed];
        return Math.round(basePoints * speedMultiplier);
      }
    }
    return 0;
  }

  function getAccuracyPoint() {
    const accuracyPoints = Object.keys(bonus.accuracy);
    accuracyPoints.sort((a, b) => Number(b) - Number(a));
    for (let accu of accuracyPoints) {
      // console.log(accuracy * 100, Number(accu));
      if (accuracy * 100 >= Number(accu)) {
        // console.log(`accu: ${bonus.accuracy[accu]}`);
        accuracyCutoff = accu;
        accuracyMultiplier = bonus.accuracy[accu];
        return Math.round(basePoints * accuracyMultiplier);
      }
    }

    return 0;
  }

  function tryDelete() {
    if (gameState === GameState.FINISH) return;
    if (currentWordIndex === 0) return;
    currentWordIndex--;
    updateInputBoxPos();
    wrongIndexes = wrongIndexes.filter((x) => x !== currentWordIndex);
    correctIndexes = correctIndexes.filter((x) => x !== currentWordIndex);
  }

  async function compoEnd(e) {
    if (gameState !== GameState.PLAY) return;
    if (!e.data) return;
    validateInput(e.data);
  }

  function restart() {
    gameState = GameState.START;
    timeTakenInMs = 0;
    wrongIndexes = [];
    correctIndexes = [];
    currentWordIndex = 0;
    // input = "";
    clearInput();
    inputBox.focus();
    clearInterval(updateTimerInterval);
    clearInterval(updateInfoInterval);
    clearInterval(focusInputInterval);
    updateTimer(0);
    updateInputBoxPos();
    updateScroll();
  }

  function setResultsPanelVisibility(show = false) {
    console.log(resultsScreen);
    if (show) {
      resultsScreen.classList.remove("hidden");
    } else {
      resultsScreen.classList.add("hidden");
    }
  }

  function setSettingsVisibility(show = false) {
    settingsOpen = show;
  }
  let correctWords = $derived(correctIndexes.length);
  let wrongWords = $derived(wrongIndexes.length);
  let currentWord = $derived(content[currentWordIndex]);
  let showInputDisplay = $derived(isCompo && input !== "");
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="background">
  {#if gameState !== GameState.PLAY}
    <input
      class="type-prep"
      type="text"
      placeholder="喺度調整輸入法，準備好就撳Enter進入測試"
      bind:this={typePrep}
    />
    <button class="round-btn" onclick={() => setSettingsVisibility(true)}
      >設定</button
    >
  {/if}
  <div class="info-bar">
    {#if gameState !== 3}
      {#if timeLimit > 0}
        <p>剩餘時間: {Math.ceil(timeLimit - timeElapsed / 1000)}秒</p>
      {/if}
      <p>時間: {(timeTakenInMs / 1000).toFixed(2) + "s"}</p>
      <p>速度: {WPM.toFixed(1)}WPM</p>
      <p>準確度: {(accuracy * 100).toFixed(1) + "%"}</p>
      <p>正確: {correctWords}字</p>
      <p>錯誤: {wrongWords}字</p>
      <p>分數: {points}</p>
    {/if}
  </div>
  <input
    type="text"
    id="type-input"
    placeholder={gameState === GameState.PLAY ? "" : "在這裡開始打字"}
    oncompositionupdate={compoUpdate}
    oncompositionend={compoEnd}
    oninput={handlers(startTimer, halfInput)}
    onkeydown={keyDown}
    onfocus={() => (focused = true)}
    onfocusout={() => (focused = false)}
    bind:value={input}
    bind:this={inputBox}
  />
  <div
    id="input-display"
    class={showInputDisplay ? "" : "hidden"}
    bind:this={inputDisplay}
  >
    {showInputDisplay ? input : ""}
  </div>
  <div class="test-content">
    {#each content as char, index (index)}
      <div class="char" id="char-{index}" onmouseenter={cancelInput}>
        <a
          href={"https://www.hkcards.com/cj/cj-char-" + char + ".html"}
          target="_blank"
        >
          {#if index === currentWordIndex}
            <div class={focused ? "" : "inactive"}>
              <div class="current-char">
                <p>{char}</p>
              </div>
            </div>
          {:else if wrongIndexes.includes(index)}
            <p class="wrong">{char}</p>
          {:else if correctIndexes.includes(index)}
            <p class="correct">{char}</p>
          {:else}
            <p>{char}</p>
          {/if}
        </a>
      </div>
    {/each}
  </div>

  {#if gameState === GameState.PLAY}
    <button class="round-btn" onmouseenter={cancelInput} onclick={finishGame}
      >結束遊戲</button
    >
  {/if}
  {#if gameState !== GameState.START}
    <button class="round-btn" onmouseenter={cancelInput} onclick={restart}
      >重新開始</button
    >
  {/if}
  {#if gameState === GameState.PLAY}
    <div style="height: 100vh"></div>
  {/if}
  {#if gameState === GameState.FINISH}
    <button class="round-btn" onclick={() => setResultsPanelVisibility(true)}
      >查看成績</button
    >
  {/if}

  <div class="settings-screen {settingsOpen ? '' : 'hidden'}">
    <div class="settings-panel">
      <h2>設定</h2>
      <div class="passage-select">
        <p>文章</p>
        <select bind:value={content} id="passage" placeholder="選擇文章">
          {#each passages as passage}
            <option value={passage.content}>{passage.title}</option>
          {/each}
        </select>
      </div>
      <textarea bind:value={content} name="content" id="" cols="30" rows="10"
      ></textarea>
      <div class="time-select">
        <p>時間限制</p>
        <select bind:value={timeLimit} id="time" placeholder="">
          <option value={0}>無時限</option>
          {#each timeLimits as limit}
            <option value={limit}>{timeToChinese(limit)}</option>
          {/each}
        </select>
      </div>
      <button onclick={() => setSettingsVisibility(false)}>關閉</button>
    </div>
  </div>

  <div class="results-screen" bind:this={resultsScreen}>
    <div class="results-panel">
      <div class="results-info">
        <h2>成績</h2>
        <p>準確度：{(accuracy * 100).toFixed(1) + "%"}</p>
        <p>速度：{WPM.toFixed(1)}WPM</p>
        <p>正確：{correctIndexes.length}字</p>
        <p>錯誤：{wrongIndexes.length}字</p>
        <p>底分：{basePoints}</p>

        <p>總分：{points}</p>
        <p>
          正確加分：{correctIndexes.length * charPoints.correct} ({correctIndexes.length}字*{charPoints.correct}分/字)
        </p>
        <p>
          錯誤扣分：{wrongIndexes.length * charPoints.wrong} ({wrongIndexes.length}字*{charPoints.wrong}分/字)
        </p>
        <p>
          準確度加分：{accuracyPoint}
          {#if accuracyPoint > 0}
            ({basePoints} * {Math.round(accuracyMultiplier * 100) + "%"}) ({accuracyCutoff}%或以上)
          {/if}
        </p>
        <p>
          速度加分：{speedPoint}
          {#if speedPoint > 0}
            ({basePoints} * {Math.round(speedMultiplier * 100) + "%"}) ({speedCutoff}WPM或以上)
          {/if}
        </p>
        <p>
          時間加分：{timePoint}
          {#if timePoint > 0}
            ({timeLeft}秒 * {bonus.timeLeft})
          {/if}
        </p>
      </div>
      <div class="panel-buttons">
        <button onclick={() => setResultsPanelVisibility(false)}>關閉</button>
        <button
          onclick={() => {
            setResultsPanelVisibility(false);
            restart();
          }}>嚟多次</button
        >
      </div>
    </div>
  </div>
</div>

<style>
  .passage-select,
  .time-select {
    display: flex;
    align-items: center;
    gap: 3em;
  }

  .passage-select select,
  .time-select select {
    flex: 1;
  }

  .results-screen,
  .settings-screen {
    opacity: 100%;
    position: fixed;
    display: flex;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.258);
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }

  .results-panel {
    display: flex;
    flex-direction: column;
    gap: 100px;
    background-color: rgb(91, 97, 148);
    width: 60%;
    padding: 1.5em 3em 1em 3em;
    border-radius: 2rem;
    border: 3px dashed rgb(38, 38, 84);
    box-shadow: 0px 0px 30px black;
    justify-content: center;
  }

  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background-color: rgb(91, 97, 148);
    width: 60%;
    padding: 1.5em 3em 1em 3em;
    border-radius: 2rem;
    border: 3px dashed rgb(38, 38, 84);
    box-shadow: 0px 0px 30px black;
    justify-content: center;
  }

  .settings-panel button {
    margin-top: 4rem;
  }

  .results-panel h2,
  .settings-panel h2 {
    color: white;
    text-align: center;
    font-size: 2.5rem;
    margin: 0;
    margin-bottom: 1em;
  }

  .results-panel p {
    margin: 0;
    margin-bottom: 4px;
  }
  .results-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .panel-buttons {
    display: flex;
    justify-content: space-around;
  }

  .panel-buttons button {
    width: 30%;
    border: none;
    border-radius: 3em;
    padding: 1em 3em;
  }

  .panel-buttons button:hover {
    opacity: 70%;
  }
  body {
    padding: 0;
    margin: 0;
    /* background-color: black; */
  }

  .background {
    background-color: transparent;
    min-height: 100vh;
    width: 100%;
  }

  .info-bar {
    display: flex;
    gap: 20px;
  }

  .test-content {
    padding: 3% 2%;
  }

  .test-content p {
    display: inline-block;
    font-family: "Noto Serif TC";
    font-size: max(18px, 2.3vw);
    margin: max(4px, 0.3vw);
    width: max(24px, 3vw);
    height: max(24px, 3vw);
    border: 1px solid rgba(255, 255, 255, 0.416);
    text-align: center;
    vertical-align: middle;
  }

  .char {
    display: inline-block;
    position: relative;
  }

  .test-content .wrong {
    color: red;
    border: 1px solid rgb(194, 143, 143);
  }

  .correct {
    color: rgb(101, 196, 101);
  }

  #type-input {
    position: absolute;
    color: white;
    left: 0;
    font-size: 1rem;
    height: 2rem;
    background-color: transparent;
    border: none;
    overflow: hidden;
    width: 0.1px;
  }

  #type-input:focus {
    border: none;
    outline: 0;
    caret-color: rgba(0, 0, 0, 0);
  }

  .hidden {
    visibility: hidden;
    opacity: 0%;
  }

  #input-display {
    z-index: 3;
    white-space: nowrap;
    color: white;
    position: absolute;
    background-color: rgb(85, 85, 85);
    text-align: left;
    padding: 0.2rem 0.2rem;
    opacity: 100%;
  }

  #input-display:blank {
    display: none;
  }
  .current-char {
    display: inline-block;
    position: relative;
  }

  .current-char p {
    color: skyblue;
    border: 1px solid skyblue;
  }

  .inactive p {
    border-color: grey;
    color: grey;
  }

  p {
    color: white;
  }

  .type-prep {
    font-size: 2rem;
    width: 80%;
    display: inline-block;
  }

  .round-btn {
    padding: 1em;
    font-size: 1rem;
    border-radius: 1rem;
    border: none;
  }

  .round-btn:hover {
    opacity: 80%;
  }
</style>
