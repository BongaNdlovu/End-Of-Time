import { doc, root } from './globals.js';

export const initFeatureFlags = () => {
  root.EOTA_FEATURES = Object.assign({ seriesEnabled: false }, root.EOTA_FEATURES || {});
  root.SERIES = root.SERIES || [];
};

export const setYearStamp = () => {
  const yearEl = doc.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
};

export const isSeriesEnabled = () => !!(root.EOTA_FEATURES && root.EOTA_FEATURES.seriesEnabled);
