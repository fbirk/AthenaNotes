import { initRouter } from './router.js';
import { createAppState } from './state.js';
import { TodosPinnedHeader } from './components/todos-pinned-header.js';

const state = createAppState();
let isInitialized = false;
let todosPinnedHeader = null;

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

async function displayAppVersion() {
  const versionEl = document.getElementById('app-version');
  if (!versionEl) return;

  try {
    const result = await window.knowledgeBase.invoke('app.getVersion');
    if (result.success) {
      versionEl.textContent = `v${result.data}`;
    }
  } catch (error) {
    console.error('Failed to get app version:', error);
  }
}

/**
 * Setup help popup functionality
 */
function setupHelpPopup() {
  const helpBtn = document.getElementById('help-btn');
  const helpPopup = document.getElementById('help-popup');
  const container = document.querySelector('.help-button-container');

  if (!helpBtn || !helpPopup || !container) return;

  // Show popup on hover over button
  helpBtn.addEventListener('mouseenter', () => {
    helpPopup.classList.add('visible');
  });

  // Hide popup when mouse leaves the container (button + popup area)
  container.addEventListener('mouseleave', () => {
    helpPopup.classList.remove('visible');
  });

  // Hide popup on focus lost (when tabbing away)
  helpBtn.addEventListener('blur', () => {
    helpPopup.classList.remove('visible');
  });
}

function mountNavigation() {
  const navContainer = document.getElementById('app-navigation');
  if (!navContainer || navContainer.querySelector('.navigation')) {
    return;
  }

  const nav = document.createElement('div');
  nav.className = 'navigation';

  ['#/notes', '#/daily-todos', '#/todos', '#/projects', '#/roadmaps', '#/snippets', '#/tools'].forEach((route) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = route.replace('#/', '').replace(/\b\w/g, l => l.toUpperCase());
    button.addEventListener('click', () => {
      window.location.hash = route;
    });
    nav.append(button);
  });

  navContainer.append(nav);
}

/**
 * Initialize the application
 */
export async function bootstrap() {
  // Display app version
  displayAppVersion();

  // Setup help popup (always available)
  setupHelpPopup();

  // Check if app is initialized
  isInitialized = await checkInitialization();

  if (!isInitialized) {
    // Redirect to setup wizard
    window.location.hash = '#/setup';
  } else {
    // Mount navigation for initialized app
    mountNavigation();

    // Mount todos panel
    mountTodosPanel();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
  }

  // Initialize router
  initRouter(state);

  // Listen for route changes to update pinned header visibility
  window.addEventListener('hashchange', () => {
    updateTodosPinnedHeaderVisibility();
  });

  // Listen for setup completion
  window.addEventListener('setup-complete', async () => {
    isInitialized = true;
    mountNavigation();
    mountTodosPanel();
    setupKeyboardShortcuts();
  });
}

/**
 * Mount the todos pinned header panel
 */
function mountTodosPanel() {
  const container = document.getElementById('todos-panel-container');
  if (!container) return;

  // Create and mount new pinned header
  todosPinnedHeader = new TodosPinnedHeader();
  todosPinnedHeader.render(container);

  // Initial visibility check
  updateTodosPinnedHeaderVisibility();
}

/**
 * Update todos pinned header visibility based on current route
 */
function updateTodosPinnedHeaderVisibility() {
  if (!todosPinnedHeader) return;

  const hash = window.location.hash || '#/notes';
  if (hash === '#/todos') {
    todosPinnedHeader.hide();
  } else {
    todosPinnedHeader.show();
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+T: Toggle todos pinned header panel
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      if (todosPinnedHeader && window.location.hash !== '#/todos') {
        todosPinnedHeader.togglePanel();
      }
    }

    // Ctrl+N: New note (when on notes page)
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      const newNoteBtn = document.querySelector('#new-note-btn, .btn-icon[title="New Note"]');
      if (newNoteBtn) {
        newNoteBtn.click();
      } else if (window.location.hash !== '#/notes') {
        window.location.hash = '#/notes';
      }
    }

    // Ctrl+S: Save current note
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      const saveBtn = document.querySelector('#save-note-btn, .btn-primary[type="submit"]');
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.click();
      }
    }

    // Ctrl+F: Focus search (notes or snippets)
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.querySelector('#snippet-search, #note-search, input[type="search"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      const modal = document.querySelector('.modal[style*="display: block"], .modal:not([style*="display: none"]):not([style="display:none;"])');
      if (modal) {
        const cancelBtn = modal.querySelector('[id*="cancel"], .btn-secondary');
        if (cancelBtn) {
          cancelBtn.click();
        } else {
          modal.style.display = 'none';
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
