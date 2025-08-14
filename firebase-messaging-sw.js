/* Firebase Cloud Messaging service worker */
/* This file MUST be served at the site root: /firebase-messaging-sw.js */
/* If you use a build step, ensure it is copied to the output root. */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.skipWaiting && self.skipWaiting();

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

// Handle notification clicks (both Firebase messages and prayer reminders)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Handle prayer reminder notifications
  if (event.notification.data && event.notification.data.type === 'prayer-reminder') {
    const { reminderId, prayerListId } = event.notification.data;
    
    // Handle action buttons
    if (event.action === 'pray') {
      // Open app and navigate to prayer section
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => {
            // Try to focus existing window
            for (const client of clients) {
              if (client.url.includes(self.location.origin)) {
                client.focus();
                client.postMessage({
                  type: 'notification-action',
                  action: 'pray',
                  reminderId,
                  prayerListId
                });
                return;
              }
            }
            // Open new window if none exists
            return self.clients.openWindow('/');
          })
      );
    } else if (event.action === 'snooze') {
      // Handle snooze action
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'notification-action',
                action: 'snooze',
                reminderId
              });
            });
          })
      );
    } else {
      // Default click (no action button) - open app
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => {
            for (const client of clients) {
              if (client.url.includes(self.location.origin)) {
                client.focus();
                client.postMessage({
                  type: 'notification-click',
                  reminderId,
                  prayerListId
                });
                return;
              }
            }
            return self.clients.openWindow('/');
          })
      );
    }
    return;
  }
  
  // Handle Firebase messaging notifications (existing functionality)
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

