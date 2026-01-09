import { SetupComponent } from './components/setup.js';
import { NotesComponent } from './components/notes.js';
import { ProjectsComponent } from './components/projects.js';
import { renderSnippetsComponent } from './components/snippets.js';
import { renderRoadmapsComponent } from './components/roadmaps.js';
import { renderToolsComponent } from './components/tools.js';

// Store active component instance
let activeComponent = null;

const routes = new Map([
  ['#/setup', (container) => {
    const setupComponent = new SetupComponent();
    setupComponent.render(container);
    return setupComponent;
  }],
  ['#/notes', (container) => {
    const notesComponent = new NotesComponent();
    notesComponent.render(container);
    return notesComponent;
  }],
  ['#/todos', () => '<div class="placeholder-panel">Todos UI coming soon.</div>'],
  ['#/projects', async (container) => {
    const projectsComponent = new ProjectsComponent();
    container.innerHTML = await projectsComponent.render();
    projectsComponent.setupEventListeners();
    return projectsComponent;
  }],
  ['#/snippets', async (container) => {
    await renderSnippetsComponent(container);
    return null;
  }],
  ['#/roadmaps', async (container) => {
    await renderRoadmapsComponent(container);
    return null;
  }],
  ['#/tools', async (container) => {
    await renderToolsComponent(container);
    return null;
  }],
]);

async function renderRoute(state) {
  const view = document.getElementById('view');
  if (!view) {
    return;
  }

  // Cleanup previous component if exists
  if (activeComponent && typeof activeComponent.destroy === 'function') {
    activeComponent.destroy();
    activeComponent = null;
  }

  const hash = window.location.hash || '#/notes';
  state.currentRoute = hash;
  
  const routeHandler = routes.get(hash) ?? (() => '<div class="placeholder-panel">Coming soon.</div>');
  
  // Check if route returns a component or HTML string
  const result = await routeHandler(view, state);
  
  if (typeof result === 'string') {
    view.innerHTML = result;
  } else if (result && typeof result === 'object') {
    // It's a component instance
    activeComponent = result;
  }
}

export function initRouter(state) {
  window.addEventListener('hashchange', () => renderRoute(state));
  renderRoute(state);
}
