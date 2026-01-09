import { initRouter } from './router.js';
import { createAppState } from './state.js';
import { TodosComponent } from './components/todos.js';

const state = createAppState();
let isInitialized = false;
let todosComponent = null;

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

  ['#/notes', '#/todos', '#/projects', '#/roadmaps', '#/snippets', '#/tools'].forEach((route) => {
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
    
    // Mount todos panel
    mountTodosPanel();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
  }

  // Initialize router
  initRouter(state);

  // Listen for setup completion
  window.addEventListener('setup-complete', async () => {
    isInitialized = true;
    mountNavigation();
    mountTodosPanel();
    setupKeyboardShortcuts();
  });
}

/**
 * Mount the todos panel
 */
function mountTodosPanel() {
  const container = document.getElementById('todos-panel-container');
  if (!container) return;

  // Remove existing panel if any
  container.innerHTML = '';

  // Create and mount new panel
  todosComponent = new TodosComponent();
  const panel = todosComponent.renderPinnedPanel();
  container.appendChild(panel);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+T: Toggle todos panel
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      if (todosComponent) {
        todosComponent.togglePanel();
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
