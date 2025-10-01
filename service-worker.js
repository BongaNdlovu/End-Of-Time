const CACHE_NAME = 'sda-trivia-v7';

// Core assets that can be cached safely (no range requests)
const CORE_ASSETS = [
  '/',
  '/menu.html',
  '/index.html',
  '/menu-styles.css',
  '/styles.css',
  '/audio-manager.js',
  '/script.js',
  '/questions.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/Fear God.png'
];

// Media files to skip during install (cause 206 responses)
// These will be cached on-demand when first accessed
const SKIP_CACHE = [
  '/background.mp4',
  '/Transition.wav',
  '/Transition 2.wav',
  '/soundtrack 1.mp3',
  '/correct_answer_1.wav',
  '/correct_answer_2.wav',
  '/WRONG BUZZER 7.wav',
  '/Motionarray_Floraphonic_Gameshow_Buzzer_1.wav',
  '/Semi Impact Risers-001.wav',
  '/ticking_time.wav'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache core assets one by one to avoid partial response errors
      const cachePromises = CORE_ASSETS.map(async url => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`Failed to cache ${url}:`, err);
        }
      });

      await Promise.all(cachePromises);
      console.log('✅ Service worker installed successfully');
    })
  );
});
self.addEventListener('fetch', event => {
  // Skip chrome-extension and other invalid URLs
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Navigation fallback: prefer menu, then game
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const menu = await cache.match('/menu.html');
        const game = await cache.match('/index.html');
        return menu || game || await fetch(event.request);
      } catch (err) {
        console.error('Navigation fetch failed:', err);
        // Return a basic offline page or cached content
        const cache = await caches.open(CACHE_NAME);
        return cache.match('/index.html');
      }
    })());
    return;
  }

  // Cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).then(response => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses (excluding media files during runtime)
        caches.open(CACHE_NAME).then(cache => {
          // Only cache non-media files to avoid 206 errors
          const url = new URL(event.request.url);
          const shouldCache = !SKIP_CACHE.some(skip => url.pathname.endsWith(skip));

          if (shouldCache) {
            cache.put(event.request, responseToCache);
          }
        });

        return response;
      }).catch(err => {
        console.warn('Fetch failed for:', event.request.url, err);
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
}); 

// Generic message responder so pages can confirm SW connectivity
self.addEventListener('message', (event) => {
  try {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'received' });
    } else if (self.clients && self.clients.matchAll) {
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
          clients.forEach(client => client.postMessage({ status: 'received' }));
        })
      );
    }
  } catch (e) {}
});