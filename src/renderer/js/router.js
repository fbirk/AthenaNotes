const routes = new Map([
  ['#/setup', () => '<div class="placeholder-panel">Setup wizard coming soon.</div>'],
  ['#/notes', () => '<div class="placeholder-panel">Notes UI coming soon.</div>'],
  ['#/todos', () => '<div class="placeholder-panel">Todos UI coming soon.</div>'],
  ['#/projects', () => '<div class="placeholder-panel">Projects UI coming soon.</div>'],
]);

function renderRoute(state) {
  const view = document.getElementById('view');
  if (!view) {
    return;
  }

  const hash = window.location.hash || '#/setup';
  state.currentRoute = hash;
  const template = routes.get(hash) ?? (() => '<div class="placeholder-panel">Coming soon.</div>');
  view.innerHTML = template(state);
}

export function initRouter(state) {
  window.addEventListener('hashchange', () => renderRoute(state));
  renderRoute(state);
}
