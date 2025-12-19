import { root } from './globals.js';

let passiveCached = null;

export const detectPassiveSupport = () => {
  if (passiveCached !== null) {
    return passiveCached;
  }
  passiveCached = false;
  try {
    const passiveOptions = Object.defineProperty({}, 'passive', {
      get() {
        passiveCached = true;
        return true;
      },
    });
    const noop = () => {};
    root.addEventListener('passive-test', noop, passiveOptions);
    root.removeEventListener('passive-test', noop, passiveOptions);
  } catch (error) {
    passiveCached = false;
  }
  return passiveCached;
};

export const debounce = (fn, delay = 0) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(null, args), delay);
  };
};

export const ready = (callback) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
};

export const requestIdle = (callback) => {
  if ('requestIdleCallback' in root) {
    return root.requestIdleCallback(callback);
  }
  return root.setTimeout(callback, 1);
};

export const focusElement = (element) => {
  if (!element || typeof element.focus !== 'function') {
    return;
  }
  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }
};
