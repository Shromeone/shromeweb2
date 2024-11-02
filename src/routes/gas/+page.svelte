<script>
  class Particle {
    constructor(x, y, dirInRadians) {
      this.x = x;
      this.y = y;
      this.dirInRadians = dirInRadians;
    }
  }

  class ParticleHit {
    currentFrame = 0;
    constructor(x, y, frame) {
      this.x = x;
      this.y = y;
      this.frame = frame;
    }
  }
  let alreadySetup = false;

  let temperatureKelvin = $state(298);
  let particleCount = $state(10);
  let hitCount = $state(0);

  /** @type {HTMLCanvasElement} */
  /** @type {Array<Particle>} */
  let particles = [];
  /** @type {Array<ParticleHit>} */
  let particleHits = [];
  let canvas = $state();
  setInterval(drawCanvas, 10);
  let particleSpeed = $derived(Math.sqrt(temperatureKelvin) * 0.15);
  const particleRadius = 5;
  /** @type {CanvasRenderingContext2D} */
  let ctx;

  $effect((particleCount) => spawnParticles());

  function spawnParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      let randomDirection = Math.random() * 2 * Math.PI;
      let randomX =
        particleRadius * 4 +
        Math.random() * (canvas.width - particleRadius * 8);
      let randomY =
        particleRadius * 4 +
        Math.random() * (canvas.height - particleRadius * 8);
      particles.push(new Particle(randomX, randomY, randomDirection));
    }
  }

  function setup() {
    if (!canvas) return;
    spawnParticles();

    temperatureKelvin = 298;
    particleCount = 20;
    alreadySetup = true;
    hitCount = 0;
    ctx = canvas.getContext("2d");
  }

  function drawPartcleHits() {
    for (let h of particleHits) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 7, -1, 1);
      ctx.fillStyle = "red";
      ctx.fill();
      ctx.closePath();

      h.currentFrame += 1;

      if (h.currentFrame > h.frame) {
        particleHits.pop(h);
      }
    }
  }

  function drawBall() {
    for (let p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
      ctx.fillStyle = "yellow";
      ctx.fill();
      ctx.closePath();
    }
    // ctx.rect(20, 40, 50, 50);
  }

  function updateParticlePosition(p) {
    const dx = Math.cos(p.dirInRadians) * particleSpeed;
    const dy = Math.sin(p.dirInRadians) * particleSpeed;

    if (
      p.y + dy + particleRadius > canvas.height ||
      p.y + dy + particleRadius < 0
    ) {
      p.dirInRadians *= -1;
      hitCount += 1;
    }

    if (
      p.x + dx + particleRadius > canvas.width ||
      p.x + dx + particleRadius < 0
    ) {
      p.dirInRadians = Math.PI - p.dirInRadians;
      hitCount += 1;
    }

    if (p.x + dx + particleRadius > canvas.width) {
      particleHits.push(new ParticleHit(canvas.width, p.y, 20));
    }

    p.x += dx;
    p.y += dy;
  }
  function drawCanvas() {
    if (!alreadySetup) {
      setup();
      return;
    }
    if (!canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall();
    drawPartcleHits();
    for (let p of particles) {
      updateParticlePosition(p);
    }
  }
</script>

<canvas bind:this={canvas} width="420" , height="420"></canvas>

<button onclick={setup}>Reset</button>
<p>{hitCount} hits</p>
<input
  type="range"
  min="0"
  max="1500"
  bind:value={temperatureKelvin}
  class="slider"
/>
<span>{temperatureKelvin - 273}°C / {temperatureKelvin}°K</span>

<input
  type="range"
  min="0"
  max="500"
  bind:value={particleCount}
  class="slider"
/>
<span>{particleCount} particle{particleCount > 1 ? "s" : ""}</span>

<style>
  canvas {
    background: var(--dark);
  }
</style>
