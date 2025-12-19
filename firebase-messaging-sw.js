/* Firebase Cloud Messaging service worker */
/* This file MUST be served at the site root: /firebase-messaging-sw.js */
/* If you use a build step, ensure it is copied to the output root. */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.skipWaiting && self.skipWaiting();

firebase.initializeApp({
  apiKey: "AIzaSyAl6zWpFj8Y2RmAiMaR8jauD1SahRTcld4",
  authDomain: "end-of-time-94cd3.firebaseapp.com",
  databaseURL: "https://end-of-time-94cd3-default-rtdb.firebaseio.com",
  projectId: "end-of-time-94cd3",
  storageBucket: "end-of-time-94cd3.firebasestorage.app",
  messagingSenderId: "628602476853",
  appId: "1:628602476853:web:40e3a9fb40963e8811147c",
  measurementId: "G-6L3NKYJFR5"
});

const messaging = firebase.messaging();

// Handle background messages (when page is in the background or closed)
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || 'End of Time';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Focus/open a client when a notification is clicked
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification?.data?.click_action || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    let client = allClients.find(c => c.url.includes(self.location.origin));
    if (client) {
      client.focus();
      try { client.navigate && client.navigate(urlToOpen); } catch(e) {}
    } else {
      await clients.openWindow(urlToOpen);
    }
  })());
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

