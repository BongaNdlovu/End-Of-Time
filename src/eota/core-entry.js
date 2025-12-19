import { initFeatureFlags, setYearStamp } from './modules/config.js';
import {
  initBodyLoadedState,
  initFadeInObserver,
  initFloatingNav,
  initPageTransition,
  initParallax,
  initScriptureCarousel,
  initSkeletonObserver,
} from './modules/navigation.js';
import { pruneSeriesLinks, mountSeriesSection } from './modules/series.js';
import { initMobileNav } from './modules/mobile-nav.js';
import { registerServiceWorker } from './modules/sw-register.js';
import { ready, requestIdle } from './modules/utils.js';

const loadAnimations = () => import('./modules/animations.js')
  .then(({ initAnimations }) => initAnimations())
  .catch((error) => console.warn('[EOTA] animation module failed', error));

ready(() => {
  initFeatureFlags();
  setYearStamp();
  pruneSeriesLinks();
  mountSeriesSection();

  initFloatingNav();
  initFadeInObserver();
  initScriptureCarousel();
  initParallax();
  initPageTransition();
  initBodyLoadedState();
  initSkeletonObserver();
  initMobileNav();
  registerServiceWorker();

  requestIdle(() => loadAnimations());
});
