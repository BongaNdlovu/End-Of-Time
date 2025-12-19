import { exposeLegacyAPI, initTabs } from './modules/tabs.js';
import { ready } from './modules/utils.js';

ready(() => {
  initTabs();
  exposeLegacyAPI();
});
