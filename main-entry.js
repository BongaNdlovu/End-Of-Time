/**
 * Bootstraps the trivia application by loading the legacy globals
 * and exposing a dynamic importer for the question modules.
 */
import './polyfills.js';
import './firebase-config.js';
import './audio-manager.js';
import './key-facts.js';
import './level-video-map.js';
import './manifest-loader.js';
import './script.js';

const getAssetVersion = () => {
  if (typeof window !== 'undefined' && window.__ASSET_VERSION) {
    return window.__ASSET_VERSION;
  }
  return 'dev';
};

async function loadQuestionsModuleByIndex(idx) {
  const normalized = Math.max(0, Math.min(6, Number(idx)));
  const suffix = normalized + 1;
  const version = getAssetVersion();
  const module = await import(`./questions-level${suffix}.js?v=${version}`);
  const namedKey = `level${suffix}Questions`;
  if (Array.isArray(module?.default)) {
    return module.default;
  }
  if (Array.isArray(module?.[namedKey])) {
    return module[namedKey];
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.__loadQuestionsModule = loadQuestionsModuleByIndex;
}
