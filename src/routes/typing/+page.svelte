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
  import { areCharactersEquivalent } from "$lib/utils/character-mapping.js";

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
  let missingIndexes = $state([]);
  let extraCharacters = $state([]); // Array of objects: {index, char, wrong: true}
  let onLeftOfExtraChar = $state(false); // Determines if caret is left or right of extra character
  let lastWrongChar = $state(''); // Store the last wrong character typed
  let startTime = 0;
  let gameState = $state(GameState.START);
  let timeTakenInMs = $state(0);
  let WPM = $state(0);
  let accuracy = $state(0);

  let timeElapsed = $state(0);
  let updateTimerInterval = null;
  let updateInfoInterval = null;
  let focusInputInterval = null;
  let updateCaretInterval = null;

  let inputBox = $state();
  let scrollContainer = $state();
  let inputDisplay = $state();
  let typePrep = $state();
  let typeCancelled = false;
  let resultsScreen = $state();

  let settingsOpen = $state(false);
  let isSpinning = $state(false);
  let spinDirection = $state('clockwise');

  let focused = $state(false);

  // Animation state variables
  let showSpeed = $state(false);
  let showAccuracy = $state(false);
  let showGradeLabel = $state(false);
  let showGradeInfo = $state(false);
  let animatedWPM = $state(0);
  let animatedAccuracy = $state(0);
  let animationTimeouts = $state([]);

  let isCompo = $state(false);
  let justComposed = $state(false);
  let compositionData = $state("");
  let lastProcessedInput = $state("");
  let compositionStartTime = $state(0);
  let compositionBackspaceLock = false;
  let timeLimit = $state(60);
  let fontSelect = $state("LXGW WenKai TC");

  const HintState = Object.freeze({
    HIDDEN: 0,
    SHOWN: 1,
    URL: 2,
  });

  let hintState = $state(HintState.HIDDEN);
  let autoHintTimeout = null;
  let revealTimeout = null;
  let autoHintMode = $state('timed');
  let autoHintTimeoutSeconds = $state(5);
  let cangjieMode = $state('timed');
  let revealCangjieCodeTimeoutSeconds = $state(3);

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
  let hintsContainer = $state();


  let isTimeUp = false;
  let caretElement = $state();

  const autoScrollPercentage = 0.4;
  const inputBoxOffset = {
    x: 0,
    y: 20,
  };
  onMount(() => {
    // initCangjieMap();
    setResultsPanelVisibility(false);
    updateCaretInterval = setInterval(() => {updateCaretPosition(false)}, 100);
    // setSettingsVisibility(false);
    content = content.replace(/(?:\r\n|\r|\n)/g, "");
    if (removeContentSpace) content = content.replace(/\s/g, "");
    updateInputBoxPos(false);
    typePrep.focus();
    document.onclick = (e) => {
tryPressEnterFocus(e);
      if (document.activeElement === inputBox) return;
      if (document.activeElement === typePrep) return;
      if (settingsOpen) return;
      // Don't focus input if clicking on a link or character
      if (e.target.closest('a') || e.target.closest('.char')) return;
      e.preventDefault();
      inputBox.focus();};
    document.onkeydown = (e) => {
      tryPressEnterFocus(e);
      if (document.activeElement === inputBox) return;
      if (document.activeElement === typePrep) return;
      if (settingsOpen) return;
      if (e.target.closest('a') || e.target.closest('.char')) return;
      e.preventDefault();
      inputBox.focus();
    };
    
    // Add keyboard accessibility for Enter key
    document.addEventListener('keydown', handleEnterKey);
    
    // Close settings panel when clicking outside
    document.addEventListener('click', handleDocumentClick);
    
    // Close results panel when clicking outside
    document.addEventListener('click', handleResultsOutsideClick);

  });

  onDestroy(() => {
    document.onkeydown = null;
    // Remove the Enter key event listener
    document.removeEventListener('keydown', handleEnterKey);
  });

  function handleEnterKey(e) {
    if (e.key === 'Enter') {
      if (gameState === GameState.FINISH && !resultsScreen.classList.contains('hidden')) {
        // If results panel is visible, close it
        setResultsPanelVisibility(false);
      } else if (gameState === GameState.FINISH && resultsScreen.classList.contains('hidden')) {
        // If test is finished but results panel is not visible, restart test
        restart();
      }
      // Don't restart during active gameplay (GameState.PLAY)
    }
  }

  function tryFocus() {
    if (document.activeElement === inputBox) return;
    if (document.activeElement === typePrep) return;
    if (document.activeElement.localName === "button") return;
    if (settingsOpen) return;
    inputBox.focus();
  }

  function tryPressEnterFocus(e) {
    if (document.activeElement !== typePrep) return;
    if (e.key !== "Enter") return;
    currentWordIndex = 0;
    enterHiddenState();
    updateInputBoxPos();
    inputBox.focus();
  }

  function clearInput() {
    inputBox.innerHTML = "";
    input = "";
    // Don't reset lastProcessedInput here - it should persist across input clears
  }
  function adjustHintsPosition() {
    if (!hintsContainer) return;
    const charElement = document.querySelector(`#char-${currentWordIndex}`);
    const charRect = charElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const hintsWidth = 336; // 21rem * 16px (assuming 1rem = 16px)
const charCenter = charRect.left + charRect.width / 2;
    // Reset position
    hintsContainer.style.right = "";
    hintsContainer.style.left = "";
    hintsContainer.style.top = "";
    hintsContainer.style.bottom = "";
    hintsContainer.style.transform = "";

    // Position hints container at the top-left of the character
    hintsContainer.style.left = "0";
    hintsContainer.style.top = "";
    hintsContainer.style.bottom = "3.5rem";
    
    // Check if there's enough space on the right
    const spaceOnRight = viewportWidth - charRect.right;
    
    if (spaceOnRight < hintsWidth) {
      // Not enough space on the right, position to the left
      hintsContainer.style.left = "";
      hintsContainer.style.right = "0";
    }
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
    focusInputInterval = setInterval(tryFocus, 1000);
    lockScrollPosition();
    if (autoHintMode === 'always') {
      enterShownState();
    } else if (autoHintMode === 'timed') {
      startAutoHintTimer();
    }
    // Scroll to position the first character at 30% from top
    // setInterval(() => updateScroll(), 100);
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
    if (gameState == GameState.FINISH) return;
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
    // clearInterval(updateTimerInterval);
    // clearInterval(updateInfoInterval);
    // clearInterval(focusInputInterval);
    // clearTimeout(autoHintTimeout);
    // clearTimeout(revealTimeout);
    // autoHintTimeout = null;
    // revealTimeout = null;
    // enterHiddenState();
    gameState = GameState.FINISH;
    console.log(wrongWords, content.length);
    updateInfo();
    calcFinalPoints();
    setResultsPanelVisibility(true);
    startResultsAnimation();
  }

  function startResultsAnimation() {
    // Clear any existing timeouts
    animationTimeouts.forEach(timeout => clearTimeout(timeout));
    animationTimeouts = [];

    // IMMEDIATELY reset all animation states to their initial positions
    showSpeed = false;
    showAccuracy = false;
    showGradeLabel = false;
    showGradeInfo = false;
    animatedWPM = 0;
    animatedAccuracy = 0;

    // Force immediate DOM update by triggering a tick
    tick().then(() => {
      let delay = 0;

      // 1. Fade in "speed" label along with WPM (0.3s)
      const speedFadeIn = setTimeout(() => {
        showSpeed = true;
        // Start WPM counting animation
        startWPMCounting();
      }, delay);
      animationTimeouts.push(speedFadeIn);
      delay += 500;

      // 2. Fade in accuracy (0.3s) while WPM continues counting
      const accuracyFadeIn = setTimeout(() => {
        showAccuracy = true;
        // Start accuracy counting animation
        startAccuracyCounting();
      }, delay);
      animationTimeouts.push(accuracyFadeIn);
      delay += 500;

      // 3. Fade in "grade" label only (0.3s)
      const gradeLabelFadeIn = setTimeout(() => {
        showGradeLabel = true;
      }, delay);
      animationTimeouts.push(gradeLabelFadeIn);
      delay += 800;

      // 4. Stamping animation for grade info (1s)
      const gradeStamping = setTimeout(() => {
        showGradeInfo = true;
      }, delay);
      animationTimeouts.push(gradeStamping);
    });
  }

  function startWPMCounting() {
    const targetWPM = WPM;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const countInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth counting
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      animatedWPM = Math.floor(targetWPM * easeOutCubic);

      if (progress >= 1) {
        animatedWPM = targetWPM;
        clearInterval(countInterval);
      }
    }, 16); // ~60fps
  }

  function startAccuracyCounting() {
    const targetAccuracy = accuracy * 100;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const countInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth counting
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      animatedAccuracy = targetAccuracy * easeOutCubic;

      if (progress >= 1) {
        animatedAccuracy = targetAccuracy;
        clearInterval(countInterval);
      }
    }, 16); // ~60fps
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
    // Update caret position
    updateCaretPosition();
    // Update scroll position after updating input box position
      updateScroll();
      tryFocus();
  }

  function updateCaretPosition(resetAnimation = true) {
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    if (!currentChar || !caretElement) return;
     const currentScrollTop = scrollContainer.scrollTop;

    
    // Get the character position relative to the scroll container
    const charRect = currentChar.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // Calculate position relative to the scroll container
    const targetTop = charRect.top - containerRect.top + charRect.height * 0.25 + currentScrollTop;
    let targetLeft = charRect.left - containerRect.left;
    
    // Check if there's an extra character associated with current position
    const hasExtraChar = hasExtraCharacterAssociated(currentWordIndex);
    
    if (hasExtraChar && onLeftOfExtraChar) {
      // Position caret to the left of the extra character
      // Find the first extra character element for this index
      const extraCharElements = document.querySelectorAll(`[id^="extra-char-${currentWordIndex}-"]`);
      if (extraCharElements.length > 0) {
        const extraCharRect = extraCharElements[0].getBoundingClientRect();
        targetLeft = extraCharRect.left - containerRect.left;
      }
    }
    
    // Smooth animation using CSS transitions
    caretElement.style.transition = 'top 0.2s ease-out, left 0.2s ease-out';
    caretElement.style.top = targetTop + "px";
    caretElement.style.left = targetLeft + "px";
    caretElement.style.opacity = focused ? "1" : "0.5";
    
    // Reset the blinking animation when caret moves
    if (resetAnimation)
    resetCaretBlink();
  }

  function resetCaretBlink() {
    if (!caretElement) return;
    
    // Remove the .caret class to stop the animation
    caretElement.classList.remove('caret');
    
    // Force reflow to ensure the class removal is applied
    void caretElement.offsetWidth;
    
    // Only re-add the .caret class to restart the animation if focused
    if (focused) {
      caretElement.classList.add('caret');
    }
  }

  function keyDown(e) {
  typeCancelled = false;

  if (gameState !== GameState.START) {
    if (currentWordIndex !== currentWordIndex) {
      updateCangjieCode();
      if (autoHintMode === 'always') {
        enterShownState();
      } else {
        enterHiddenState();
      }
    }
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
    if (hintState === HintState.HIDDEN) {
      enterShownState();
    } else if (hintState === HintState.SHOWN) {
      enterUrlState();
    }
  }

  // Handle arrow key navigation
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); // Prevent default scrolling behavior
    handleArrowKeyNavigation(e.key);
  }
}

  function hasExtraCharacterAssociated(charIndex) {
    return extraCharacters.some(x => x.index === charIndex);
  }

  function handleArrowKeyNavigation(key) {
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    if (!currentChar) return;

    const currentRect = currentChar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate characters per line by finding the next character that's on a different line
    const charsPerLine = calculateCharsPerLine();
    
    let newCurrentWordIndex = currentWordIndex;
    let newOnLeftOfExtraChar = onLeftOfExtraChar;

    switch (key) {
      case 'ArrowLeft':
        // Move left (decrease current character)
        if (currentWordIndex > 0) {
          if (hasExtraCharacterAssociated(currentWordIndex)) {
              if (!onLeftOfExtraChar) {newOnLeftOfExtraChar = true;
              }
              else
               {
                newCurrentWordIndex = currentWordIndex - 1;
}
            } else {
                newCurrentWordIndex = currentWordIndex - 1;
            }
            if (hasExtraCharacterAssociated(currentWordIndex-1)) {
              newOnLeftOfExtraChar = false; 
              console.log("set to false.")
        }
      }
        break;
      
      case 'ArrowRight':
        // Move right (increase current character)
        if (currentWordIndex < content.length - 1) {
          // If current character is missing, skip over it by moving 2 positions
          if (isMissingCharacter(currentWordIndex)) {
            if (currentWordIndex + 2 <= content.length - 1) {
              newCurrentWordIndex = currentWordIndex + 2;
              // When moving past a missing character, we're to the left of any extra character
              newOnLeftOfExtraChar = true;
            } else {
              // If we can't move 2 positions, move to the end
              newCurrentWordIndex = content.length - 1;
              // At the end, we're to the left of any extra character
              newOnLeftOfExtraChar = true;
            }
          } else {
            if (hasExtraCharacterAssociated(currentWordIndex)) {
              if (onLeftOfExtraChar) {newOnLeftOfExtraChar = false;
              }
              else
               {
                newCurrentWordIndex = currentWordIndex + 1;
}
            } else {
                newCurrentWordIndex = currentWordIndex + 1;

            }
            // When moving right, we're to the left of any extra character at the new position
          }
        }
        break;
      
      case 'ArrowUp':
        // Move up (decrease by chars per line)
        if (currentWordIndex >= charsPerLine) {
          newCurrentWordIndex = currentWordIndex - charsPerLine;
          // When moving up, we're to the left of any extra character at the new position
          newOnLeftOfExtraChar = true;
        } else {
          // If we're on the first line, move to beginning
          newCurrentWordIndex = 0;
          // At the beginning, we're to the left of any extra character
          newOnLeftOfExtraChar = true;
        }
        break;
      
      case 'ArrowDown':
        // Move down (increase by chars per line)
        const maxIndex = content.length - 1;
        if (currentWordIndex + charsPerLine <= maxIndex) {
          newCurrentWordIndex = currentWordIndex + charsPerLine;
          // When moving down, we're to the left of any extra character at the new position
          newOnLeftOfExtraChar = true;
        } else {
          // If we're on the last line, move to end
          newCurrentWordIndex = maxIndex;
          // At the end, we're to the left of any extra character
          newOnLeftOfExtraChar = true;
        }
        break;
    }

    // Apply missing character logic: if the target character is to the right of a missing character,
    // move to the missing character instead
    if (newCurrentWordIndex > 0 && isMissingCharacter(newCurrentWordIndex - 1)) {
      newCurrentWordIndex = newCurrentWordIndex - 1;
      // When moving to a missing character, we're to the left of it
      newOnLeftOfExtraChar = true;
    }
    onLeftOfExtraChar = newOnLeftOfExtraChar;


    updateCaretPosition();
    // Only update if the index actually changed
    if (newCurrentWordIndex !== currentWordIndex) {
      currentWordIndex = newCurrentWordIndex;
      updateInputBoxPos();
      
      // Update hint logic if needed
      if (currentWordIndex !== currentWordIndex) {
        updateCangjieCodeForChar(content[currentWordIndex]);
        enterShownState();
      }
    }


  }

  function calculateCharsPerLine() {
    // Find the first character on the second line to determine chars per line
    const firstChar = document.querySelector('#char-0');
    if (!firstChar) return 20; // Default fallback

    const firstCharRect = firstChar.getBoundingClientRect();
    const firstCharTop = firstCharRect.top;

    // Look for the first character that's on a different line (different top position)
    for (let i = 1; i < content.length; i++) {
      const char = document.querySelector(`#char-${i}`);
      if (char) {
        const charRect = char.getBoundingClientRect();
        if (Math.abs(charRect.top - firstCharTop) > 5) { // 5px threshold for line difference
          return i;
        }
      }
    }

    // If all characters are on the same line, use a reasonable default
    return Math.floor(content.length / 2) || 20;
  }

  function halfInput(e) {
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
    // Only prevent duplicates if we're in composition mode or just finished composition
    if (e.data && e.data === lastProcessedInput && (isCompo || justComposed)) {
      setTimeout(clearInput, 0);
      return;
    }

    isCompo = false;

    // Only process if we have data
    if (e.data) {
      lastProcessedInput = e.data;
      validateInput(e.data);
    }

    setTimeout(clearInput, 0);
  }

  function updateScroll() {
      updateCaretPosition();
    const currentChar = document.querySelector(`#char-${currentWordIndex}`);
    if (!currentChar || !scrollContainer) return;
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const charRect = currentChar.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const targetPosition = containerHeight * autoScrollPercentage; //  from top of container
      const charTopInContainer = charRect.top - containerRect.top;
      
      // Calculate the scroll position needed to place the character at 30% from top of container
      const currentScrollTop = scrollContainer.scrollTop;
      const scrollTarget = charTopInContainer + currentScrollTop - targetPosition;
      
      // Add a threshold to prevent excessive scrolling when already close
      const threshold = 5; // pixels
      
      // Only scroll if the character is not already at the target position
      if (Math.abs(charTopInContainer - targetPosition) > threshold) {
        // Use smooth scrolling for better UX
        scrollContainer.scrollTo({
          top: scrollTarget,
          behavior: 'smooth'
        });
      }
      
      // Update caret position after scroll
    });
  }

  function updateCangjieCode() {
    moveHintsToChar();
    cangjieCode = currentWord ? cangjieMap[currentWord] || '' : '';
    revealedChars = 0;
  }

  function updateCangjieCodeForChar(char) {
    moveHintsToChar();
    cangjieCode = cangjieMap[char] || '';
    revealedChars = 0;
  }

  function moveHintsToChar() {
    if (!hintsContainer) return;
    const charElement = document.querySelector(`#char-${currentWordIndex}`);
    if (!charElement) return;
    console.log("movehintstochar");
    // Move hints container to the current character
    charElement.appendChild(hintsContainer);
    
    // Position hints container at the top-left of the character
    adjustHintsPosition();
  }

  function onStateChange() {
    clearTimeout(autoHintTimeout);
    clearTimeout(revealTimeout);
    autoHintTimeout = null;
    revealTimeout = null;
    console.log("State change");
    moveHintsToChar();
  }

  function enterHiddenState() {
    onStateChange();
    hintState = HintState.HIDDEN;
    revealedChars = 0;
    console.log("set state to hidden");
  }

  function enterShownState() {
    onStateChange();
    hintState = HintState.SHOWN;
    if (cangjieMode === 'always') {
      revealedChars = cangjieChars.length;
      enterUrlState();
    } else {
      revealedChars = 0;
      function revealNext() {
        revealedChars++;
        if (revealedChars >= cangjieChars.length) {
          enterUrlState();
        } else {
          revealTimeout = setTimeout(revealNext, revealCangjieCodeTimeoutSeconds * 1000);
        }
      }
      revealTimeout = setTimeout(revealNext, revealCangjieCodeTimeoutSeconds * 1000);
    }
  }

  function enterUrlState() {
    onStateChange();
    console.log("enter url state");
    hintState = HintState.URL;
    revealedChars = cangjieChars.length;
  }

  function startAutoHintTimer() {
    if (autoHintMode === 'timed' && gameState !== GameState.START && currentWordIndex < content.length) {
      autoHintTimeout = setTimeout(() => {
        enterShownState();
      }, autoHintTimeoutSeconds * 1000);
    }
  }

  function validateInput(word) {
    let hadWrongInput = $state(false);
    if (gameState === GameState.START) return;
    if (typeCancelled) {
      return;
    }
    for (let i = 0; i < word.length; i++) {
      currentWord = content[currentWordIndex];
      const char = word[i];
      
      // Check if input matches current character
      if (areCharactersEquivalent(char, currentWord)) {
        // Correct input - mark as correct and move to next character
        correctIndexes = [...correctIndexes, currentWordIndex];
        // If this was a missing character, remove it from missingIndexes
        missingIndexes = missingIndexes.filter(index => index !== currentWordIndex);
        wrongIndexes = wrongIndexes.filter(index => index !== currentWordIndex);
        currentWordIndex++;
      } else {
        // Check for extra character scenario
        // If previous character exists and is wrong, and current input matches previous character
        const prevCharIndex = currentWordIndex - 1;
        if (prevCharIndex >= 0 && wrongIndexes.includes(prevCharIndex) && 
            areCharactersEquivalent(char, content[prevCharIndex])) {
          // Handle extra character
          handleExtraCharacter(char, prevCharIndex);
          hadWrongInput = true;
        } else {
          lastWrongChar = char;
          // Check if this is a missing character scenario
          // Look ahead to see if the user typed the NEXT character instead
          const nextCharIndex = currentWordIndex + 1;
          if (nextCharIndex < content.length) {
            const nextChar = content[nextCharIndex];
            if (areCharactersEquivalent(char, nextChar)) {
              // Missing character detected!
              // Only mark as missing if the current character hasn't been processed yet
              // (i.e., it's not already in correctIndexes or wrongIndexes)
              if (!correctIndexes.includes(currentWordIndex) && !wrongIndexes.includes(currentWordIndex)) {
                // Mark current character as missing (wrong)
                wrongIndexes = [...wrongIndexes, currentWordIndex];
                missingIndexes = [...missingIndexes, currentWordIndex];
                // Skip current character and move to the next one
                currentWordIndex++;
                // Now process the typed character as correct for the new current position
                if (currentWordIndex < content.length) {
                  correctIndexes = [...correctIndexes, currentWordIndex];
                  currentWordIndex++;
                }
                hadWrongInput = true;
              } else {
                // Current character was already processed, treat as regular wrong input
                wrongIndexes = [...wrongIndexes, currentWordIndex];
                currentWordIndex++;
                hadWrongInput = true;
              }
            } else {
              // Not a missing character - regular wrong input
              wrongIndexes = [...wrongIndexes, currentWordIndex];
              currentWordIndex++;
              hadWrongInput = true;
            }
          } else {
            // At the end of content, regular wrong input
            wrongIndexes = [...wrongIndexes, currentWordIndex];
            currentWordIndex++;
            hadWrongInput = true;
          }
        }
      }
      
      if (currentWordIndex >= content.length) {
        if (gameState !== GameState.FINISH)
        finishGame();
      }
    }
    updateScroll();
    clearInput();
    updateInputBoxPos();
    updateCangjieCode();

    if (gameState !== GameState.FINISH) calcTempPoints();

    if (!hadWrongInput) {
      // On correct input (finished character), hide hint and set timeout
      if (autoHintMode !== 'always') {
        enterHiddenState();
        startAutoHintTimer();
      } else {
        enterShownState();
      }
      // For 'always' mode, keep hints shown for next character
    } else {
      // On wrong input
      if (hintState === HintState.HIDDEN) {
        // Do nothing
      } else if (hintState === HintState.URL) {
        enterShownState();
      } else if (hintState === HintState.SHOWN) {
        // Reset reveal timer
        clearTimeout(revealTimeout);
        revealedChars = 0;
        function revealNext() {
          revealedChars++;
          if (revealedChars >= cangjieChars.length) {
            enterUrlState();
          } else {
            revealTimeout = setTimeout(revealNext, revealCangjieCodeTimeoutSeconds * 1000);
          }
        }
        revealTimeout = setTimeout(revealNext, revealCangjieCodeTimeoutSeconds * 1000);
      }
    }
  }


  function handleExtraCharacter(char, prevCharIndex) {
    // Mark the previous character as correct (since user typed it correctly)
    wrongIndexes = wrongIndexes.filter(index => index !== prevCharIndex);
    correctIndexes = [...correctIndexes, prevCharIndex];
    
    // Add the extra character between the previous-previous character and the previous character
    // The extra character should be the wrong character that was typed earlier
    // We need to find what wrong character was typed for this position
    const extraCharIndex = prevCharIndex; // Insert at the position of the previous character
    extraCharacters = [...extraCharacters, { index: extraCharIndex, char: lastWrongChar, wrong: true }];
    
    // Set onLeftOfExtraChar to true since we're inserting the extra character
    // and the caret should be to the left of it (between previous char and extra char)
    onLeftOfExtraChar = true;
    
    // Move to the next character (the one after the previously wrong character)
    currentWordIndex = prevCharIndex + 1;
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

  function getGrade() {
    if (WPM < 10) return "新手";
    if (WPM < 25) return "初哥";
    if (WPM < 50) return "好";
    if (WPM < 75) return "高手";
    if (WPM < 100) return "快手";
    return "達人";
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
      if (WPM >= Number(speed)) {
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
      if (accuracy * 100 >= Number(accu)) {
        accuracyCutoff = accu;
        accuracyMultiplier = bonus.accuracy[accu];
        return Math.round(basePoints * accuracyMultiplier);
      }
    }

    return 0;
  }

  function tryDelete() {
    if (gameState === GameState.START) return;
    if (currentWordIndex === 0) return;
    
    // Check if there's an extra character at the current position
    
    // If there's an extra character and we're to the right of it (onLeftOfExtraChar is false),
    // remove the extra character instead of moving back
    if (hasExtraCharacterAssociated(currentWordIndex) && !onLeftOfExtraChar) {
      // Remove the extra character
      extraCharacters = extraCharacters.filter(ec => ec.index !== currentWordIndex);
      // Set onLeftOfExtraChar to true since we're now to the left of where the extra character was
      updateInputBoxPos();
      return;
    }
    
    // Check if the previous character is a missing character
    const previousCharIndex = currentWordIndex - 2;
    if (missingIndexes.includes(previousCharIndex)) {
      currentWordIndex--;
      updateInputBoxPos();
      wrongIndexes = wrongIndexes.filter((x) => x !== currentWordIndex);
      correctIndexes = correctIndexes.filter((x) => x !== currentWordIndex);
      missingIndexes = missingIndexes.filter((x) => x !== currentWordIndex);
      // If previous character is missing, move to that character
      tryDelete();
      return;
    } else {
      // Normal backspace behavior
      currentWordIndex--;
      // If we're moving to a position with an extra character, set onLeftOfExtraChar to true
      const extraCharAtNewPos = extraCharacters.find(ec => ec.index === currentWordIndex);
      if (extraCharAtNewPos) {
        onLeftOfExtraChar = false;
      }
    }
    
    updateInputBoxPos();
    wrongIndexes = wrongIndexes.filter((x) => x !== currentWordIndex);
    correctIndexes = correctIndexes.filter((x) => x !== currentWordIndex);
    missingIndexes = missingIndexes.filter((x) => x !== currentWordIndex);
  }

  async function compoEnd(e) {
  isCompo = false;

  // ✅ Keep lock briefly to absorb Mac's delayed Backspace events
  setTimeout(() => {
    compositionBackspaceLock = false;
  }, 200);

  if (gameState === GameState.START) {
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
    missingIndexes = [];
    extraCharacters = [];
    currentWordIndex = 0;
    updateInputBoxPos();
    updateScroll();
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
    clearTimeout(revealTimeout);
    autoHintTimeout = null;
    revealTimeout = null;
    enterHiddenState();
    updateTimer(0);
  }

  function setResultsPanelVisibility(show = false) {
    if (show) {
      resultsScreen.classList.remove("hidden");
    } else {
      resultsScreen.classList.add("hidden");
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
    
    // Immediately hide animation elements when settings panel opens
    if (isOpening) {
      showSpeed = false;
      showAccuracy = false;
      showGradeLabel = false;
      showGradeInfo = false;
      animatedWPM = 0;
      animatedAccuracy = 0;
    }
  }

  // Alternative click handler for better reliability
  function handleDocumentClick(e) {
    // Close settings panel when clicking outside of it
    if (settingsOpen) {
      const settingsPanel = document.querySelector('.settings-panel');
      const settingsBtn = document.querySelector('.settings-btn');
      
      if (settingsPanel && settingsBtn) {
        const isClickOutside =
          !settingsPanel.contains(e.target) && 
          !settingsBtn.contains(e.target);
        if (isClickOutside) {
          e.preventDefault();
          e.stopPropagation();
          handleSettingsToggle();
        }
      }
    }
  }


  function handleResultsOutsideClick(e) {
    // Close results panel when clicking outside of it
    if (gameState === GameState.FINISH && !resultsScreen.classList.contains('hidden')) {
      const resultsPanel = document.querySelector('.results-panel');
      const resultsButtons = document.querySelectorAll('.panel-buttons button');
      
      // Check if the click target is not within the results panel, its buttons, or any bottom button
      if (!resultsPanel.contains(e.target) && 
          !Array.from(resultsButtons).some(btn => btn.contains(e.target)) &&
          !e.target.closest('.bottom-btn')) {
        setResultsPanelVisibility(false);
      }
    }
  }
  let correctWords = $derived(correctIndexes.length);
  let wrongWords = $derived(wrongIndexes.length);
  let currentWord = $derived(content[currentWordIndex]);
  let showInputDisplay = $derived(isCompo && input !== "");
  
  // Function to check if a character index is a missing character
  function isMissingCharacter(index) {
    // A character is "missing" if it's in the missingIndexes array
    return missingIndexes.includes(index);
  }

    
    function lockScrollPosition() {
      // Store current scroll position
      lastScrollTop = window.scrollY;
      
      // Prevent scrolling by setting body to fixed position
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lastScrollTop}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Also prevent scrolling on the main container
      const background = document.querySelector('.background');
      if (background) {
        background.style.overflow = 'hidden';
      }
      
      // Lock the scroll container from user scrolling
      if (scrollContainer) {
        scrollContainer.style.overflow = 'hidden';
        scrollContainer.addEventListener('wheel', preventScroll, { passive: false });
        scrollContainer.addEventListener('touchmove', preventScroll, { passive: false });
      }
    }
    
    function unlockScrollPosition() {
      // Remove scroll lock
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      
      // Restore scroll position
      if (lastScrollTop > 0) {
        window.scrollTo(0, lastScrollTop);
        lastScrollTop = 0;
      }
      
      // Restore overflow on main container
      const background = document.querySelector('.background');
      if (background) {
        background.style.overflow = '';
      }
      
      // Restore scroll container scrolling
      if (scrollContainer) {
        scrollContainer.style.overflow = 'auto';
        scrollContainer.removeEventListener('wheel', preventScroll);
        scrollContainer.removeEventListener('touchmove', preventScroll);
      }
    }
    
    function preventScroll(e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
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
  <input
    type="text"
    id="type-input"
    placeholder={gameState === GameState.PLAY ? "" : ""}
    oncompositionupdate={compoUpdate}
    oncompositionstart={compoStart}
    oncompositionend={compoEnd}
    oninput={handlers(startTimer, halfInput)}
    onkeydown={keyDown}
    onfocus={() => {focused = true; updateCaretPosition();}}
    onfocusout={() => {focused = false;}}
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
  <div class="scroll-container" bind:this={scrollContainer}>
    <div class="info-bar {gameState === GameState.PLAY ? 'fixed-top' : 'hidden'}">
      {#if gameState !== 3}
        {#if timeLimit > 0}
          <p>剩餘時間: {Math.ceil(timeLimit - timeElapsed / 1000)}秒</p>
        {/if}
        <p>速度: {WPM.toFixed(1)}WPM</p>
        <p>準確度: {(accuracy * 100).toFixed(1) + "%"}</p>
      {/if}
    </div>
      {#if gameState === GameState.START}
    <input
      class="type-prep"
      type="text"
      placeholder="喺度調整輸入法，準備好就撳Enter進入測試"
      bind:this={typePrep}
    />
    {/if}
    <div id="start-partition"></div>
    <div class="test-content {gameState === GameState.PLAY ? 'with-fixed-info' : ''}" style="--char-font: {fontSelect}">
    {#each content as char, index (index)}
      <!-- Render extra characters that should appear before this character -->
      {#each extraCharacters.filter(ec => ec.index === index) as extraChar}
        <div
          class="char extra-char"
          id="extra-char-{index}-{extraChar.char}"
          onclick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX;
          const charWidth = rect.width;
          const clickPosition = clickX - rect.left;
          
          // Determine which side was clicked (left or right)
          const isLeftSide = clickPosition < charWidth / 2;
          onLeftOfExtraChar = isLeftSide;
          currentWordIndex = extraChar.index;
            updateInputBoxPos();
            hintState = HintState.HIDDEN;
          }}
        >
          <p class="wrong extra-char-text">{extraChar.char}</p>
        </div>
      {/each}
      
      <div
        class="char"
        id="char-{index}"
        onclick={(e) => {
          const oriWordIndex = currentWordIndex;
          // Get the click position relative to the character element
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX;
          const charWidth = rect.width;
          const clickPosition = clickX - rect.left;
          
          // Determine which side was clicked (left or right)
          const isLeftSide = clickPosition < charWidth / 2;
          
          // Check if this character has an extra character associated with it
          const hasExtraChar = hasExtraCharacterAssociated(index);
          
          if (hasExtraChar) {
            // This character has an extra character associated with it
            if (isLeftSide) {
              // Clicked at the left of extra character
              // Set current character to the character that the extra character is associated to
              currentWordIndex = index;
              // Set onLeftOfExtraCharacter to true
              onLeftOfExtraChar = false;
            } else {
              // Clicked at the right of extra character
              // Set current character to the character that the extra character is associated to
              currentWordIndex = index;
              // Set onLeftOfExtraCharacter to false
              onLeftOfExtraChar = false;
            }
          } else {
            // This is a normal character
            if (isLeftSide) {
              // Clicked at the left of a normal character
              currentWordIndex = index;
            } else {
              // Clicked at the right of a normal character
              currentWordIndex = index + 1;
                onLeftOfExtraChar = true;
            }
          }
          
          // Handle missing character logic
          if (currentWordIndex > 0 && isMissingCharacter(currentWordIndex - 1)) {
            currentWordIndex = currentWordIndex - 1;
            // When moving to a missing character, we're to the left of it
            onLeftOfExtraChar = true;
          }
          const hintDiff = oriWordIndex !== currentWordIndex;
          // Update input box position and caret
          updateInputBoxPos();
          console
          // Update hint logic
          if (hintDiff) {
            updateCangjieCodeForChar(content[currentWordIndex]);
            if (autoHintMode !== 'always') {
        enterHiddenState();
        startAutoHintTimer();
      } else {
        enterShownState();
      }
          } else {
            if (hintState === HintState.SHOWN) {
              console.log("HI");
              enterUrlState();
            } else if (hintState === HintState.HIDDEN) {
              enterShownState();
            }
          }
        }}
      >
        {#if currentWordIndex === index && hintState === HintState.URL}
          <a
            href={"https://www.hkcards.com/cj/cj-char-" + char + ".html"}
            target="_blank"
          >
          
            {#if isMissingCharacter(index)}
              <p class="missing">{char}</p>
            {:else if wrongIndexes.includes(index)}
              <p class="wrong">{char}</p>
            {:else if correctIndexes.includes(index)}
              <p class="correct">{char}</p>
            {:else}
              <p>{char}</p>
            {/if}
          </a>
        {:else}
          {#if isMissingCharacter(index)}
              <p class="missing">{char}</p>
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
    <!-- Caret element -->
    <div id="caret" class="caret" bind:this={caretElement}></div>
  </div>

  <div class="hints-container" class:visible={hintState !== HintState.HIDDEN} bind:this={hintsContainer}>
    <img
      class="hints-picture"
      src={currentWordIndex >= 0 ? `https://www.hkcards.com/img/cj/${content[currentWordIndex]}.png` : ''}
    />
    <p id="cangjie-code">
      {#each [...cangjieChars, ...Array(Math.max(0, 5 - cangjieChars.length)).fill('')] as char, i}
        <span>{i < revealedChars ? char : ''}</span>
      {/each}
    </p>
  </div>

  {#if gameState !== GameState.START}
    <div style="height: 100vh"></div>
  {/if}

  <div class="bottom-left-buttons">
    {#if gameState === GameState.PLAY}
      <button id="end-test-btn" class="btn-danger bottom-btn" onmouseenter={cancelInput} onclick={finishGame}
        >結束遊戲</button
      >
    {/if}
    
    {#if gameState !== GameState.START}
      <button class="btn-secondary bottom-btn" onmouseenter={cancelInput} onclick={restart}
        >重新開始</button
      >
    {/if}
    
    {#if gameState === GameState.FINISH}
      <button class="btn-primary bottom-btn" onclick={() => setResultsPanelVisibility(true)}
        >查看成績</button
      >
    {/if}
  </div>

  {#if settingsOpen}
  <div class="overlay"></div>
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
      <p class="reminder-text">可按SHIFT 或點擊文字以顯示提示</p>
      <h4>拆字圖解</h4>
      <select bind:value={autoHintMode} id="auto-hint-mode">
        <option value="always">總是顯示</option>
        <option value="timed">定時顯示</option>
      </select>
      {#if autoHintMode === 'timed'}
        <input type="range" min="1" max="20" bind:value={autoHintTimeoutSeconds} id="auto-hint-timeout" />
        <span>{autoHintTimeoutSeconds}秒</span>
      {/if}
    </div>
    <div class="setting">
      <h4>倉頡碼</h4>
      <select bind:value={cangjieMode} id="cangjie-mode">
        <option value="always">總是顯示</option>
        <option value="timed">定時顯示</option>
      </select>
      {#if cangjieMode === 'timed'}
        <input type="range" min="1" max="10" bind:value={revealCangjieCodeTimeoutSeconds} id="reveal-timeout" />
        <span>{revealCangjieCodeTimeoutSeconds}秒</span>
      {/if}
    </div>
  </div>

  <div class="results-screen" bind:this={resultsScreen}>
    <div class="results-panel">
      <div class="results-info">
        <h2>成績</h2>
        <div class="result-item">
          <h3 class="result-label" class:fade-in={showSpeed}>速度</h3>
          <span class="result-value" class:fade-in={showSpeed}>{animatedWPM.toFixed(1)}WPM</span>
        </div>
        <div class="result-item">
          <h3 class="result-label" class:fade-in={showAccuracy}>準確度</h3>
          <span class="result-value" class:fade-in={showAccuracy}>{animatedAccuracy.toFixed(1)}%</span>
        </div>
        <div class="result-item">
          <h3 class="result-label" class:fade-in={showGradeLabel}>等級</h3>
          <span class="result-value grade-value" class:stamping={showGradeInfo}>{getGrade()}</span>
        </div>
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
</div>

<style>
  #start-partition {
    height: 20vh;}
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

  .char {
    position: relative;
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
    background: rgb(61, 61, 61);
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
    gap: 2rem;
  }

  .results-info h3 {
    font-size: 2vh;
    color: white;
    margin: 0;
    font-weight: normal;
  }

  .results-info span {
    font-size: 5vh;
    color: white;
    font-weight: bold;
    letter-spacing: 0.1rem;
  }

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-label {
    opacity: 0;
    transform: translateY(10px);
    transition: none;
  }

  .result-label.fade-in {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .result-value {
    opacity: 0;
    text-align: center;
    transform: translateY(10px);
    transition: none;
  }

  .result-value.fade-in {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .grade-value {
    font-size: 5vh !important;
    opacity: 0;
    transform: scale(2);
    transition: none;
  }

  .grade-value.stamping {
    opacity: 1;
    transform: scale(1);
    transition: all 1s ease-out;
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
    overflow-y: hidden; /* Prevent main page scrolling */
  }
  
  /* Override layout styles for typing page */
  :global(body) {
    overflow-y: hidden !important;
  }
  
  :global(html) {
    overflow-y: hidden !important;
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
    position: sticky;
    top: 0;
    background-color: rgba(0, 0, 0, 0.9);
    padding: 10px 20px;
    z-index: 999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-bar p {
    font-size: 0.8rem; /* Smaller labels */
    margin: 0;
    color: #ccc;
  }

  .info-bar p:last-child {
    font-size: 1.5rem; /* Larger actual information */
    color: white;
    font-weight: bold;
    margin-left: auto;
  }

  .scroll-container {
    position: relative;
    width: 90vw;
    height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
    margin: 0 auto;
    padding: 20px;
    border: 2px solid #333;
    border-radius: 8px;
    background-color: #1a1a1a;
  }

  .test-content {
    display: flex;
    flex-wrap: wrap;
    padding: 3% 2%;
  }

  /* .test-content.with-fixed-info {
    padding-top: calc(3% + 60px);
  } */

  .test-content p {
    color: lightgrey;
    display: inline-block;
    font-family: var(--char-font);
    /* font-family: ""; */
    font-size: max(20px, 4vh);
    margin: max(4px, 0.3vw);
    width: max(20px, 4vh);
    /* height: max(20px, 4vh); */
    /* border: 1px solid rgba(255, 255, 255, 0.416); */
    /* padding: max(4px, 0.5vw); */
    text-align: center;
  }
  
  /* Set CSS variable for caret height
  .test-content {
    --char-font-size: max(18px, 3.5vh);
  } */


  .reminder-text {
    color: lightgrey;
  }

  .test-content .wrong {
    color: rgb(221, 59, 59);
    /* border: 1px solid rgb(194, 143, 143); */
  }

  .extra-char {
    display: inline-block;
    position: relative;
    ; /* Small spacing between extra char and main char */
  }

  .extra-char-text {
    color: rgb(221, 59, 59);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-color: rgb(221, 59, 59);
    font-size: max(18px, 3.5vh);
    margin: max(4px, 0.3vw);
    width: max(20px, 4vh);
    height: max(20px, 4vh);
    text-align: center;
    vertical-align: middle;
    display: inline-block;
  }

  .test-content .missing {
    color: lightgrey;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-color: lightgrey;
    /* border: 1px solid rgb(194, 143, 143); */
  }

  .test-content .correct {
    color: rgb(101, 196, 101);
  }

  #type-input {
    position: absolute;
    color: transparent;
    left: 0;
    font-size: 3rem;
    height: 5rem;
    background-color: transparent;
    border: none;
    overflow: hidden;
    width: 0.1px;

    border-radius: 0rem;
    padding: 0.5rem;
    box-shadow: none;
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
    height: 5vh;
    display: inline-block;
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

  /* Override color scheme styles for bottom buttons */
  .bottom-btn {
    padding: 0.8em 1.5em;
    font-size: 1rem;
    border-radius: 1rem;
    border: none;
    color: white;
    cursor: pointer;
    transition: all var(--transition-normal);
    box-shadow: var(--shadow-sm);
  }

  .bottom-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    opacity: 80%;
  }

  .bottom-btn:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }

  /* Mobile styles for bottom buttons - using aspect ratio */
  @media (max-aspect-ratio: 1/1) and (max-width: 768px) {
    /* Portrait mobile */
    .bottom-left-buttons {
      bottom: 10px;
      left: 10px;
      gap: 5px;
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

    .bottom-btn {
      padding: 0.5em 1em;
      font-size: 0.8rem;
    }
  }
  .hints-container {
    /* left: 4rem; */
    width: 21rem;
    height: 8rem;
    background-color: black;
    justify-content: top;
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
    opacity: 1;
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

  /* Caret styling */
  .caret {
    position: absolute;
    width: 2px;
    height: var(--char-font-size, max(18px, 3.5vh));
    background-color: rgb(87, 191, 255);
    z-index: 1;
    pointer-events: none;
    transition: top 0.2s ease-out, left 0.2s ease-out, opacity 0.3s ease;
  }

  /* Smooth blinking animation for caret */
  @keyframes blink {
    0%, 75% { opacity: 1; }
    76%, 100% { opacity: 0; }
  }

  .caret {
    animation: blink 1.3s infinite;
  }
  
  /* Hide caret when not focused */
  .caret[style*="opacity: 0"] {
    animation: none;
  }
</style>