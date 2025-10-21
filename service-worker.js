const CACHE_NAME = 'sda-trivia-v11';

const CORE_ASSETS = [
  '/',
  '/menu.html',
  '/index.html',
  '/styles.css',
  '/dark-theme.css',
  '/menu-styles.css',
  '/menu-dark-theme.css',
  '/audio-manager.js',
  '/script.js',
  '/firebase-config.js',
  '/questions.js',
  '/questions-level1.js',
  '/questions-level2.js',
  '/questions-level3.js',
  '/questions-level4.js',
  '/questions-level5.js',
  '/questions-level6.js',
  '/questions-level7.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/Fear God.png'
];

const MEDIA_ASSETS = [
  // Background videos (exact casing)
  '/Background.mp4',
  '/Background 1.mp4',
  // Level videos (exact casing)
  '/video 1.mp4',
  '/video 2.mp4',
  '/video 3.mp4',
  '/video 4.mp4',
  '/video 5.mp4',
  '/video 6.mp4',
  '/video 7.mp4',
  // UI/FX audio
  '/Transition.wav',
  '/Transition 2.wav',
  '/correct_answer_1.wav',
  '/correct_answer_2.wav',
  '/WRONG BUZZER 7.wav',
  '/Motionarray_Floraphonic_Gameshow_Buzzer_1.wav',
  '/Semi Impact Risers-001.wav',
  '/ticking_time.wav',
  '/Key Facts.wav',
  // Gameplay SFX pools
  '/Correct 1.wav',
  '/Correct 2.wav',
  '/Correct 3.wav',
  '/Correct 4.wav',
  '/Correct 5.wav',
  '/Correct 6.wav',
  '/Correct 7.wav',
  '/Correct 8.wav',
  '/Correct 9.wav',
  '/Correct 10.wav',
  '/Incorrect 1.wav',
  '/Incorrect 2.wav',
  '/Incorrect 3.wav',
  '/Incorrect 4.wav',
  '/Incorrect 5.wav',
  '/Incorrect 6.wav',
  '/Incorrect 7.wav',
  '/Incorrect 8.wav',
  '/Incorrect 9.wav',
  '/Incorrect 10.wav',
  // Background music tracks
  '/soundtrack 2.mp3',
  '/soundtrack 3.mp3',
  '/soundtrack 4.mp3',
  '/soundtrack 5.mp3',
  '/soundtrack 6.mp3',
  '/soundtrack 7.mp3',
  '/soundtrack 8.mp3'
];

const TRANSITION_SVGS = [
  '/1.svg',
  '/2.svg',
  '/3.svg',
  '/4.svg',
  '/5.svg',
  '/6.svg',
  '/7.svg',
  '/8.svg',
  '/9.svg',
  '/10.svg',
  '/11.svg',
  '/12.svg',
  '/13.svg',
  '/14.svg',
  '/15.svg',
  '/16.svg',
  '/17.svg'
];

async function precacheAssets(cache, urls, options = {}) {
  const { skipPartial = true } = options;
  for (const url of urls) {
    const request = new Request(url, { cache: 'reload' });
    try {
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error(`Request for ${url} failed with status ${response.status}`);
      }
      if (skipPartial && response.status === 206) {
        console.warn(`[SW] Skipping ${url} due to partial (206) response.`);
        continue;
      }
      await cache.put(request, response.clone());
    } catch (error) {
      console.warn(`[SW] Precaching skipped for ${url}:`, error);
    }
  }
}

function shouldCache(request, response) {
  if (!response || !response.ok || response.status === 206) {
    return false;
  }
  if (response.type !== 'basic') {
    return false;
  }
  const requestURL = new URL(request.url);
  return requestURL.origin === self.location.origin;
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (shouldCache(request, networkResponse)) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Navigation request failed, using cached fallback.', error);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const menuFallback = await cache.match('/menu.html');
    const gameFallback = await cache.match('/index.html');
    if (menuFallback) {
      return menuFallback;
    }
    if (gameFallback) {
      return gameFallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await precacheAssets(cache, CORE_ASSETS);
    await precacheAssets(cache, MEDIA_ASSETS);
    await precacheAssets(cache, TRANSITION_SVGS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestURL = new URL(request.url);
  const sameOrigin = requestURL.origin === self.location.origin;

  // Skip Firebase Auth URLs completely (Google OAuth, Firebase domains)
  const isAuthURL = requestURL.hostname.includes('google.com') ||
                    requestURL.hostname.includes('googleapis.com') ||
                    requestURL.hostname.includes('firebase.com') ||
                    requestURL.hostname.includes('firebaseapp.com') ||
                    requestURL.hostname.includes('gstatic.com');

  if (isAuthURL || !sameOrigin) {
    // Let cross-origin requests and auth requests pass through untouched
    return;
  }

  if (request.headers.has('range')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const pathname = new URL(request.url).pathname;
        const ext = (pathname.split('.').pop() || '').toLowerCase();
        const types = { wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', ogg: 'application/octet-stream' };
        return new Response('', { status: 404, statusText: 'Not Found', headers: types[ext] ? { 'Content-Type': types[ext] } : {} });
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(request);
      if (shouldCache(request, response)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const isAudioFile = /\.(wav|mp3|ogg|m4a)$/i.test(pathname);
      const isVideoFile = /\.(mp4|webm|ogg)$/i.test(pathname);

      if (isAudioFile || isVideoFile) {
        console.warn('[SW] Media file failed to load (non-critical):', pathname);
        const ext = (pathname.split('.').pop() || '').toLowerCase();
        const typeByExt = {
          wav: 'audio/wav',
          mp3: 'audio/mpeg',
          ogg: isAudioFile ? 'audio/ogg' : 'video/ogg',
          m4a: 'audio/mp4',
          mp4: 'video/mp4',
          webm: 'video/webm'
        };
        const headers = typeByExt[ext] ? { 'Content-Type': typeByExt[ext] } : {};
        return new Response('', { status: 404, statusText: 'Not Found', headers });
      }

      console.warn('[SW] Fetch failed, attempting fallback.', error);
      const cache = await caches.open(CACHE_NAME);
      const fallback = await cache.match('/menu.html') || await cache.match('/index.html');
      if (fallback) {
        return fallback;
      }
      // Return a generic 404 response instead of throwing
      return new Response('Not Found', { status: 404, statusText: 'Not Found' });
    }
  })());
});

self.addEventListener('message', (event) => {
  try {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'received' });
    } else if (self.clients && self.clients.matchAll) {
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage({ status: 'received' }));
        })
      );
    }
  } catch (error) {
    console.warn('[SW] Message handler error:', error);
  }
});
