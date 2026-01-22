<script>
  import { run, handlers } from "svelte/legacy";
  // @ts-nocheck
  import { timeToChinese } from "$lib/utils/time-converter.js";
  import { passages } from "./passages.json";
  import { onDestroy, onMount, tick } from "svelte";
  import { charPoints, bonus } from "./bonus-points.json";
  import { timeLimits } from "./time-limits.json";
  import settingsIcon from '$lib/images/settings-svgrepo-com.svg';
  import "./passages.json";
  import {cangjieMap} from '$lib/data/cangjiedata.js';

  // let cangjieMap = {};

  const cangjieRadicals = {
    'a': '日',
    'b': '月',
    'c': '金',
    'd': '木',
    'e': '水',
    'f': '火',
    'g': '土',
    'h': '竹',
    'i': '戈',
    'j': '十',
    'k': '大',
    'l': '中',
    'm': '一',
    'n': '弓',
    'o': '人',
    'p': '心',
    'q': '手',
    'r': '口',
    's': '尸',
    't': '廿',
    'u': '山',
    'v': '女',
    'w': '田',
    'x': '難',
    'y': '卜',
    'z': '重'
  };



  const GameState = Object.freeze({
    START: 0,
    PLAY: 1,
    FINISH: 2,
  });
  const removeContentSpace = false;

  let content = $state(
    passages[Math.round(Math.random() * (Object.keys(passages).length - 1))]
      .content
  );

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
  let isSpinning = $state(false);
  let spinDirection = $state('clockwise');

  let focused = $state(false);
  let searchMode = $state(false);

  let isCompo = $state(false);
  let justComposed = $state(false);
  let compositionData = $state("");
  let lastProcessedInput = $state("");
  let compositionStartTime = $state(0);
  let compositionBackspaceLock = false;
  let timeLimit = $state(60);
  let fontSelect = $state("LXGW WenKai TC");

  let autoHintTimeout = null;
  let autoHintShown = $state(false);
  let autoHintMode = $state('timed');
  let autoHintTimeoutSeconds = $state(5);
  let revealInterval = null;

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

  let cangjieCode = $state('');
  let revealedChars = $state(0);
  let cangjieChars = $derived(getChineseCangjieCode(cangjieCode).split(''));
  let clickedCharIndex = $state(null);
  let hintsContainer = $state();
  // let hintCharIndex = $derived(clickedCharIndex !== null ? clickedCharIndex : (autoHintShown ? currentWordIndex : null));
  let hintCharIndex = $state(0);
  let globalClickState = $state(0);


  let isTimeUp = false;

  const autoScrollPercentage = 0.3;
  const autoScrollOffset = 0.1;
  const inputBoxOffset = {
    x: 0,
    y: 20,
  };
  onMount(() => {
    // initCangjieMap();
    setResultsPanelVisibility(false);
    // setSettingsVisibility(false);
    content = content.replace(/(?:\r\n|\r|\n)/g, "");
    if (removeContentSpace) content = content.replace(/\s/g, "");
    updateInputBoxPos();
    inputBox.focus();
    document.onclick = (e) => {
tryPressEnterFocus(e);
      if (document.activeElement === inputBox) return;
      if (document.activeElement === typePrep) return;
      if (settingsOpen || gameState === GameState.START) return;
      // Don't focus input if clicking on a link or character
      if (e.target.closest('a') || e.target.closest('.char')) return;
      e.preventDefault();
      console.log("focused");
      inputBox.focus();};
    document.onkeydown = (e) => {
      tryPressEnterFocus(e);
      if (document.activeElement === inputBox) return;
      if (document.activeElement === typePrep) return;
      if (settingsOpen) return;
      if (e.target.closest('a') || e.target.closest('.char')) return;
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
      if (settingsOpen) return;
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
    // Don't reset lastProcessedInput here - it should persist across input clears
  }
  function adjustHintsPosition(event) {
    const charElement = event.currentTarget;
    const hintsContainer = charElement.querySelector(".hints-container");
    const charRect = charElement.getBoundingClientRect();
    const hintsWidth = 336; // 21rem * 16px (assuming 1rem = 16px)
    const viewportWidth = window.innerWidth;

    // Reset position
    hintsContainer.style.right = "";
    hintsContainer.style.left = "";

    // Check if there's enough space to the right
    if (charRect.right + hintsWidth <= viewportWidth) {
      hintsContainer.style.left = "0";
    } else {
      // Not enough space to the right, position to the left
      hintsContainer.style.right = "0";
    }
  }
  function cancelInput() {
    clearInput();
    typeCancelled = true;
  }

  function onMouseEnterChar(e) {
    if (!searchMode) return;
    cancelInput();
    adjustHintsPosition(e);
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
    focusInputInterval = setInterval(tryFocus, 1000);
    searchMode = false; // Disable search mode when typing starts
    if (autoHintMode === 'always') {
      autoHintShown = true;
      startRevealInterval();
    }
    handleAutoHintLogic();
    // Scroll to position the first character at 30% from top
    setTimeout(() => updateScroll(), 100);
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

  function compoStart(e) {
  isCompo = true;
  compositionData = e.data || "";
  compositionStartTime = Date.now();
  lastProcessedInput = "";

  // 🔒 Prevent committed-character deletion during composition
  compositionBackspaceLock = true;
}

  async function compoUpdate(e) {
    isCompo = true;
    compositionData = e.data || "";
  }

  function finishGame() {
    clearInterval(updateTimerInterval);
    clearInterval(updateInfoInterval);
    clearInterval(focusInputInterval);
    clearTimeout(autoHintTimeout);
    autoHintTimeout = null;
    clearInterval(revealInterval);
    revealInterval = null;
    autoHintShown = false;
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
    updateCangjieCode();
    if (!currentChar) return;
    const rect = currentChar.getBoundingClientRect();
    inputBox.style.top = rect.top + scrollY + inputBoxOffset.y + "px";
    inputBox.style.left = rect.left + inputBoxOffset.x + "px";
    currentChar.appendChild(inputDisplay);
    // Update scroll position after updating input box position
    if (gameState === GameState.PLAY) {
      updateScroll();
    }
  }

  function keyDown(e) {
  typeCancelled = false;

  if (e.key !== "Enter" && e.key !== "Escape" && !e.ctrlKey && !e.metaKey) {
    searchMode = false;
  }

  if (e.key === "Backspace") {

    // ✅ HARD STOP: Never delete committed characters
    // if this Backspace is part of IME composition
    if (isCompo || compositionBackspaceLock) {
      return;
    }

    // ✅ Safe to delete only when fully idle
    if (!inputBox?.value) {
      tryDelete();
    }
  }

  if (e.key === 'Shift') {
    // Simulate clicking on the character with hints, or current character if no hints
    const targetIndex = hintCharIndex !== null ? hintCharIndex : currentWordIndex;
    const char = content[targetIndex];
    const nextState = (globalClickState + 1) % 4;
    globalClickState = nextState;

    if (nextState === 1) {
      clickedCharIndex = targetIndex;
      updateCangjieCodeForChar(char);
    } else if (nextState === 2) {
      revealedChars = cangjieChars.length;
    } else if (nextState === 3) {
      // hyperlink active
    } else if (nextState === 0) {
      clickedCharIndex = null;
    }
  }
}

  function halfInput(e) {
    clickedCharIndex = null; // Reset clicked hint on any input
    globalClickState = 0; // Reset click states on any input

    // Handle different input types
    if (e.inputType === "deleteContentBackward") {
      // If deleting during composition, don't process it
      // Let the IME handle the deletion of composing characters
      if (isCompo) {
        // Update composition data if available
        if (inputBox) {
          compositionData = inputBox.value || "";
        }
        return;
      }
      // If we just finished composition (within 200ms), don't process deletion
      const timeSinceComposition = Date.now() - compositionStartTime;
      if (timeSinceComposition < 200) {
        return;
      }
      return;
    }

    if (e.inputType === "insertCompositionText") {
      typeCancelled = false;
      return;
    }

    // Skip processing if we just handled a composition end
    // This prevents duplicate character registration on Mac
    // Check both the flag and if the data matches what we just processed
    if (justComposed) {
      // Double check: if the input data matches what we just processed, skip it
      if (!e.data || e.data === lastProcessedInput) {
        justComposed = false;
        isCompo = false;
        setTimeout(clearInput, 0);
        return;
      }
      // If data is different, it's a new input, reset the flag
      justComposed = false;
    }

    // Don't process if this input was already processed (duplicate prevention)
    if (e.data && e.data === lastProcessedInput) {
      setTimeout(clearInput, 0);
      return;
    }

    isCompo = false;
    searchMode = false; // Disable search mode when typing

    // Only process if we have data and it's not a duplicate
    if (e.data && e.data !== lastProcessedInput) {
      lastProcessedInput = e.data;
      validateInput(e.data);
    }

    setTimeout(clearInput, 0);
  }

  function updateScroll() {
    if (gameState !== GameState.PLAY) return;
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    if (!currentChar) return;
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const charRect = currentChar.getBoundingClientRect();
      const charTop = charRect.top + scrollY;
      const targetPosition = window.innerHeight * 0.3; // 30% from top
      const currentPosition = charRect.top; // Current position relative to viewport
      
      // Calculate the scroll position needed to place the character at 30% from top
      const scrollTarget = charTop - targetPosition;
      
      // Only scroll if the character is not already at the target position (with a small threshold)
      if (Math.abs(currentPosition - targetPosition) > 10) {
        scroll({ top: scrollTarget, behavior: "smooth" });
      }
    });
  }

  function updateCangjieCode() {
    hintCharIndex = currentWordIndex;
    moveHintsToChar(hintCharIndex);
    cangjieCode = currentWord ? cangjieMap[currentWord] || '' : '';
    revealedChars = 0;
    console.log("update cangjie code");
    clearInterval(revealInterval);
    revealInterval = null;
  }

  function updateCangjieCodeForChar(char) {
    moveHintsToChar(hintCharIndex);
    cangjieCode = cangjieMap[char] || '';
    revealedChars = 0;
    console.log("update cangjie code for char");
    clearInterval(revealInterval);
    revealInterval = null;
  }

  function moveHintsToChar(index) {
    if (!hintsContainer) return;
    const charElement = document.querySelector(`#char-${index}`);
    if (charElement) {
      charElement.appendChild(hintsContainer);
    }
  }

  // $effect(() => {
  //   if (hintCharIndex !== null) {
  //     moveHintsToChar(hintCharIndex);
  //     const char = content[hintCharIndex];
  //     updateCangjieCodeForChar(char);
  //     // Start reveal interval when hints move to current character
  //     if (hintCharIndex === currentWordIndex && autoHintShown) {
  //       startRevealInterval();
  //     }
  //   }
  // });

  $effect(() => {
    if (autoHintShown && hintCharIndex === currentWordIndex) {
      if (globalClickState === 0) {
        globalClickState = 1;
      }
    }
  });

  function startRevealInterval() {
    if (revealedChars >= cangjieChars.length) {
      globalClickState = 2; // Set as second click when already full
      return;
    }
    if (revealInterval) clearInterval(revealInterval);
    revealInterval = setInterval(() => {
      revealedChars++;
      console.log(`add reveal char to ${revealedChars}`);
      if (revealedChars >= cangjieChars.length) {
        clearInterval(revealInterval);
        revealInterval = null;
        globalClickState = 2; // Set as second click when fully revealed
      }
    }, 5000);
  }
    let hadWrongInput = $state(false);
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
        hadWrongInput = true;
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
    updateCangjieCode();

    if (gameState !== GameState.FINISH) calcTempPoints();
    handleAutoHintLogic();
  }
  
  function handleAutoHintLogic() {
    
    // Auto-hint logic
    if (!hadWrongInput) {
      // Only reset timer on correct input
      if (autoHintTimeout) clearTimeout(autoHintTimeout);
      autoHintShown = autoHintMode === 'always';
      if (autoHintMode === 'timed' && gameState === GameState.PLAY && currentWordIndex < content.length) {
        autoHintTimeout = setTimeout(() => {
          autoHintShown = true;
          startRevealInterval();

        }, autoHintTimeoutSeconds * 1000);
      }
    } else {
      if (autoHintShown) {
        startRevealInterval();
      }
      // On wrong input, don't reset timer, but ensure it's running if not already
      if (autoHintMode === 'timed' && gameState === GameState.PLAY && currentWordIndex < content.length) {
        autoHintTimeout = setTimeout(() => {
          autoHintShown = true;
          startRevealInterval();

        }, autoHintTimeoutSeconds * 1000);
      }
      // For always mode, autoHintShown is already set
    }
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
  isCompo = false;

  // ✅ Keep lock briefly to absorb Mac's delayed Backspace events
  setTimeout(() => {
    compositionBackspaceLock = false;
  }, 200);

  if (gameState !== GameState.PLAY) {
    compositionData = "";
    return;
  }

  if (!e.data) {
    compositionData = "";
    return;
  }

  const dataToProcess = e.data;

  if (dataToProcess === lastProcessedInput) {
    compositionData = "";
    return;
  }

  searchMode = false;
  justComposed = true;
  lastProcessedInput = dataToProcess;

  validateInput(dataToProcess);
  compositionData = "";

  setTimeout(() => {
    justComposed = false;
  }, 150);
}

  function restart() {
    gameState = GameState.START;
    timeTakenInMs = 0;
    wrongIndexes = [];
    correctIndexes = [];
    currentWordIndex = 0;
    // input = "";
    clearInput();
    lastProcessedInput = ""; // Reset on restart
    isCompo = false;
    compositionData = "";
    justComposed = false;
    compositionStartTime = 0;
    inputBox.focus();
    clearInterval(updateTimerInterval);
    clearInterval(updateInfoInterval);
    clearInterval(focusInputInterval);
    clearTimeout(autoHintTimeout);
    autoHintTimeout = null;
    clearInterval(revealInterval);
    revealInterval = null;
    autoHintShown = false;
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

  function initCangjieMap() {
    const lines = cangjieData.split('\n');
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        parts.pop();
        for (let i = 1; i < parts.length; i++)
        cangjieMap[parts[i]] = parts[0];
      }
    }
  }

  function getChineseCangjieCode(code) {
    if (!code) return '';
    return code.split('').map(letter => cangjieRadicals[letter.toLowerCase()] || letter).join('');
  }

  function handleSettingsToggle() {
    const isOpening = !settingsOpen;
    spinDirection = isOpening ? 'anticlockwise' : 'clockwise';
    isSpinning = true;
    settingsOpen = !settingsOpen;
    setTimeout(() => isSpinning = false, 300);
  }
  let correctWords = $derived(correctIndexes.length);
  let wrongWords = $derived(wrongIndexes.length);
  let currentWord = $derived(content[currentWordIndex]);
  let showInputDisplay = $derived(isCompo && input !== "");
</script>

<svelte:head>
  <!-- <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC&display=swap"
    rel="stylesheet"
  /> -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&family=Noto+Serif+HK:wght@200..900&display=swap"
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
  {/if}
  <div class="info-bar {gameState === GameState.PLAY ? 'fixed-top' : ''}">
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
  <div id="start-partition"></div>
  <input
    type="text"
    id="type-input"
    placeholder={gameState === GameState.PLAY ? "" : ""}
    oncompositionupdate={compoUpdate}
    oncompositionstart={compoStart}
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
  <div class="test-content {gameState === GameState.PLAY ? 'with-fixed-info' : ''}" style="--char-font: {fontSelect}">
    {#each content as char, index (index)}
      <div
        class="char {searchMode ? 'search-mode-active' : ''}"
        id="char-{index}"
        onmouseenter={onMouseEnterChar}
        onclick={() => {
          if (hintCharIndex !== index) {
            // Different character clicked - set state to 1 and move hints
            globalClickState = 1;
            clickedCharIndex = index;
            hintCharIndex = index;
            updateCangjieCodeForChar(char);
          } else {
            // Same character clicked - advance state
            const nextState = (globalClickState + 1) % 4; // 0, 1, 2, 3, then back to 0
            globalClickState = nextState;

            if (nextState === 1) {
              // First click: show hints
              clickedCharIndex = index;
              updateCangjieCodeForChar(char);
            } else if (nextState === 2) {
              // Second click: show all cangjie code
              revealedChars = cangjieChars.length;
            } else if (nextState === 3) {
              // Third click: hyperlink is now active
            } else if (nextState === 0) {
              // Fourth click: reset
              clickedCharIndex = null;
            }
          }
        }}
      >
        {#if searchMode || (hintCharIndex === index && globalClickState >= 2)}
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
        {:else}
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
        {/if}
      </div>
    {/each}
  </div>

  <div class="hints-container" class:visible={globalClickState != 0} bind:this={hintsContainer}>
    <img
      class="hints-picture"
      src={hintCharIndex !== null ? `https://www.hkcards.com/img/cj/${content[hintCharIndex]}.png` : ''}
    />
    <p id="cangjie-code">
      {#each [...cangjieChars, ...Array(Math.max(0, 5 - cangjieChars.length)).fill('')] as char, i}
        <span>{i < revealedChars ? char : ''}</span>
      {/each}
    </p>
  </div>

  {#if gameState === GameState.PLAY}
    <div style="height: 100vh"></div>
  {/if}

  <div class="bottom-left-buttons">
    <button 
      class="search-mode-btn {searchMode ? 'active' : ''}" 
      onclick={() => searchMode = !searchMode}
      title={searchMode ? "關閉搜尋模式" : "開啟搜尋模式"}
    >
      {searchMode ? "搜尋模式: 開啟" : "搜尋模式: 關閉"}
    </button>
    

    
    {#if gameState === GameState.PLAY}
      <button class="bottom-btn" onmouseenter={cancelInput} onclick={finishGame}
        >結束遊戲</button
      >
    {/if}
    
    {#if gameState !== GameState.START}
      <button class="bottom-btn" onmouseenter={cancelInput} onclick={restart}
        >重新開始</button
      >
    {/if}
    
    {#if gameState === GameState.FINISH}
      <button class="bottom-btn" onclick={() => setResultsPanelVisibility(true)}
        >查看成績</button
      >
    {/if}
  </div>

  {#if settingsOpen}
  <div class="overlay" onclick={handleSettingsToggle}></div>
  {/if}

  <div class="settings-panel" class:open={settingsOpen}>
    <div class="settings-header">
      <h2>設定</h2>
    </div>
    <div class="setting">
      <h3>文章</h3>
      <select bind:value={content} id="passage" placeholder="選擇文章">
        {#each passages as passage}
          <option value={passage.content}>{passage.title}</option>
        {/each}
      </select>
    </div>
    <div class="setting">
      <textarea bind:value={content} name="content" id="" cols="80" rows="10"></textarea>
    </div>
    <div class="setting">
      <h3>時間限制</h3>
      <select bind:value={timeLimit} id="time" placeholder="">
        <option value={0}>無時限</option>
        {#each timeLimits as limit}
          <option value={limit}>{timeToChinese(limit)}</option>
        {/each}
      </select>
    </div>
    <div class="setting">
      <h3>字體</h3>
      <select bind:value={fontSelect} id="font-select" placeholder="">
        <option value={"LXGW WenKai TC"}>霞鶩體</option>
        <option value={"Noto Serif HK"}>Noto Sans</option>
      </select>
    </div>
    <div class="setting">
      <h3>自動提示</h3>
      <select bind:value={autoHintMode} id="auto-hint-mode">
        <option value="always">總是顯示</option>
        <option value="timed">定時顯示</option>
      </select>
      {#if autoHintMode === 'timed'}
        <input type="range" min="1" max="20" bind:value={autoHintTimeoutSeconds} id="auto-hint-timeout" />
        <span>{autoHintTimeoutSeconds}秒</span>
      {/if}
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

  <button class="settings-btn" onclick={handleSettingsToggle}>
    <img src={settingsIcon} alt="settings" class="settings-icon {isSpinning ? 'spinning' : ''} {spinDirection}" />
  </button>
</div>

<style>
  #start-partition {
    height: 25vh;}
  .passage-select,
  .time-select,
  .auto-hint-select {
    display: flex;
    align-items: center;
    gap: 3em;
  }

  .passage-select select,
  .time-select select,
  .auto-hint-select select {
    flex: 1;
  }

  .auto-hint-select input[type="range"] {
    flex: 1;
  }

  .auto-hint-select span {
    color: white;
    font-size: 1rem;
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

  .results-screen {
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
    z-index: 2000;
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
    position: fixed;
    top: 0;
    right: 0;
    width: 50vw;
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
    overflow-x: hidden;
  }

  .background {
    background-color: transparent;
    min-height: 100vh;
    width: 100%;
    overflow-x: hidden;
  }

  .info-bar {
    display: flex;
    gap: 20px;
  }

  .info-bar.fixed-top {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.9);
    padding: 10px 20px;
    z-index: 999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .test-content {
    padding: 3% 2%;
  }

  .test-content.with-fixed-info {
    padding-top: calc(3% + 60px);
  }

  .test-content p {
    color: lightgrey;
    display: inline-block;
    font-family: var(--char-font);
    /* font-family: ""; */
    font-size: max(18px, 3.5vh);
    margin: max(4px, 0.3vw);
    width: max(20px, 4vh);
    height: max(20px, 4vh);
    /* border: 1px solid rgba(255, 255, 255, 0.416); */
    text-align: center;
    vertical-align: middle;
  }

  .char {
    display: inline-block;
    position: relative;
  }

  .test-content .wrong {
    color: rgb(221, 59, 59);
    /* border: 1px solid rgb(194, 143, 143); */
  }

  .test-content .correct {
    color: rgb(101, 196, 101);
  }

  #type-input {
    position: absolute;
    color: white;
    left: 0;
    font-size: 3rem;
    height: 5rem;
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
    /* border: 1px solid skyblue; */
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


  .char:hover .hints-container {
    opacity: 0%;
  }

  .char.search-mode-active:hover .hints-container {
    opacity: 100%;
  }

  .bottom-left-buttons {
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 1000;
    flex-wrap: wrap;
  }

  .search-mode-btn {
    padding: 0.8em 1.5em;
    font-size: 1rem;
    border-radius: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.5);
    background-color: rgba(91, 97, 148, 0.8);
    color: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .search-mode-btn:hover {
    background-color: rgba(91, 97, 148, 1);
    border-color: rgba(255, 255, 255, 0.8);
  }

  .search-mode-btn.active {
    background-color: rgba(101, 196, 101, 0.8);
    border-color: rgb(101, 196, 101);
  }

  .search-mode-btn.active:hover {
    background-color: rgba(101, 196, 101, 1);
  }

  .bottom-btn {
    padding: 0.8em 1.5em;
    font-size: 1rem;
    border-radius: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.5);
    background-color: rgba(91, 97, 148, 0.8);
    color: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .bottom-btn:hover {
    background-color: rgba(91, 97, 148, 1);
    border-color: rgba(255, 255, 255, 0.8);
    opacity: 80%;
  }

  /* Mobile styles for bottom buttons - using aspect ratio */
  @media (max-aspect-ratio: 1/1) and (max-width: 768px) {
    /* Portrait mobile */
    .bottom-left-buttons {
      bottom: 10px;
      left: 10px;
      gap: 5px;
    }

    .search-mode-btn {
      padding: 0.6em 1.2em;
      font-size: 0.9rem;
    }

    .bottom-btn {
      padding: 0.6em 1.2em;
      font-size: 0.9rem;
    }
  }

  @media (min-aspect-ratio: 1/1) and (max-width: 896px) and (max-height: 414px) {
    /* Landscape mobile */
    .bottom-left-buttons {
      bottom: 10px;
      left: 10px;
      gap: 5px;
    }

    .search-mode-btn {
      padding: 0.6em 1.2em;
      font-size: 0.9rem;
    }

    .bottom-btn {
      padding: 0.6em 1.2em;
      font-size: 0.9rem;
    }
  }

  @media (max-aspect-ratio: 0.6/1) and (max-width: 480px) {
    /* Very narrow portrait mobile */
    .bottom-left-buttons {
      bottom: 5px;
      left: 5px;
      gap: 3px;
    }

    .search-mode-btn {
      padding: 0.5em 1em;
      font-size: 0.8rem;
    }

    .bottom-btn {
      padding: 0.5em 1em;
      font-size: 0.8rem;
    }
  }
  .hints-container {
    display: flex;
    flex-direction: column;
    bottom: 5.5rem;
    /* left: 4rem; */
    width: 21rem;
    height: 6rem;
    background-color: black;
    justify-content: center;
    align-items: center;
    z-index: 100;
    position: absolute;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    border-radius: 2rem;
    box-shadow: 0px 0px 30px black;
  }

  .hints-container.visible {
    opacity: 100%;
  }

  .hints-picture {
    width: 20rem;
  }

  #cangjie-code {
    display: flex;
    justify-content: space-between;
    width: 20rem;
    text-align: left;
    font-size: 3rem;
    margin: 0;
    font-weight: bold;
  }

    #cangjie-code span {
    width: 4rem;

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
    object-fit: fill;
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
</style>
