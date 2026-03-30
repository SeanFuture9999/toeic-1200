const routes = [];
let currentCleanup = null;

export function addRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

export function navigate(hash) {
  location.hash = hash;
}

function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';
  for (const route of routes) {
    const regex = new RegExp('^' + route.pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    const match = path.match(regex);
    if (match) return { handler: route.handler, params: match.groups || {} };
  }
  return null;
}

function onHashChange() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  const app = document.getElementById('app');
  const hash = location.hash || '#/';
  const result = matchRoute(hash);

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    const page = item.dataset.page;
    if (page === 'dashboard' && (hash === '#/' || hash === '')) item.classList.add('active');
    else if (page === 'daily' && hash.startsWith('#/day')) item.classList.add('active');
    else if (page === 'daily' && hash === '#/today') item.classList.add('active');
    else if (page === 'dictation' && hash.startsWith('#/dictation')) item.classList.add('active');
    else if (page === 'review' && (hash.startsWith('#/review') || hash.startsWith('#/words'))) item.classList.add('active');
  });

  if (result) {
    app.innerHTML = '';
    app.className = 'fade-in';
    const cleanup = result.handler(app, result.params);
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } else {
    app.innerHTML = '<div class="empty-state"><div class="empty-state-icon">404</div><p>找不到頁面</p></div>';
  }
}

export function initRouter() {
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}
