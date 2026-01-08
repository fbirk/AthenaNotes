import { initRouter } from './router.js';
import { createAppState } from './state.js';

const state = createAppState();
let isInitialized = false;

/**
 * Check if the application is initialized (has configuration)
 * @returns {Promise<boolean>}
 */
async function checkInitialization() {
  try {
    // Check if API is available
    if (!window.knowledgeBase || typeof window.knowledgeBase.invoke !== 'function') {
      console.error('window.knowledgeBase is not available');
      return false;
    }

    const result = await window.knowledgeBase.invoke('config.get');
    return result.success && result.data !== null;
  } catch (error) {
    console.error('Failed to check initialization:', error);
    return false;
  }
}

function mountNavigation() {
  const header = document.querySelector('.app-header');
  if (!header || header.querySelector('.navigation')) {
    return;
  }

  const nav = document.createElement('div');
  nav.className = 'navigation';

  ['#/notes', '#/todos', '#/projects', '#/snippets', '#/tools'].forEach((route) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = route.replace('#/', '').replace(/\b\w/g, l => l.toUpperCase());
    button.addEventListener('click', () => {
      window.location.hash = route;
    });
    nav.append(button);
  });

  header.append(nav);
}

/**
 * Initialize the application
 */
export async function bootstrap() {
  // Check if app is initialized
  isInitialized = await checkInitialization();

  if (!isInitialized) {
    // Redirect to setup wizard
    window.location.hash = '#/setup';
  } else {
    // Mount navigation for initialized app
    mountNavigation();
  }

  // Initialize router
  initRouter(state);

  // Listen for setup completion
  window.addEventListener('setup-complete', async () => {
    isInitialized = true;
    mountNavigation();
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
