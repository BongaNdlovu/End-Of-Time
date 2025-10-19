// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Floating nav on scroll
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 100) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

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
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;

  parallaxElements.forEach((el, index) => {
    const depth = (index + 1) * 0.5;
    el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
  });
});

// 3D Tilt Effect for Cards
const cards = document.querySelectorAll('.presentation-card');

cards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg tilt
    const rotateY = ((x - centerX) / centerX) * 10;

    card.style.transform = `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// Progress Tracking with localStorage
function loadProgress() {
  const presentations = document.querySelectorAll('.presentation-card');

  presentations.forEach(card => {
    const presentationId = card.dataset.presentation;
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

// Touch gesture support for mobile
let touchStartX = 0;
let touchStartY = 0;

cards.forEach(card => {
  card.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  card.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Minimal gesture handling for touch devices
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > 50) {
        // Could add swipe actions here
      }
    }
  });

  card.addEventListener('touchend', () => {
    touchStartX = 0;
    touchStartY = 0;
  });
});

// ===== PARTICLE CANVAS ANIMATION =====
const particleCanvas = document.getElementById('particleCanvas');
const particleCtx = particleCanvas.getContext('2d');

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

// Create particles
const particleCount = 100;
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

  // Draw connections between nearby particles
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

  requestAnimationFrame(animateParticles);
}

animateParticles();

// ===== WAVE CANVAS ANIMATION =====
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx = waveCanvas.getContext('2d');

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

// Mouse interaction with particles
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Repel particles near mouse
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
});

// Export functions for use in other pages
window.genesisPresentation = {
  saveProgress,
  loadProgress
};
