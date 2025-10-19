# Performance-first improvements to Academy.html (animations intact)

### Goal

Optimize runtime (CPU/GPU, jank) while preserving the current look and animations. Also fix two small correctness issues.

### Quick correctness fixes

- Fix CSS variables scope selector.

```10:20:c:\Users\fanel\OneDrive\Desktop\Academy.html
::root {
  --font-serif: 'Playfair Display', serif;
  --font-sans: 'Montserrat', sans-serif;
  --blood-2: #b10f1a;
  --ink: #0b0b0c;
  --paper: #f0f0f0;
  --highlight-color: #f2c94c;
  --grain: radial-gradient(circle at 20% 10%, rgba(255,255,255,0.08) 0%, transparent 45%),
           radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%),
           radial-gradient(circle at 50% 80%, rgba(255,255,255,0.06) 0%, transparent 40%);
}
```

- Fix decorative quote content.

```313:322:c:\Users\fanel\OneDrive\Desktop\Academy.html
.verse::before {
  content: """;
  // ... other rules ...
}
```

- Proposed correction (new code):

```css
:root { /* replaces ::root */ }
.verse::before { content: "\201C"; }
```

### Runtime optimizations (preserve visuals)

1) Coalesce animation loops into one requestAnimationFrame

- Replace separate rAFs in particles and waves with a single `tick()` driving both. This reduces scheduler overhead and syncs frame timing.

```javascript
// inside initCinematicEffects()
let animationId;

function tick() {
  // particles
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles.forEach(p => { p.update(); p.draw(); });

  // waves
  drawWavesFrame();

  animationId = requestAnimationFrame(tick);
}

// start
animationId = requestAnimationFrame(tick);
```

2) Pause canvases when tab/window is hidden

- Use Page Visibility API to cancel rAF and resume on visible to save CPU/GPU.

```javascript
let running = true;
function onVisibilityChange() {
  const visible = document.visibilityState === 'visible';
  if (!visible && running) { cancelAnimationFrame(animationId); running = false; }
  else if (visible && !running) { running = true; animationId = requestAnimationFrame(tick); }
}
window.addEventListener('visibilitychange', onVisibilityChange);
```

3) Adaptive quality based on device capability

- Derive quality from `navigator.hardwareConcurrency`, viewport area, and clamped DPR; scale `particleCount` and wave `layers` accordingly (looks the same at typical distances).

```javascript
const cores = Math.min(navigator.hardwareConcurrency || 4, 8);
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const area = particleCanvas.clientWidth * particleCanvas.clientHeight;
const quality = (cores >= 6 && area >= 900_000) ? 'high' : (cores >= 4 ? 'med' : 'low');
const particleCount = quality === 'high' ? 60 : quality === 'med' ? 40 : 28;
const waveLayers = quality === 'high' ? 5 : quality === 'med' ? 4 : 3;
```

4) Throttle resize work

- rAF-throttle `sizeCanvases` to avoid repeated expensive resizes while dragging the window.

```javascript
let resizeRaf;
window.addEventListener('resize', () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(sizeCanvases);
});
```

5) Respect reduced-motion for JS animations

- You already set a `reduce-motion` class; gate JS animations too. Animations remain intact by default; only disabled when the user asks for reduced motion.

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!prefersReducedMotion.matches) {
  initCinematicEffects();
}
```

6) Smarter image preloading to cut jank

- Use `img.decoding = 'async'` and `await img.decode()` with `Promise.allSettled` to update progress only after decode, smoothing first render.

```javascript
async function preloadImages() {
  const images = slides.map(s => {
    const img = new Image();
    img.decoding = 'async';
    img.src = s.bgImage;
    return img;
  });
  let loaded = 0;
  await Promise.allSettled(images.map(async img => {
    try {
      if ('decode' in img) await img.decode();
      else await new Promise(r => { img.onload = img.onerror = r; });
    } finally {
      loaded++;
      loadingProgress.textContent = `Loading assets ${Math.round(loaded / images.length * 100)}%`;
    }
  }));
  setTimeout(startPresentation, 300);
}
```

### Acceptance criteria

- Visuals and animation style unchanged at default; only pause in background or when reduced-motion is requested.
- Lower CPU usage when tab is hidden; fewer dropped frames during resize.
- Smooth first slide render (decoded images) with accurate progress updates.
- No regressions to navigation, chat, or slide content.

### To-dos

- [ ] Fix :root selector and .verse::before content string
- [ ] Unify particles and waves into a single requestAnimationFrame loop
- [ ] Pause/resume canvas animations on visibilitychange
- [ ] Implement adaptive particle count and wave layers by capability
- [ ] rAF-throttle canvas resizing to reduce jank
- [ ] Gate JS animations when prefers-reduced-motion is on
- [ ] Use async image decoding for background preload


