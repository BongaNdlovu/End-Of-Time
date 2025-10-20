/* Firebase Cloud Messaging service worker (public dir) */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA78bvzjP-b7K9TPCbIL3ttzPJr07VR8kY",
  authDomain: "end-of-time-94cd3.firebaseapp.com",
  projectId: "end-of-time-94cd3",
  storageBucket: "end-of-time-94cd3.firebasestorage.app",
  messagingSenderId: "628602476853",
  appId: "1:628602476853:web:181df03c3374465811147c",
  measurementId: "G-E5R3NG1533"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'End of Time';
  const options = { body: payload.notification?.body || '', icon: '/icon-192.png' };
  self.registration.showNotification(title, options);
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


