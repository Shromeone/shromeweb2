<script>
  let firstPress = true;
  let ballAnimationTimeouts = [];
  const redNums = [
    1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46,
  ];
  const blueNums = [3, 4, 9, 10, 14, 15, 20, 31, 41, 42, 47, 48];

  /* 0: all
     1: only hot
     2: no hot*/
  const ChooseOptions = {
    All: 0,
    OnlyHot: 1,
    NoHot: 2,
  };
  let chooseOptions = $state(ChooseOptions.NoHot);
  function toggleHotNumbers(option) {
    chooseOptions = option;
  }

  function getBallColor(num) {
    if (redNums.includes(num)) return "coral";
    if (blueNums.includes(num)) return "skyblue";
    return "limegreen";
  }
  const hotNumbers = [
    4, 6, 7, 9, 10, 12, 13, 14, 20, 22, 24, 28, 30, 33, 34, 35, 49,
  ];
  let currentNumbers = $state([]);

  function setBallsInvisible() {
    if (firstPress) return;
    for (let i = 0; i < 6; i++) {
      const el = document.querySelector(`#ball-${i}`);
      el.classList.add("hidden");
    }
  }
  function resetBallsAnimation() {
    for (const t of ballAnimationTimeouts) {
      clearTimeout(t);
    }
    for (let i = 0; i < 6; i++) {
      const el = document.querySelector(`#ball-${i}`);
      if (!el) continue;
      el.style.animation = "none";
      ballAnimationTimeouts.push(
        setTimeout(() => {
          el.classList.remove("hidden");
          el.style.animation = "none";
          el.offsetHeight; /* trigger reflow */
          el.style.animation = null;
        }, 200 * i)
      );
      firstPress = false;
    }
  }

  function generateNumbers() {
    const genNumbers = [];
    while (genNumbers.length < 6) {
      const num = Math.ceil(Math.random() * 49);
      if (genNumbers.includes(num)) continue;
      if (chooseOptions === ChooseOptions.OnlyHot && !hotNumbers.includes(num))
        continue;
      if (chooseOptions === ChooseOptions.NoHot && hotNumbers.includes(num))
        continue;
      genNumbers.push(num);
    }
    currentNumbers = genNumbers;
    setBallsInvisible();
    setTimeout(() => {
      resetBallsAnimation();
    }, 0);
  }
</script>

<h2>六合彩神器</h2>
<div class="gen-btn-div">
  <button class="gen-btn" onclick={generateNumbers}>發發發！</button>
</div>
<p>中獎號碼：</p>
<div class="nums">
  {#each currentNumbers as num, idx}
    <p
      id="ball-{idx}"
      style="border: 2.5vw solid {getBallColor(num)};"
      class="result-num ball-animation hidden"
    >
      {num}
    </p>
  {/each}
</div>
<select name="" id="" bind:value={chooseOptions}>
  <option value={ChooseOptions.All}>抽晒全部號碼</option>
  <option value={ChooseOptions.NoHot}>唔抽熱門號碼</option>
  <option value={ChooseOptions.OnlyHot}>淨係抽熱門號碼</option>
</select>
<p>熱門號碼: {hotNumbers}</p>

<style>
  body {
    height: 88vh;
    display: flex;
    flex-direction: column;
  }
  .hidden {
    opacity: 0%;
  }
  .gen-btn-div {
    flex: 1;
    margin: 0%;
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .gen-btn {
    width: 40%;
    height: 100%;
    font-size: 1rem;
  }

  h2 {
    font-size: 3rem;
    text-align: center;
  }

  .nums {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  }

  @keyframes ball-animation {
    0% {
      transform: scale(0, 0) translateY(400px);
      opacity: 0%;
    }

    /* 50% {
      translate: 0px -200px;
    } */

    to {
      transform: scale(100%, 100%) translateY(0px);
      opacity: 100%;
    }
  }

  .ball-animation {
    animation: ball-animation 0.4s ease-out;
  }

  .result-num {
    flex-shrink: 0;
    display: inline-block;
    width: 10vw;
    height: 10vw;
    line-height: 10vw;
    color: black;
    background-color: white;
    font-weight: bolder;
    font-size: 5vw;
    text-align: center;
    border-radius: 100rem;
    margin-right: 1vw;
  }

  @media (max-width: 600px) {
    .nums {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }
</style>
