/**
 * Todos Section Component
 * Main todos view with sidebar list and detail panel.
 * Shown when navigating to #/todos route.
 */

export class TodosSection {
  constructor() {
    this.todos = [];
    this.projects = [];
    this.selectedTodo = null;
    this.container = null;
    this.editingTodo = null;
    this.filter = 'all';
    this.boundOnTodosChanged = this.onTodosChanged.bind(this);
  }

  /**
   * Render the main todos view
   * @param {HTMLElement} container - Container to render into
   */
  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="section-container">
        <div class="section-sidebar">
          <div class="section-header">
            <h2>Todos</h2>
            <button type="button" class="btn-icon" id="section-add-todo-btn" title="Add todo">+</button>
          </div>
          <div class="section-controls">
            <select id="section-todo-filter" class="section-filter">
              <option value="all">All Todos</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="section-list" id="section-todos-list">
            <div class="loading">Loading todos...</div>
          </div>
        </div>
        <div class="section-main">
          <div id="section-todo-detail-container"></div>
        </div>
      </div>
      <div class="modal-overlay" id="section-todo-modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="section-modal-title">New Todo</h3>
            <button type="button" class="btn-icon-small" id="section-modal-close">\u00d7</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="section-todo-title-input">Title</label>
              <input type="text" id="section-todo-title-input" placeholder="Todo title" maxlength="200" />
            </div>
            <div class="form-group">
              <label for="section-todo-description-input">Description</label>
              <textarea id="section-todo-description-input" placeholder="Description (optional)" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="section-todo-priority-select">Priority</label>
              <select id="section-todo-priority-select">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="form-group">
              <label for="section-todo-project-select">Project (optional)</label>
              <select id="section-todo-project-select">
                <option value="">No Project</option>
              </select>
            </div>
            <div class="form-group">
              <label for="section-todo-deadline-input">Deadline</label>
              <input type="datetime-local" id="section-todo-deadline-input" />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" id="section-cancel-todo-btn">Cancel</button>
              <button type="button" class="btn-primary" id="section-save-todo-btn">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

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
    const addBtn = document.getElementById('section-add-todo-btn');
    const cancelBtn = document.getElementById('section-cancel-todo-btn');
    const saveBtn = document.getElementById('section-save-todo-btn');
    const closeBtn = document.getElementById('section-modal-close');
    const modal = document.getElementById('section-todo-modal');
    const filterSelect = document.getElementById('section-todo-filter');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveTodo());
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filter = e.target.value;
        this.renderTodosList();
      });
    }

    // Close modal on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
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
        // Update selected todo reference if it still exists
        if (this.selectedTodo) {
          this.selectedTodo = this.todos.find(t => t.id === this.selectedTodo.id) || null;
        }
        this.renderTodosList();
        this.renderTodoDetail();
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }

  /**
   * Get filtered todos based on current filter
   */
  getFilteredTodos() {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  /**
   * Render the todos list in sidebar
   */
  renderTodosList() {
    const listContainer = document.getElementById('section-todos-list');
    if (!listContainer) return;

    const filteredTodos = this.getFilteredTodos();

    if (filteredTodos.length === 0) {
      listContainer.innerHTML = '<div class="section-list-empty">No todos yet. Create one to get started!</div>';
      return;
    }

    listContainer.innerHTML = filteredTodos.map(todo => {
      const project = todo.projectId ? this.projects.find(p => p.id === todo.projectId) : null;
      return `
        <div class="section-item ${this.selectedTodo && this.selectedTodo.id === todo.id ? 'active' : ''}" data-todo-id="${todo.id}">
          <input
            type="checkbox"
            class="section-item-checkbox"
            ${todo.completed ? 'checked' : ''}
            data-todo-id="${todo.id}"
          />
          <div class="section-item-content">
            <div class="section-item-title ${todo.completed ? 'strikethrough' : ''}">${this.escapeHtml(todo.title)}</div>
            <div class="section-item-meta">
              ${project ? `<span class="section-item-tag">${this.escapeHtml(project.name)}</span>` : ''}
              <span class="section-item-priority priority-${todo.priority}">${todo.priority}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners for selection
    listContainer.querySelectorAll('.section-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('section-item-checkbox')) {
          const todoId = item.dataset.todoId;
          this.selectTodo(todoId);
        }
      });
    });

    // Attach event listeners for checkboxes
    listContainer.querySelectorAll('.section-item-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        this.toggleTodo(e.target.dataset.todoId);
      });
    });
  }

  /**
   * Select a todo to show in detail view
   * @param {string} todoId - Todo ID
   */
  selectTodo(todoId) {
    this.selectedTodo = this.todos.find(t => t.id === todoId);
    this.renderTodoDetail();
    this.renderTodosList();
  }

  /**
   * Render the todo detail panel
   */
  renderTodoDetail() {
    const detailContainer = document.getElementById('section-todo-detail-container');
    if (!detailContainer) return;

    if (!this.selectedTodo) {
      detailContainer.innerHTML = `
        <div class="section-empty">
          <div class="empty-state-content">
            <h3>No todo selected</h3>
            <p>Select a todo from the list or create a new one.</p>
          </div>
        </div>
      `;
      return;
    }

    const todo = this.selectedTodo;
    const project = todo.projectId ? this.projects.find(p => p.id === todo.projectId) : null;
    detailContainer.innerHTML = `
      <div class="section-detail">
        <div class="section-detail-header">
          <div>
            <h2 class="${todo.completed ? 'strikethrough' : ''}">${this.escapeHtml(todo.title)}</h2>
            <div class="section-detail-meta">
              <span class="section-detail-priority priority-${todo.priority}">${todo.priority}</span>
              ${project ? `<span class="section-detail-tag">${this.escapeHtml(project.name)}</span>` : ''}
              ${todo.deadline ? `<span class="section-detail-date">${this.formatDeadline(todo.deadline)}</span>` : ''}
            </div>
          </div>
          <div class="section-detail-actions">
            <button type="button" class="btn-secondary" id="section-edit-todo-btn">Edit</button>
            <button type="button" class="btn-danger" id="section-delete-todo-btn">Delete</button>
          </div>
        </div>
        ${todo.description ? `<div class="section-detail-body">${this.escapeHtml(todo.description)}</div>` : ''}
      </div>
    `;

    // Attach detail action listeners
    const editBtn = document.getElementById('section-edit-todo-btn');
    const deleteBtn = document.getElementById('section-delete-todo-btn');

    if (editBtn) {
      editBtn.addEventListener('click', () => this.showModal(this.selectedTodo));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteTodo(this.selectedTodo.id));
    }
  }

  /**
   * Show the todo form modal
   * @param {Object} [todo] - Todo to edit (optional, for new todo leave empty)
   */
  showModal(todo = null) {
    const modal = document.getElementById('section-todo-modal');
    const modalTitle = document.getElementById('section-modal-title');
    const titleInput = document.getElementById('section-todo-title-input');
    const descInput = document.getElementById('section-todo-description-input');
    const prioritySelect = document.getElementById('section-todo-priority-select');
    const projectSelect = document.getElementById('section-todo-project-select');
    const deadlineInput = document.getElementById('section-todo-deadline-input');

    this.editingTodo = todo;

    if (modalTitle) {
      modalTitle.textContent = todo ? 'Edit Todo' : 'New Todo';
    }

    if (titleInput) {
      titleInput.value = todo ? todo.title : '';
    }

    if (descInput) {
      descInput.value = todo ? (todo.description || '') : '';
    }

    if (prioritySelect) {
      prioritySelect.value = todo ? todo.priority : 'medium';
    }

    // Populate project dropdown
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">No Project</option>' +
        this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
      projectSelect.value = todo && todo.projectId ? todo.projectId : '';
    }

    if (deadlineInput) {
      deadlineInput.value = todo && todo.deadline ? todo.deadline.slice(0, 16) : '';
    }

    if (modal) {
      modal.style.display = 'flex';
    }

    if (titleInput) {
      titleInput.focus();
    }
  }

  /**
   * Hide the todo form modal
   */
  hideModal() {
    const modal = document.getElementById('section-todo-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.editingTodo = null;
  }

  /**
   * Save todo (create or update)
   */
  async saveTodo() {
    const titleInput = document.getElementById('section-todo-title-input');
    const descInput = document.getElementById('section-todo-description-input');
    const prioritySelect = document.getElementById('section-todo-priority-select');
    const projectSelect = document.getElementById('section-todo-project-select');
    const deadlineInput = document.getElementById('section-todo-deadline-input');

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

      let result;
      if (this.editingTodo) {
        // Update existing todo
        result = await window.knowledgeBase.invoke('todos.update', {
          id: this.editingTodo.id,
          updates: todoData,
        });
      } else {
        // Create new todo
        result = await window.knowledgeBase.invoke('todos.create', todoData);
      }

      if (result.success) {
        this.hideModal();
        await this.loadTodos();
        // Select the newly created/updated todo
        if (result.data) {
          this.selectTodo(result.data.id);
        }
        this.notifyTodosChanged();
      } else {
        alert('Failed to save todo: ' + result.error);
      }
    } catch (error) {
      alert('Error saving todo: ' + error.message);
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
        // Clear selection if deleted todo was selected
        if (this.selectedTodo && this.selectedTodo.id === todoId) {
          this.selectedTodo = null;
        }
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
   * Format deadline for display
   * @param {string} deadline - ISO datetime string
   * @returns {string} Formatted deadline
   */
  formatDeadline(deadline) {
    const date = new Date(deadline);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const isPast = date < now;

    let prefix = '';
    if (isPast && !date.toDateString().includes(now.toDateString())) prefix = '\u26a0\ufe0f ';
    if (isToday) return prefix + 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (isTomorrow) return prefix + 'Tomorrow ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return prefix + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    this.selectedTodo = null;
    this.editingTodo = null;
    this.todos = [];
  }
}
