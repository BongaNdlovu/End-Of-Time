(function(){
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Conditional video auto-play based on connection speed
  (function handleVideoPlayback(){
    const video = document.getElementById('genesisVideo');
    if (!video) return;

    // Check effective connection type
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection ? connection.effectiveType : '4g';
    const isSlowConnection = effectiveType === '2g' || effectiveType === '3g' || effectiveType === 'slow-2g';

    // Check if user has reduced motion preference
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Only auto-play on fast connections and if not reduced-motion
    if (!isSlowConnection && !prefersReducedMotion) {
      // Set preload to auto for faster playback
      video.preload = 'auto';
      // Attempt auto-play
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Auto-play prevented by browser - this is expected on many mobile devices
          // Video will still load on demand or when user interacts
        });
      }
    } else {
      // On slow connections, only load metadata
      video.preload = 'metadata';
    }
  })();

  function debounce(fn, delay){ let t; return function(){ const ctx=this, args=arguments; clearTimeout(t); t=setTimeout(() => fn.apply(ctx,args), delay); }; }
  let __supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', { get(){ __supportsPassive = true; } });
    window.addEventListener('test', null, opts);
    window.removeEventListener('test', null, opts);
  } catch (e) {}

  const nav = document.getElementById('mainNav');
  const onScrollNav = debounce(() => {
    if (!nav) return;
    if (window.scrollY > 100) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
  }, 50);
  window.addEventListener('scroll', onScrollNav, __supportsPassive ? { passive: true } : false);

  const fadeElements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  fadeElements.forEach((el) => observer.observe(el));

  const parallaxElements = document.querySelectorAll('.parallax');
  let __px = 0, __py = 0, __parallaxRAF = null;
  function applyParallax(){
    __parallaxRAF = null;
    const x = ( __px / window.innerWidth - 0.5) * 20;
    const y = ( __py / window.innerHeight - 0.5) * 20;
    for (let i = 0; i < parallaxElements.length; i++) {
      const depth = (i + 1) * 0.5;
      parallaxElements[i].style.transform = `translate(${x * depth}px, ${y * depth}px)`;
    }
  }
  window.addEventListener('mousemove', (e) => {
    __px = e.clientX; __py = e.clientY;
    if (__parallaxRAF == null) __parallaxRAF = requestAnimationFrame(applyParallax);
  }, __supportsPassive ? { passive: true } : false);

  const motionPref = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const prefersReducedMotion = motionPref ? motionPref.matches : false;
  const deviceMemory = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : 8;
  const isLowPerfDevice = prefersReducedMotion || deviceMemory <= 4;
  const dprCap = isLowPerfDevice ? 1.5 : 2;

  const particleCanvas = document.getElementById('particleCanvas');
  const particleCtx = particleCanvas.getContext('2d');
  const heroEl = document.querySelector('.hero');

  function resizeParticleCanvas(){
    const heroHeight = heroEl ? heroEl.offsetHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    particleCanvas.width = Math.floor(window.innerWidth * dpr);
    particleCanvas.height = Math.floor(heroHeight * dpr);
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const resizeParticlesDebounced = debounce(resizeParticleCanvas, 150);
  window.addEventListener('resize', resizeParticlesDebounced, __supportsPassive ? { passive: true } : false);
  resizeParticleCanvas();

  const PARTICLE_COUNT = isLowPerfDevice ? 50 : 100;
  const CONNECT_DISTANCE = isLowPerfDevice ? 80 : 100;
  const particles = [];
  const speedRange = isLowPerfDevice ? 0.3 : 0.5;

  class Particle {
    constructor(){
      this.reset();
    }
    reset(){
      this.x = Math.random() * particleCanvas.width;
      this.y = Math.random() * particleCanvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * speedRange;
      this.speedY = (Math.random() - 0.5) * speedRange;
      this.opacity = Math.random() * 0.5 + 0.2;
    }
    update(mouseX, mouseY){
      this.x += this.speedX;
      this.y += this.speedY;
      if (mouseX != null && mouseY != null) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          const force = (100 - distance) / 100;
          this.x += (dx / (distance || 1)) * force * 2;
          this.y += (dy / (distance || 1)) * force * 2;
        }
      }
      if (this.x > particleCanvas.width) this.x = 0;
      if (this.x < 0) this.x = particleCanvas.width;
      if (this.y > particleCanvas.height) this.y = 0;
      if (this.y < 0) this.y = particleCanvas.height;
    }
    draw(ctx){
      ctx.fillStyle = `rgba(168, 168, 168, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  const waveCanvas = document.getElementById('waveCanvas');
  const waveCtx = waveCanvas.getContext('2d');
  function resizeWaveCanvas(){
    const heroHeight = heroEl ? heroEl.offsetHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    waveCanvas.width = Math.floor(window.innerWidth * dpr);
    waveCanvas.height = Math.floor(heroHeight * dpr);
    waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const resizeWavesDebounced = debounce(resizeWaveCanvas, 150);
  window.addEventListener('resize', resizeWavesDebounced, __supportsPassive ? { passive: true } : false);
  resizeWaveCanvas();

  const waveConfigs = isLowPerfDevice
    ? [
        { multiplier: 0.4, amplitude: 22, frequency: 0.005, color: '177, 15, 26', alpha: 0.025 },
        { multiplier: 0.7, amplitude: 16, frequency: 0.007, color: '139, 0, 0', alpha: 0.018 }
      ]
    : [
        { multiplier: 0.5, amplitude: 30, frequency: 0.005, color: '177, 15, 26', alpha: 0.03 },
        { multiplier: 0.8, amplitude: 20, frequency: 0.008, color: '139, 0, 0', alpha: 0.02 },
        { multiplier: 1.2, amplitude: 40, frequency: 0.003, color: '102, 0, 0', alpha: 0.015 }
      ];

  let waveOffset = 0;
  let mouseX = null;
  let mouseY = null;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, __supportsPassive ? { passive: true } : false);

  let __particleRAF = null;
  function animateParticles(){
    if (!window.__visualsRunning) return;
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach((particle) => {
      particle.update(mouseX, mouseY);
      particle.draw(particleCtx);
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < CONNECT_DISTANCE) {
          particleCtx.strokeStyle = `rgba(168, 168, 168, ${0.1 * (1 - distance / CONNECT_DISTANCE)})`;
          particleCtx.lineWidth = 0.5;
          particleCtx.beginPath();
          particleCtx.moveTo(particles[i].x, particles[i].y);
          particleCtx.lineTo(particles[j].x, particles[j].y);
          particleCtx.stroke();
        }
      }
    }
    __particleRAF = requestAnimationFrame(animateParticles);
  }

  let __waveRAF = null;
  function drawWave({ multiplier, amplitude, frequency, color, alpha }){
    waveCtx.beginPath();
    waveCtx.moveTo(0, waveCanvas.height / 2);
    const step = isLowPerfDevice ? 4 : 2;
    for (let x = 0; x <= waveCanvas.width; x += step) {
      const y = Math.sin((x + waveOffset * multiplier) * frequency) * amplitude + waveCanvas.height / 2;
      waveCtx.lineTo(x, y);
    }
    waveCtx.lineTo(waveCanvas.width, waveCanvas.height);
    waveCtx.lineTo(0, waveCanvas.height);
    waveCtx.closePath();
    const gradient = waveCtx.createLinearGradient(0, 0, 0, waveCanvas.height);
    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(0.5, `rgba(${color}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${color}, ${alpha})`);
    waveCtx.fillStyle = gradient;
    waveCtx.fill();
  }

  function animateWaves(){
    if (!window.__visualsRunning) return;
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    waveConfigs.forEach(drawWave);
    waveOffset += isLowPerfDevice ? 0.6 : 1;
    __waveRAF = requestAnimationFrame(animateWaves);
  }

  window.__visualsRunning = false;
  function startVisuals(){
    if (window.__visualsRunning || prefersReducedMotion) return;
    window.__visualsRunning = true;
    animateParticles();
    animateWaves();
  }
  function pauseVisuals(){
    window.__visualsRunning = false;
    if (__particleRAF) { cancelAnimationFrame(__particleRAF); __particleRAF = null; }
    if (__waveRAF) { cancelAnimationFrame(__waveRAF); __waveRAF = null; }
  }
  function resumeVisuals(){
    if (window.__visualsRunning || (motionPref && motionPref.matches)) return;
    window.__visualsRunning = true;
    animateParticles();
    animateWaves();
  }

  const __ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  __ric(() => { if (!prefersReducedMotion) startVisuals(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseVisuals(); else resumeVisuals();
  });
  if (motionPref && typeof motionPref.addEventListener === 'function') {
    motionPref.addEventListener('change', (event) => {
      if (event.matches) {
        pauseVisuals();
        particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      } else {
        resizeParticleCanvas();
        resizeWaveCanvas();
        resumeVisuals();
      }
    });
  }

  // Smooth Page Transitions
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
  });

  const transitionLinks = document.querySelectorAll('a[href*=".html"]:not([href="#"]):not([href*="#"]), a[href="menu.html"]');
  const transitionOverlay = document.getElementById('pageTransition');
  transitionLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!transitionOverlay) return;
      e.preventDefault();
      const targetUrl = link.getAttribute('href');
      transitionOverlay.classList.add('active');
      setTimeout(() => { window.location.href = targetUrl; }, 300);
    });
  });
})();
