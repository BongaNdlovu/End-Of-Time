const CACHE_NAME = 'sda-trivia-v4';
const ASSETS = [
  '/',
  '/menu.html',
  '/index.html',
  '/menu-styles.css',
  '/styles.css',
  '/script.js',
  '/questions.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/Fear God.png',
  '/background.mp4',
  '/Transition.wav',
  '/Transition 2.wav',
  '/soundtrack 1.mp3',
  '/correct_answer_1.wav',
  '/correct_answer_2.wav',
  '/WRONG BUZZER 7.wav',
  '/Motionarray_Floraphonic_Gameshow_Buzzer_1.wav',
  '/Semi Impact Risers-001.wav',
  '/ticking_time.wav',
  // '/offline.html', // Optional offline fallback
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('fetch', event => {
  // Handle navigation requests: prefer network, then exact cache, then fallbacks
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Let the network decide (so index.html can run its redirect logic)
        return await fetch(event.request);
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        // Try to return the exact requested page from cache
        const exact = await cache.match(event.request);
        if (exact) return exact;
        // Fallbacks: menu first, then game
        const menu = await cache.match('/menu.html');
        if (menu) return menu;
        const game = await cache.match('/index.html');
        if (game) return game;
        // Last resort
        return caches.match('/');
      }
    })());
    return;
  }
  // Stale-while-revalidate (optional, for assets like questions.js)
  // if (event.request.url.endsWith('questions.js')) {
  //   event.respondWith(
  //     caches.open(CACHE_NAME).then(cache =>
  //       fetch(event.request).then(response => {
  //         cache.put(event.request, response.clone());
  //         return response;
  //       }).catch(() => caches.match(event.request))
  //     )
  //   );
  //   return;
  // }
  // Error handling/offline fallback
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
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