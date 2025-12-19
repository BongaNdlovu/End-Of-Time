import { doc, root } from './globals.js';
import { detectPassiveSupport, requestIdle } from './utils.js';

const SMALL_SCREEN_QUERY = '(max-width: 480px)';

const isCanvasAllowed = ({ prefersReducedMotion, smallScreenQuery }) => {
  const isSmallScreen = smallScreenQuery ? smallScreenQuery.matches : root.innerWidth <= 480;
  return !prefersReducedMotion && !isSmallScreen;
};

export const initAnimations = () => {
  const particleCanvas = doc.getElementById('particleCanvas');
  const waveCanvas = doc.getElementById('waveCanvas');

  if (!(particleCanvas instanceof HTMLCanvasElement) || !(waveCanvas instanceof HTMLCanvasElement)) {
    return;
  }

  const supportsPassive = detectPassiveSupport();
  const motionPref = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const prefersReducedMotion = motionPref ? motionPref.matches : false;
  const smallScreenQuery = root.matchMedia ? root.matchMedia(SMALL_SCREEN_QUERY) : null;

  const deviceMemory = typeof root.navigator.deviceMemory === 'number' ? root.navigator.deviceMemory : 8;
  const lowPerfDevice = prefersReducedMotion || deviceMemory <= 4;
  const particleCount = lowPerfDevice ? 40 : 80;
  const waveLayerCount = lowPerfDevice ? 4 : 6;
  const waveStep = lowPerfDevice ? 6 : 4;
  const dprCap = lowPerfDevice ? 1.5 : 2;
  const glitchProbability = lowPerfDevice ? 0.04 : 0.08;

  if (!isCanvasAllowed({ prefersReducedMotion, smallScreenQuery })) {
    particleCanvas.style.display = 'none';
    waveCanvas.style.display = 'none';
    return;
  }

  particleCanvas.style.display = '';
  waveCanvas.style.display = '';

  const pctx = particleCanvas.getContext('2d');
  const ctx = waveCanvas.getContext('2d');
  if (!pctx || !ctx) {
    return;
  }

  const particles = [];

  const sizeParticleCanvas = () => {
    particleCanvas.width = particleCanvas.clientWidth;
    particleCanvas.height = particleCanvas.clientHeight;
  };

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * particleCanvas.width;
      this.y = Math.random() * particleCanvas.height;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.size = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > particleCanvas.width || this.y < 0 || this.y > particleCanvas.height) {
        this.reset();
      }
    }

    draw() {
      pctx.fillStyle = `rgba(177, 15, 26, ${this.alpha})`;
      pctx.beginPath();
      pctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      pctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i += 1) {
    particles.push(new Particle());
  }

  const animateParticles = () => {
    pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });
    if (!root.__canvasesRunning) {
      return;
    }
    root.requestAnimationFrame(animateParticles);
  };

  const lerp = (a, b, n) => a + (b - a) * n;

  const sizeWaveCanvas = () => {
    const dpr = Math.min(root.devicePixelRatio || 1, dprCap);
    waveCanvas.width = Math.floor(waveCanvas.clientWidth * dpr);
    waveCanvas.height = Math.floor(waveCanvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let mouseX = 0;
  waveCanvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
  }, supportsPassive ? { passive: true } : false);

  if ('ResizeObserver' in root) {
    new ResizeObserver(() => {
      sizeWaveCanvas();
      sizeParticleCanvas();
    }).observe(waveCanvas);
  } else {
    root.addEventListener('resize', () => {
      sizeWaveCanvas();
      sizeParticleCanvas();
    });
  }

  let t = 0;
  let pressure = 0;

  waveCanvas.addEventListener('pointermove', (event) => {
    pressure = Math.min(1, (event.pressure || 0.3) + 0.1);
  }, supportsPassive ? { passive: true } : false);

  root.setInterval(() => {
    t += pressure * 4;
    pressure *= 0.95;
  }, 30);

  const draw = () => {
    const width = waveCanvas.clientWidth;
    const height = waveCanvas.clientHeight;
    if (width === 0 || height === 0) {
      if (root.__canvasesRunning) {
        root.requestAnimationFrame(draw);
      }
      return;
    }

    const phase = (Math.sin(t * 0.0006) + 1) / 2;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const mix1 = `rgba(${Math.floor(lerp(255, 12, phase))}, ${Math.floor(lerp(255, 11, phase))}, ${Math.floor(lerp(255, 12, phase))}, 1)`;
    const mix2 = `rgba(${Math.floor(lerp(255, 177, phase))}, ${Math.floor(lerp(255, 15, phase))}, ${Math.floor(lerp(255, 26, phase))}, 1)`;
    gradient.addColorStop(0, mix1);
    gradient.addColorStop(0.65, 'rgba(11,11,12,1)');
    gradient.addColorStop(1, mix2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const mouseFactor = width > 0 ? mouseX / width : 0;
    for (let i = 0; i < waveLayerCount; i += 1) {
      const amplitude = lerp(40, lowPerfDevice ? 110 : 150, i / (waveLayerCount - 1)) * (1 + mouseFactor * 0.3);
      const yBase = lerp(height * 0.35, height * 0.75, i / (waveLayerCount - 1));
      const speed = 0.0007 + i * 0.00015;
      const k = 0.002 + i * 0.0006;

      const colorPhase = (Math.sin(t * 0.0008 + i) * 0.5 + 0.5);
      const r = Math.floor(lerp(255, 127, colorPhase));
      const g = Math.floor(lerp(255, 10, colorPhase));
      const b = Math.floor(lerp(255, 10, colorPhase));

      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (let x = 0; x <= width; x += waveStep) {
        const mouseInfluence = Math.max(0, 1 - Math.abs(x - mouseX) / (lowPerfDevice ? 260 : 200)) * (lowPerfDevice ? 18 : 30);
        const y = yBase + Math.sin(x * k + t * speed) * amplitude * Math.sin(t * 0.0005 + i) + mouseInfluence;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${lerp(0.05, 0.2, i / (waveLayerCount - 1))})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (Math.random() < glitchProbability) {
      const slices = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < slices; s += 1) {
        const sliceHeight = 6 + Math.random() * 20;
        const sliceY = Math.random() * (height - sliceHeight);
        const sliceX = 0;
        const sliceWidth = width;
        const dx = (Math.random() - 0.5) * 15;
        try {
          const imgData = ctx.getImageData(sliceX, sliceY, sliceWidth, sliceHeight);
          ctx.putImageData(imgData, dx, sliceY);
        } catch (error) {
          // Ignore cross-origin or memory errors gracefully.
        }
      }
    }

    t += 16;
    if (!root.__canvasesRunning) {
      return;
    }
    root.requestAnimationFrame(draw);
  };

  sizeWaveCanvas();
  sizeParticleCanvas();

  root.__canvasesRunning = false;

  const startCanvases = () => {
    if (root.__canvasesRunning || !isCanvasAllowed({ prefersReducedMotion, smallScreenQuery })) {
      return;
    }
    root.__canvasesRunning = true;
    root.requestAnimationFrame(draw);
    root.requestAnimationFrame(animateParticles);
  };

  const pauseCanvases = () => {
    root.__canvasesRunning = false;
  };

  const resumeCanvases = () => {
    if (!root.__canvasesRunning) {
      startCanvases();
    }
  };

  root.startCanvases = startCanvases;
  root.pauseCanvases = pauseCanvases;
  root.resumeCanvases = resumeCanvases;

  requestIdle(() => {
    if (isCanvasAllowed({ prefersReducedMotion, smallScreenQuery })) {
      startCanvases();
    }
  });

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden || !isCanvasAllowed({ prefersReducedMotion, smallScreenQuery })) {
      pauseCanvases();
    } else if (!prefersReducedMotion) {
      resumeCanvases();
    }
  });

  if (smallScreenQuery) {
    smallScreenQuery.addEventListener('change', (event) => {
      if (event.matches) {
        pauseCanvases();
      } else if (!prefersReducedMotion) {
        resumeCanvases();
      }
    });
  }
};
