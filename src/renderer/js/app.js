import { initRouter } from './router.js';
import { createAppState } from './state.js';

const state = createAppState();

function mountNavigation() {
  const header = document.querySelector('.app-header');
  if (!header || header.querySelector('.navigation')) {
    return;
  }

  const nav = document.createElement('div');
  nav.className = 'navigation';

  ['#/setup', '#/notes', '#/todos', '#/projects'].forEach((route) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = route.replace('#/', '').toUpperCase();
    button.addEventListener('click', () => {
      window.location.hash = route;
    });
    nav.append(button);
  });

  header.append(nav);
}

export function bootstrap() {
  mountNavigation();
  initRouter(state);
}

document.addEventListener('DOMContentLoaded', bootstrap);
