import { doc } from './globals.js';
import { isSeriesEnabled } from './config.js';

export const pruneSeriesLinks = () => {
  if (isSeriesEnabled()) {
    return;
  }
  doc.querySelectorAll('[data-requires-series]').forEach((el) => {
    if (el && typeof el.remove === 'function') {
      el.remove();
    }
  });
};

export const mountSeriesSection = () => {
  if (!isSeriesEnabled()) {
    return;
  }
  const template = doc.getElementById('series-section-template');
  if (!template || !template.content) {
    return;
  }
  const mainEl = doc.querySelector('main');
  if (!mainEl) {
    return;
  }
  const node = template.content.cloneNode(true);
  mainEl.appendChild(node);
};
