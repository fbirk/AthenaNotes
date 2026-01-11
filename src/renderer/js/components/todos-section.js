/**
 * Todos Section Component
 * Main todos view with sidebar list and detail panel.
 * Shown when navigating to #/todos route.
 */

export class TodosSection {
  constructor() {
    this.todos = [];
    this.selectedTodo = null;
    this.container = null;
    this.editingTodo = null;
    this.boundOnTodosChanged = this.onTodosChanged.bind(this);
  }

  /**
   * Render the main todos view
   * @param {HTMLElement} container - Container to render into
   */
  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="todos-container">
        <div class="todos-sidebar">
          <div class="todos-header">
            <h2>Todos</h2>
            <button type="button" class="btn-icon" id="section-add-todo-btn" title="Add todo">+</button>
          </div>
          <div class="todos-list" id="section-todos-list">
            <div class="loading">Loading todos...</div>
          </div>
        </div>
        <div class="todos-main">
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
   * Setup event listeners
   */
  setupEventListeners() {
    const addBtn = document.getElementById('section-add-todo-btn');
    const cancelBtn = document.getElementById('section-cancel-todo-btn');
    const saveBtn = document.getElementById('section-save-todo-btn');
    const closeBtn = document.getElementById('section-modal-close');
    const modal = document.getElementById('section-todo-modal');

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
   * Render the todos list in sidebar
   */
  renderTodosList() {
    const listContainer = document.getElementById('section-todos-list');
    if (!listContainer) return;

    if (this.todos.length === 0) {
      listContainer.innerHTML = '<div class="todos-empty">No todos yet. Create one to get started!</div>';
      return;
    }

    listContainer.innerHTML = this.todos.map(todo => `
      <div class="todo-item ${todo.completed ? 'completed' : ''} ${this.selectedTodo && this.selectedTodo.id === todo.id ? 'active' : ''}" data-todo-id="${todo.id}">
        <input
          type="checkbox"
          class="todo-checkbox"
          ${todo.completed ? 'checked' : ''}
          data-todo-id="${todo.id}"
        />
        <span class="todo-title ${todo.completed ? 'strikethrough' : ''}">${this.escapeHtml(todo.title)}</span>
        <span class="todo-priority priority-${todo.priority}">${todo.priority}</span>
        <button type="button" class="btn-icon-tiny todo-delete" data-todo-id="${todo.id}" title="Delete">\u00d7</button>
      </div>
    `).join('');

    // Attach event listeners for selection
    listContainer.querySelectorAll('.todo-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('todo-delete') && !e.target.classList.contains('todo-checkbox')) {
          const todoId = item.dataset.todoId;
          this.selectTodo(todoId);
        }
      });
    });

    // Attach event listeners for checkboxes
    listContainer.querySelectorAll('.todo-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        this.toggleTodo(e.target.dataset.todoId);
      });
    });

    // Attach event listeners for delete buttons
    listContainer.querySelectorAll('.todo-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTodo(e.target.dataset.todoId);
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
        <div class="empty-state-content">
          <h3>No todo selected</h3>
          <p>Select a todo from the list or create a new one.</p>
        </div>
      `;
      return;
    }

    const todo = this.selectedTodo;
    detailContainer.innerHTML = `
      <div class="todo-detail">
        <h2 class="todo-detail-title ${todo.completed ? 'strikethrough' : ''}">${this.escapeHtml(todo.title)}</h2>
        <div class="todo-detail-meta">
          <span class="todo-detail-priority priority-${todo.priority}">${todo.priority}</span>
          ${todo.deadline ? `<span class="todo-detail-deadline">${this.formatDeadline(todo.deadline)}</span>` : ''}
        </div>
        ${todo.description ? `<div class="todo-detail-description">${this.escapeHtml(todo.description)}</div>` : ''}
        <div class="todo-detail-actions">
          <button type="button" class="btn-secondary" id="section-edit-todo-btn">Edit</button>
          <button type="button" class="btn-danger" id="section-delete-todo-btn">Delete</button>
        </div>
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
