const __GENESIS_LOCAL_DEV__ = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
const genesisDevLog = (...args) => {
    if (__GENESIS_LOCAL_DEV__ && window.console) {
        window.console.log(...args);
    }
};
const genesisDevWarn = (...args) => {
    if (__GENESIS_LOCAL_DEV__ && window.console) {
        window.console.warn(...args);
    }
};

import('./web-vitals.mjs')
    .then(({ onCLS, onINP, onLCP }) => {
        const logMetric = (metric) => genesisDevLog('[web-vitals]', metric.name, Math.round(metric.value), metric);
        onCLS(logMetric);
        onINP(logMetric);
        onLCP(logMetric);
    })
    .catch(() => genesisDevWarn('web-vitals module failed to load'));
