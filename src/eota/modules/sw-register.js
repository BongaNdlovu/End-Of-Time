import { root } from './globals.js';

const SW_PATH = 'service-worker.js';

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  root.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_PATH).catch((error) => {
      console.warn('[EOTA] service worker registration failed', error);
    });
  });
};
