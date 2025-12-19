import { requestIdle } from './modules/utils.js';

const loadAnalytics = () => import('./modules/analytics.js')
  .then(({ initAnalytics }) => initAnalytics())
  .catch((error) => console.warn('[EOTA] analytics module failed', error));

requestIdle(() => loadAnalytics());
