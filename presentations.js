// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Conditional video auto-play based on connection speed
(function handleVideoPlayback(){
  const video = document.getElementById('genesisVideoY') || document.querySelector('.genesis-y-video');
  if (!video) return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = connection ? connection.effectiveType : '4g';
  const isSlowConnection = effectiveType === '2g' || effectiveType === '3g' || effectiveType === 'slow-2g';
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isSlowConnection && !prefersReducedMotion) {
    video.preload = 'auto';
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
  } else {
    video.preload = 'metadata';
  }
})();

// Floating nav on scroll
const nav = document.getElementById('mainNav');
if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
}

// Intersection Observer for fade-ins
const fadeElements = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

fadeElements.forEach(el => observer.observe(el));

// Parallax effect for navigation
const parallaxElements = document.querySelectorAll('.parallax');
const parallaxQuery = window.matchMedia ? window.matchMedia('(pointer: fine)') : null;
let parallaxAttached = false;

const handleParallaxMove = (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;

  parallaxElements.forEach((el, index) => {
    const depth = (index + 1) * 0.5;
    el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
  });
};

const toggleParallax = () => {
  const shouldAttach = (parallaxQuery ? parallaxQuery.matches : true) && parallaxElements.length > 0;
  if (shouldAttach && !parallaxAttached) {
    window.addEventListener('pointermove', handleParallaxMove);
    parallaxAttached = true;
  } else if (!shouldAttach && parallaxAttached) {
    window.removeEventListener('pointermove', handleParallaxMove);
    parallaxAttached = false;
    parallaxElements.forEach((el) => { el.style.transform = ''; });
  }
};

if (parallaxElements.length) {
  toggleParallax();
  if (parallaxQuery) {
    if (typeof parallaxQuery.addEventListener === 'function') {
      parallaxQuery.addEventListener('change', toggleParallax);
    } else if (typeof parallaxQuery.addListener === 'function') {
      parallaxQuery.addListener(toggleParallax);
    }
  }
}

// 3D Tilt Effect for Cards
const cards = Array.from(document.querySelectorAll('.presentation-card'));

const finePointerQuery = window.matchMedia ? window.matchMedia('(pointer: fine)') : null;
if (!finePointerQuery || finePointerQuery.matches) {
  cards.forEach(card => {
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

// Progress Tracking with localStorage
function loadProgress() {
  const presentations = document.querySelectorAll('.presentation-card');

  presentations.forEach(card => {
    const presentationId = card.dataset.presentation;
    if (!presentationId) return;
    
    const storageKey = `genesis-presentation-${presentationId}-progress`;
    const progress = localStorage.getItem(storageKey) || '0';

    const progressFill = card.querySelector('.progress-fill');
    const progressText = card.querySelector('.progress-text');

    if (progressFill && progressText) {
      progressFill.style.width = `${progress}%`;
      progressFill.dataset.progress = progress;
      progressText.textContent = `${progress}%`;
    }
  });
}

// Save progress (called from presentation pages)
function saveProgress(presentationId, progress) {
  const storageKey = `genesis-presentation-${presentationId}-progress`;
  localStorage.setItem(storageKey, progress.toString());
}

// Initialize progress on load
loadProgress();

// Pointer-based swipe navigation for mobile
const swipeState = new WeakMap();
const SWIPE_THRESHOLD = 32;
const SWIPE_TIME_LIMIT = 600;

const vibrate = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
  } catch (_) {}
};

const highlightCard = (card) => {
  if (!card) return;
  card.classList.add('card-swipe-highlight');
  setTimeout(() => card.classList.remove('card-swipe-highlight'), 600);
};

const focusSiblingCard = (card, direction) => {
  const index = cards.indexOf(card);
  if (index === -1) return;
  const target = cards[index + direction];
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  highlightCard(target);
  vibrate();
};

cards.forEach(card => {
  card.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    card.setPointerCapture(event.pointerId);
    swipeState.set(card, {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      time: performance.now()
    });
  });

  card.addEventListener('pointerup', (event) => {
    const state = swipeState.get(card);
    if (!state || state.pointerId !== event.pointerId) return;
    try {
      card.releasePointerCapture(event.pointerId);
    } catch (_) {}
    swipeState.delete(card);

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const duration = Math.max(performance.now() - state.time, 1);

    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || duration > SWIPE_TIME_LIMIT) return;

    const direction = deltaX < 0 ? 1 : -1;
    focusSiblingCard(card, direction);
  });

  card.addEventListener('pointercancel', () => {
    swipeState.delete(card);
  });
});

// ===== PARTICLE CANVAS ANIMATION (DEFERRED) =====
// Defer canvas animations until after page load for better performance
function initParticleAnimation() {
  const particleCanvas = document.getElementById('particleCanvas');
  if (!particleCanvas) return;
  
  const particleCtx = particleCanvas.getContext('2d', { alpha: true, desynchronized: true });

  function resizeParticleCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = document.querySelector('.hero').offsetHeight;
  }

  resizeParticleCanvas();
  window.addEventListener('resize', resizeParticleCanvas);

  class Particle {
    constructor() {
      this.x = Math.random() * particleCanvas.width;
      this.y = Math.random() * particleCanvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      // Wrap around edges
      if (this.x > particleCanvas.width) this.x = 0;
      if (this.x < 0) this.x = particleCanvas.width;
      if (this.y > particleCanvas.height) this.y = 0;
      if (this.y < 0) this.y = particleCanvas.height;
    }

    draw() {
      particleCtx.fillStyle = `rgba(168, 168, 168, ${this.opacity})`;
      particleCtx.beginPath();
      particleCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      particleCtx.fill();
    }
  }

  // Reduce particles on mobile for better performance
  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 30 : 100;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    // Draw connections between nearby particles (skip on mobile)
    if (!isMobile) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            particleCtx.strokeStyle = `rgba(168, 168, 168, ${0.1 * (1 - distance / 100)})`;
            particleCtx.lineWidth = 0.5;
            particleCtx.beginPath();
            particleCtx.moveTo(particles[i].x, particles[i].y);
            particleCtx.lineTo(particles[j].x, particles[j].y);
            particleCtx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(animateParticles);
  }

  animateParticles();

  // Mouse interaction with particles (only if particles exist)
  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseX = e.clientX;
    mouseY = e.clientY;

    particles.forEach(particle => {
      const dx = particle.x - mouseX;
      const dy = particle.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.x += (dx / distance) * force * 2;
        particle.y += (dy / distance) * force * 2;
      }
    });
  }, { passive: true });
}

// Defer animation start until page is loaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => setTimeout(initParticleAnimation, 100));
} else {
  setTimeout(initParticleAnimation, 100);
}

// ===== WAVE CANVAS ANIMATION (DEFERRED) =====
function initWaveAnimation() {
  const waveCanvas = document.getElementById('waveCanvas');
  if (!waveCanvas) return;
  
  const waveCtx = waveCanvas.getContext('2d', { alpha: true, desynchronized: true });

  function resizeWaveCanvas() {
    waveCanvas.width = window.innerWidth;
    waveCanvas.height = document.querySelector('.hero').offsetHeight;
  }

  resizeWaveCanvas();
  window.addEventListener('resize', resizeWaveCanvas);

  let waveOffset = 0;

  function drawWave(offset, amplitude, frequency, color, alpha) {
    waveCtx.beginPath();
    waveCtx.moveTo(0, waveCanvas.height / 2);

    for (let x = 0; x < waveCanvas.width; x++) {
      const y = Math.sin((x + offset) * frequency) * amplitude + waveCanvas.height / 2;
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

  function animateWaves() {
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

    // Multiple wave layers with blood-red theme
    drawWave(waveOffset * 0.5, 30, 0.005, '177, 15, 26', 0.03);
    drawWave(waveOffset * 0.8, 20, 0.008, '139, 0, 0', 0.02);
    drawWave(waveOffset * 1.2, 40, 0.003, '102, 0, 0', 0.015);

    waveOffset += 1;

    requestAnimationFrame(animateWaves);
  }

  animateWaves();
}

// Defer wave animation start until page is loaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => setTimeout(initWaveAnimation, 100));
} else {
  setTimeout(initWaveAnimation, 100);
}

// Export functions for use in other pages
window.genesisPresentation = {
  saveProgress,
  loadProgress
};
