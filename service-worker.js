// Minimal Service Worker for End of Time
// Caches core assets and serves cache-first for same-origin static files

const CACHE_NAME = 'sda-trivia-v29';
const CORE_ASSETS = [
  '/',
  '/menu.html',
  '/index.html',
  '/index1.html',
  '/End Of Time Academy.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/slides.json',
  '/firebase-config.js',
  // CSS
  '/styles.min.css',
  '/dark-theme.min.css',
  '/menu-styles.min.css',
  '/menu-dark-theme.min.css',
  '/styles1.min.css',
  '/styles1.min.css.map',
  '/tailwind-output.min.css',
  // JS
  '/polyfills.js',
  '/script.min.js',
  '/app.min.js',
  '/app.min.js.map',
  '/auth-leaderboard.js',
  '/menu.min.js',
  '/manifest-loader.min.js',
  '/level-video-map.min.js',
  '/genesis-web-vitals.min.js',
  '/genesis-animations.min.js',
  // Audio assets
  '/ticking_time.wav',
  // EOTA bundles
  '/dist/eota/index.html',
  '/dist/eota/styles-compiled.css',
  '/dist/eota/styles-inline.css',
  '/dist/eota/core.js',
  '/dist/eota/tabs.js',
  '/dist/eota/analytics.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS.filter(Boolean));
    } catch (e) {
      // best-effort
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); }));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // Navigation requests: network-first, fall back to cache
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone()).catch(() => {});
        return net;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req, { ignoreSearch: true });
        return cached || Response.error();
      }
    })());
    return;
  }

  // Same-origin static: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net && net.ok) cache.put(req, net.clone()).catch(() => {});
        return net;
      } catch (e) {
        // Return cached version if available, otherwise return an empty response
        // instead of Response.error() to avoid console warnings
        if (cached) return cached;
        // For audio/video files, return an empty response with proper content type
        const ext = url.pathname.split('.').pop().toLowerCase();
        if (['wav', 'mp3', 'ogg', 'mp4', 'webm'].includes(ext)) {
          return new Response(new ArrayBuffer(0), {
            status: 200,
            statusText: 'OK (offline placeholder)',
            headers: { 'Content-Type': ext === 'mp4' || ext === 'webm' ? 'video/' + ext : 'audio/' + ext }
          });
        }
        // For other resources, return a basic offline response
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })());
  }
});
