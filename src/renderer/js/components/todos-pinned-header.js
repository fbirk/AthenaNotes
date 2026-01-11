/**
 * Todos Pinned Header Component
 * Collapsible panel shown in the header for quick todo access across all sections.
 * Hidden when the main Todos section is active.
 */

export class TodosPinnedHeader {
  constructor() {
    this.todos = [];
    this.projects = [];
    this.collapsed = localStorage.getItem('todosPanelCollapsed') === 'true';
    this.container = null;
    this.boundOnTodosChanged = this.onTodosChanged.bind(this);
  }

  /**
   * Render the pinned todos panel
   * @param {HTMLElement} container - Container to render into
   */
  render(container) {
    this.container = container;

    const panel = document.createElement('div');
    panel.className = `todos-panel ${this.collapsed ? 'collapsed' : ''}`;
    panel.id = 'todos-panel';

    panel.innerHTML = `
      <div class="todos-header">
        <h3>Todos</h3>
        <div class="todos-header-actions">
          <button type="button" class="btn-icon-small" id="toggle-todos-btn" title="Toggle panel">${this.collapsed ? '+' : '−'}</button>
        </div>
      </div>
      <div class="todos-content">
        <div class="todos-list" id="pinned-todos-list">
          <div class="loading">Loading todos...</div>
        </div>
        <div class="todo-form" id="pinned-todo-form" style="display: none;">
          <input type="text" id="pinned-todo-title-input" placeholder="Todo title" maxlength="200" />
          <textarea id="pinned-todo-description-input" placeholder="Description (optional)" rows="2"></textarea>
          <div class="todo-form-controls">
            <select id="pinned-todo-priority-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
            <select id="pinned-todo-project-select">
              <option value="">No Project</option>
            </select>
          </div>
          <div class="todo-form-controls">
            <input type="datetime-local" id="pinned-todo-deadline-input" />
          </div>
          <div class="todo-form-actions">
            <button type="button" class="btn-secondary btn-small" id="pinned-cancel-todo-btn">Cancel</button>
            <button type="button" class="btn-primary btn-small" id="pinned-save-todo-btn">Save</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(panel);

    this.setupEventListeners();
    this.loadProjects();
    this.loadTodos();

    // Listen for changes from other components
    window.addEventListener('todos-changed', this.boundOnTodosChanged);
  }

  /**
   * Handle todos changed event from other components
   */
  onTodosChanged() {
    this.loadTodos();
  }

  /**
   * Load projects from backend
   */
  async loadProjects() {
    try {
      const result = await window.knowledgeBase.invoke('projects.list');
      if (result.success) {
        this.projects = result.data;
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const toggleBtn = document.getElementById('toggle-todos-btn');
    const addBtn = document.getElementById('pinned-add-todo-btn');
    const cancelBtn = document.getElementById('pinned-cancel-todo-btn');
    const saveBtn = document.getElementById('pinned-save-todo-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.togglePanel());
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this.showTodoForm());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideTodoForm());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveTodo());
    }
  }

  /**
   * Load todos from backend
   */
  async loadTodos() {
    try {
      const result = await window.knowledgeBase.invoke('todos.list');

      if (result.success) {
        this.todos = result.data;
        this.renderTodosList();
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }

  /**
   * Render the todos list
   */
  renderTodosList() {
    const listContainer = document.getElementById('pinned-todos-list');
    if (!listContainer) return;

    if (this.todos.length === 0) {
      listContainer.innerHTML = '<div class="todos-empty">No todos yet</div>';
      return;
    }

    listContainer.innerHTML = this.todos.map(todo => {
      const project = todo.projectId ? this.projects.find(p => p.id === todo.projectId) : null;
      return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
          <input
            type="checkbox"
            class="todo-checkbox"
            ${todo.completed ? 'checked' : ''}
            data-todo-id="${todo.id}"
          />
          <div class="todo-item-content">
            <span class="todo-title ${todo.completed ? 'strikethrough' : ''}">${this.escapeHtml(todo.title)}</span>
            ${project ? `<span class="todo-project-tag">${this.escapeHtml(project.name)}</span>` : ''}
          </div>
          <span class="todo-priority priority-${todo.priority}">${todo.priority}</span>
          <button type="button" class="btn-icon-tiny todo-delete" data-todo-id="${todo.id}" title="Delete">\u00d7</button>
        </div>
      `;
    }).join('');

    // Attach event listeners to todo items
    listContainer.querySelectorAll('.todo-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleTodo(e.target.dataset.todoId);
      });
    });

    listContainer.querySelectorAll('.todo-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteTodo(e.target.dataset.todoId);
      });
    });
  }

  /**
   * Toggle panel collapsed state
   */
  togglePanel() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('todosPanelCollapsed', this.collapsed);

    const panel = document.getElementById('todos-panel');
    const toggleBtn = document.getElementById('toggle-todos-btn');

    if (panel) {
      if (this.collapsed) {
        panel.classList.add('collapsed');
        if (toggleBtn) toggleBtn.textContent = '+';
      } else {
        panel.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.textContent = '−';
      }
    }
  }

  /**
   * Show todo form
   */
  showTodoForm() {
    const form = document.getElementById('pinned-todo-form');
    const list = document.getElementById('pinned-todos-list');
    const projectSelect = document.getElementById('pinned-todo-project-select');

    if (form) form.style.display = 'block';
    if (list) list.style.display = 'none';

    // Populate project dropdown
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">No Project</option>' +
        this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
    }

    const titleInput = document.getElementById('pinned-todo-title-input');
    if (titleInput) titleInput.focus();
  }

  /**
   * Hide todo form
   */
  hideTodoForm() {
    const form = document.getElementById('pinned-todo-form');
    const list = document.getElementById('pinned-todos-list');

    if (form) form.style.display = 'none';
    if (list) list.style.display = 'block';

    // Clear form
    const titleInput = document.getElementById('pinned-todo-title-input');
    const descInput = document.getElementById('pinned-todo-description-input');
    const prioritySelect = document.getElementById('pinned-todo-priority-select');
    const projectSelect = document.getElementById('pinned-todo-project-select');
    const deadlineInput = document.getElementById('pinned-todo-deadline-input');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (prioritySelect) prioritySelect.value = 'medium';
    if (projectSelect) projectSelect.value = '';
    if (deadlineInput) deadlineInput.value = '';
  }

  /**
   * Save new todo
   */
  async saveTodo() {
    const titleInput = document.getElementById('pinned-todo-title-input');
    const descInput = document.getElementById('pinned-todo-description-input');
    const prioritySelect = document.getElementById('pinned-todo-priority-select');
    const projectSelect = document.getElementById('pinned-todo-project-select');
    const deadlineInput = document.getElementById('pinned-todo-deadline-input');

    if (!titleInput) return;

    const title = titleInput.value.trim();
    if (!title) {
      alert('Todo title cannot be empty');
      return;
    }

    try {
      const todoData = {
        title,
        description: descInput?.value || '',
        priority: prioritySelect?.value || 'medium',
        projectId: projectSelect?.value || null,
        deadline: deadlineInput?.value || null,
      };

      const result = await window.knowledgeBase.invoke('todos.create', todoData);

      if (result.success) {
        this.hideTodoForm();
        await this.loadTodos();
        this.notifyTodosChanged();
      } else {
        alert('Failed to create todo: ' + result.error);
      }
    } catch (error) {
      alert('Error creating todo: ' + error.message);
    }
  }

  /**
   * Toggle todo completion status
   * @param {string} todoId - Todo ID
   */
  async toggleTodo(todoId) {
    try {
      const result = await window.knowledgeBase.invoke('todos.toggleComplete', todoId);

      if (result.success) {
        await this.loadTodos();
        this.notifyTodosChanged();
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  }

  /**
   * Delete a todo
   * @param {string} todoId - Todo ID
   */
  async deleteTodo(todoId) {
    if (!confirm('Delete this todo?')) return;

    try {
      const result = await window.knowledgeBase.invoke('todos.delete', todoId);

      if (result.success) {
        await this.loadTodos();
        this.notifyTodosChanged();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }

  /**
   * Dispatch event to notify other components that todos have changed
   */
  notifyTodosChanged() {
    window.dispatchEvent(new CustomEvent('todos-changed'));
  }

  /**
   * Show the panel (used when navigating away from #/todos)
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide the panel (used when navigating to #/todos)
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component
   */
  destroy() {
    window.removeEventListener('todos-changed', this.boundOnTodosChanged);
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
