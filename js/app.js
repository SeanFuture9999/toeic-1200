import { addRoute, initRouter } from './router.js';
import { store } from './store.js';
import { schedule } from './data/schedule.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderDaily } from './pages/daily.js';
import { renderReview } from './pages/review.js';
import { renderAllWords } from './pages/allWords.js';
import { renderDictationPage } from './pages/dictationPage.js';

// Routes
addRoute('/', (app) => renderDashboard(app));
addRoute('/today', (app) => {
  const day = Math.min(store.getCurrentDay(), schedule.length);
  location.hash = `#/day/${day}`;
});
addRoute('/day/:n', (app, params) => renderDaily(app, params));
addRoute('/day/:n/method/:m', (app, params) => renderDaily(app, params));
addRoute('/review', (app) => renderReview(app));
addRoute('/words', (app) => renderAllWords(app));
addRoute('/dictation', (app) => renderDictationPage(app));

// Init
initRouter();
