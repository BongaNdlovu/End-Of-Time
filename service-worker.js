const CACHE_NAME = 'sda-trivia-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/questions.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Add all audio/image assets here
  '/Fear God.png',
  '/correct_answer_1.wav',
  '/correct_answer_2.wav',
  '/WRONG BUZZER 7.wav',
  '/Motionarray_Floraphonic_Gameshow_Buzzer_1.wav',
  '/Semi Impact Risers-001.wav',
  '/ticking_time.wav',
  // '/offline.html', // Uncomment if you add an offline fallback page
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('fetch', event => {
  // SPA navigation fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(response => response || fetch(event.request))
    );
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
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => caches.match('/offline.html'));
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