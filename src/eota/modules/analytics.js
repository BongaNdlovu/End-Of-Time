import { root } from './globals.js';

const metrics = {
  lcp: null,
  cls: 0,
  fid: null,
  inp: null,
};

const flushMetrics = () => {
  const payload = {
    lcp: metrics.lcp ? Math.round(metrics.lcp) : null,
    cls: Number(metrics.cls.toFixed(4)),
    fid: metrics.fid ? Math.round(metrics.fid) : null,
    inp: metrics.inp ? Math.round(metrics.inp) : null,
    navigationType: performance?.getEntriesByType?.('navigation')?.[0]?.type ?? 'navigate',
    timestamp: Date.now(),
  };
  if (typeof navigator.sendBeacon === 'function' && root.__EOTA_ANALYTICS_ENDPOINT__) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(root.__EOTA_ANALYTICS_ENDPOINT__, blob);
  } else {
    console.info('[EOTA analytics]', payload);
  }
};

const configureLCP = () => {
  if (!('PerformanceObserver' in root)) {
    return;
  }
  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    // ignore
  }
};

const configureCLS = () => {
  if (!('PerformanceObserver' in root)) {
    return;
  }
  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cls += entry.value;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    // ignore
  }
};

const configureFID = () => {
  if (!('PerformanceObserver' in root) || !('PerformanceEventTiming' in root)) {
    return;
  }
  try {
    const observer = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) {
        metrics.fid = firstInput.processingStart - firstInput.startTime;
      }
      observer.disconnect();
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    // ignore
  }
};

// Approximate INP by tracking the longest event duration across lifecycle
const configureINP = () => {
  if (!('PerformanceObserver' in root) || !('PerformanceEventTiming' in root)) {
    return;
  }
  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const dur = typeof entry.duration === 'number' ? entry.duration : 0;
        if (!metrics.inp || dur > metrics.inp) {
          metrics.inp = dur;
        }
      }
    });
    // durationThreshold filters out short taps; 40ms aligns with Web Vitals guidance
    observer.observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (error) {
    // ignore
  }
};

export const initAnalytics = () => {
  configureLCP();
  configureCLS();
  configureFID();
  configureINP();

  const flush = () => flushMetrics();
  root.addEventListener('pagehide', flush, { once: true });
  root.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  }, { once: true });
};
