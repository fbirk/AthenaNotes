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
    this.currentTodo = null;
    this.container = null;
    this.hasUnsavedChanges = false;
    this.autoSaveTimer = null;
    this.isCreatingNew = false;
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
          <div class="todo-editor-container" id="section-todo-detail-container" style="display: none;"></div>
          <div class="section-empty" id="section-todo-empty-state">
            <div class="empty-state-content">
              <h3>No todo selected</h3>
              <p>Select a todo from the list or create a new one.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="feedback-message" id="todo-feedback-message"></div>
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
    const filterSelect = document.getElementById('section-todo-filter');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.createNewTodo());
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filter = e.target.value;
        this.renderTodosList();
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
        // Update selected/current todo reference if it still exists
        if (this.selectedTodo) {
          this.selectedTodo = this.todos.find(t => t.id === this.selectedTodo.id) || null;
          this.currentTodo = this.selectedTodo;
        }
        this.renderTodosList();
        // Only re-render detail if not currently editing
        if (!this.hasUnsavedChanges) {
          this.renderTodoDetail();
        }
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
      const isActive = (this.currentTodo && this.currentTodo.id === todo.id) || (this.selectedTodo && this.selectedTodo.id === todo.id);
      return `
        <div class="section-item ${isActive ? 'active' : ''}" data-todo-id="${todo.id}">
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
    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const confirmResult = window.confirm('You have unsaved changes. Load todo anyway?');
      if (!confirmResult) return;
    }

    this.selectedTodo = this.todos.find(t => t.id === todoId);
    this.currentTodo = this.selectedTodo;
    this.isCreatingNew = false;
    this.hasUnsavedChanges = false;

    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    this.renderTodoDetail();
    this.renderTodosList();
  }

  /**
   * Render the todo detail panel with editable form
   */
  renderTodoDetail() {
    const detailContainer = document.getElementById('section-todo-detail-container');
    const emptyState = document.getElementById('section-todo-empty-state');

    if (!detailContainer) return;

    // Show empty state when no todo selected and not creating new
    if (!this.currentTodo && !this.isCreatingNew) {
      detailContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    // Hide empty state, show editor
    if (emptyState) emptyState.style.display = 'none';
    detailContainer.style.display = 'flex';

    const todo = this.currentTodo || {};

    detailContainer.innerHTML = `
      <div class="editor-toolbar">
        <input
          type="text"
          id="todo-title-input"
          class="note-title-input"
          placeholder="Todo title"
          maxlength="200"
          value="${this.escapeHtml(todo.title || '')}"
        />
        <div class="editor-actions">
          <button type="button" class="btn-primary" id="save-todo-btn" disabled>Save</button>
          ${this.currentTodo ? '<button type="button" class="btn-danger" id="delete-todo-btn">Delete</button>' : ''}
        </div>
      </div>

      <div class="todo-form-fields">
        ${this.currentTodo ? `
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="todo-completed-checkbox" ${todo.completed ? 'checked' : ''} />
              Mark as completed
            </label>
          </div>
        ` : ''}

        <div class="form-row">
          <div class="form-group">
            <label for="todo-priority-select">Priority</label>
            <select id="todo-priority-select">
              <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${(!todo.priority || todo.priority === 'medium') ? 'selected' : ''}>Medium</option>
              <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>

          <div class="form-group">
            <label for="todo-project-select">Project</label>
            <select id="todo-project-select">
              <option value="">No Project</option>
              ${this.projects.map(p =>
                `<option value="${p.id}" ${todo.projectId === p.id ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="todo-deadline-input">Deadline</label>
            <input
              type="datetime-local"
              id="todo-deadline-input"
              value="${todo.deadline ? todo.deadline.slice(0, 16) : ''}"
            />
          </div>
        </div>

        <div class="form-group todo-description-group">
          <label for="todo-description-input">Description</label>
          <textarea
            id="todo-description-input"
            class="todo-description-textarea"
            placeholder="Description (optional)"
          >${this.escapeHtml(todo.description || '')}</textarea>
        </div>
      </div>
    `;

    this.attachDetailEventListeners();
  }

  /**
   * Create a new todo - switch to empty form
   */
  createNewTodo() {
    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const confirmResult = window.confirm('You have unsaved changes. Create new todo anyway?');
      if (!confirmResult) return;
    }

    this.currentTodo = null;
    this.selectedTodo = null;
    this.isCreatingNew = true;
    this.hasUnsavedChanges = false;

    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    this.renderTodoDetail();
    this.renderTodosList();

    // Focus on title input
    const titleInput = document.getElementById('todo-title-input');
    if (titleInput) {
      titleInput.focus();
    }
  }

  /**
   * Attach event listeners to the detail panel form elements
   */
  attachDetailEventListeners() {
    const titleInput = document.getElementById('todo-title-input');
    const descInput = document.getElementById('todo-description-input');
    const prioritySelect = document.getElementById('todo-priority-select');
    const projectSelect = document.getElementById('todo-project-select');
    const deadlineInput = document.getElementById('todo-deadline-input');
    const completedCheckbox = document.getElementById('todo-completed-checkbox');
    const saveBtn = document.getElementById('save-todo-btn');
    const deleteBtn = document.getElementById('delete-todo-btn');

    // Input change handlers - trigger onContentChange for auto-save
    const inputElements = [titleInput, descInput, prioritySelect, projectSelect, deadlineInput];
    inputElements.forEach(el => {
      if (el) {
        el.addEventListener('input', () => this.onContentChange());
        el.addEventListener('change', () => this.onContentChange());
      }
    });

    // Completed checkbox - also triggers change
    if (completedCheckbox) {
      completedCheckbox.addEventListener('change', () => this.onContentChange());
    }

    // Save button
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveTodo());
    }

    // Delete button
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteTodo(this.currentTodo.id));
    }

    // Initial update of save button state
    this.updateSaveButton();
  }

  /**
   * Handle content change - enable save button and trigger auto-save
   */
  onContentChange() {
    this.hasUnsavedChanges = true;
    this.updateSaveButton();

    // Auto-save with 500ms debounce (only for existing todos)
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      if (this.hasUnsavedChanges && this.currentTodo) {
        this.saveTodo(true); // auto-save
      }
    }, 500);
  }

  /**
   * Update save button enabled state
   */
  updateSaveButton() {
    const saveBtn = document.getElementById('save-todo-btn');
    const titleInput = document.getElementById('todo-title-input');

    if (!saveBtn) return;

    // Enable Save when there's a non-empty title
    const hasTitle = !!titleInput && titleInput.value.trim().length > 0;
    saveBtn.disabled = !hasTitle;
  }

  /**
   * Show success feedback message
   * @param {string} message - Message to show
   */
  showSuccess(message) {
    this.showFeedback(message, 'success');
  }

  /**
   * Show error feedback message
   * @param {string} message - Message to show
   */
  showError(message) {
    this.showFeedback(message, 'error');
  }

  /**
   * Show feedback message
   * @param {string} message - Message to show
   * @param {string} type - Message type ('success' or 'error')
   */
  showFeedback(message, type) {
    const feedbackDiv = document.getElementById('todo-feedback-message');
    if (!feedbackDiv) return;

    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback-message ${type} show`;

    setTimeout(() => {
      feedbackDiv.classList.remove('show');
    }, 3000);
  }

  /**
   * Save todo (create or update)
   * @param {boolean} isAutoSave - Whether this is an auto-save (silent)
   */
  async saveTodo(isAutoSave = false) {
    const titleInput = document.getElementById('todo-title-input');
    const descInput = document.getElementById('todo-description-input');
    const prioritySelect = document.getElementById('todo-priority-select');
    const projectSelect = document.getElementById('todo-project-select');
    const deadlineInput = document.getElementById('todo-deadline-input');
    const completedCheckbox = document.getElementById('todo-completed-checkbox');

    if (!titleInput) return;

    const title = titleInput.value.trim();
    if (!title) {
      if (!isAutoSave) {
        this.showError('Todo title cannot be empty');
        titleInput.focus();
      }
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

      // Include completed status if editing existing todo
      if (this.currentTodo && completedCheckbox) {
        todoData.completed = completedCheckbox.checked;
      }

      let result;
      if (this.currentTodo) {
        // Update existing todo
        result = await window.knowledgeBase.invoke('todos.update', {
          id: this.currentTodo.id,
          updates: todoData,
        });
      } else {
        // Create new todo
        result = await window.knowledgeBase.invoke('todos.create', todoData);
      }

      if (result.success) {
        this.currentTodo = result.data;
        this.selectedTodo = result.data;
        this.hasUnsavedChanges = false;
        this.isCreatingNew = false;
        this.updateSaveButton();

        if (!isAutoSave) {
          this.showSuccess('Todo saved successfully');
        }

        // Reload todos list
        await this.loadTodos();
        this.notifyTodosChanged();
      } else {
        this.showError('Failed to save todo: ' + result.error);
      }
    } catch (error) {
      this.showError('Error saving todo: ' + error.message);
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
        // Clear selection if deleted todo was selected/current
        if ((this.selectedTodo && this.selectedTodo.id === todoId) ||
            (this.currentTodo && this.currentTodo.id === todoId)) {
          this.selectedTodo = null;
          this.currentTodo = null;
          this.hasUnsavedChanges = false;
          this.isCreatingNew = false;
        }

        // Clear auto-save timer
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
          this.autoSaveTimer = null;
        }

        await this.loadTodos();
        this.renderTodoDetail();
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
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    window.removeEventListener('todos-changed', this.boundOnTodosChanged);
    this.selectedTodo = null;
    this.currentTodo = null;
    this.todos = [];
  }
}
