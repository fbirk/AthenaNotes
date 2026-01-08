/**
 * Todos Component
 * Pinned panel for persistent todo tracking across all sections
 */

export class TodosComponent {
  constructor() {
    this.todos = [];
    this.collapsed = localStorage.getItem('todosPanelCollapsed') === 'true';
  }

  /**
   * Render the pinned todos panel
   * @returns {HTMLElement} Todos panel element
   */
  renderPinnedPanel() {
    const panel = document.createElement('div');
    panel.className = `todos-panel ${this.collapsed ? 'collapsed' : ''}`;
    panel.id = 'todos-panel';
    
    panel.innerHTML = `
      <div class="todos-header">
        <h3>Todos</h3>
        <div class="todos-header-actions">
          <button type="button" class="btn-icon-small" id="add-todo-btn" title="Add todo">+</button>
          <button type="button" class="btn-icon-small" id="toggle-todos-btn" title="Toggle panel">−</button>
        </div>
      </div>
      <div class="todos-content">
        <div class="todos-list" id="todos-list">
          <div class="loading">Loading todos...</div>
        </div>
        <div class="todo-form" id="todo-form" style="display: none;">
          <input type="text" id="todo-title-input" placeholder="Todo title" maxlength="200" />
          <textarea id="todo-description-input" placeholder="Description (optional)" rows="2"></textarea>
          <div class="todo-form-controls">
            <select id="todo-priority-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
            <input type="datetime-local" id="todo-deadline-input" />
          </div>
          <div class="todo-form-actions">
            <button type="button" class="btn-secondary btn-small" id="cancel-todo-btn">Cancel</button>
            <button type="button" class="btn-primary btn-small" id="save-todo-btn">Save</button>
          </div>
        </div>
      </div>
    `;

    this.loadTodos();
    this.attachPanelEventListeners(panel);

    return panel;
  }

  /**
   * Attach event listeners to the panel
   * @param {HTMLElement} panel - Panel element
   */
  attachPanelEventListeners(panel) {
    const toggleBtn = panel.querySelector('#toggle-todos-btn');
    const addBtn = panel.querySelector('#add-todo-btn');
    const cancelBtn = panel.querySelector('#cancel-todo-btn');
    const saveBtn = panel.querySelector('#save-todo-btn');

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
    const listContainer = document.getElementById('todos-list');
    if (!listContainer) return;

    if (this.todos.length === 0) {
      listContainer.innerHTML = '<div class="todos-empty">No todos yet</div>';
      return;
    }

    listContainer.innerHTML = this.todos.map(todo => `
      <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? 'checked' : ''}
          data-todo-id="${todo.id}"
        />
        <div class="todo-content">
          <div class="todo-title ${todo.completed ? 'strikethrough' : ''}">
            ${this.escapeHtml(todo.title)}
            <span class="todo-priority priority-${todo.priority}">${todo.priority}</span>
          </div>
          ${todo.deadline ? `<div class="todo-deadline">${this.formatDeadline(todo.deadline)}</div>` : ''}
        </div>
        <button type="button" class="btn-icon-tiny todo-delete" data-todo-id="${todo.id}" title="Delete">×</button>
      </div>
    `).join('');

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
    const form = document.getElementById('todo-form');
    const list = document.getElementById('todos-list');
    
    if (form) form.style.display = 'block';
    if (list) list.style.display = 'none';

    const titleInput = document.getElementById('todo-title-input');
    if (titleInput) titleInput.focus();
  }

  /**
   * Hide todo form
   */
  hideTodoForm() {
    const form = document.getElementById('todo-form');
    const list = document.getElementById('todos-list');
    
    if (form) form.style.display = 'none';
    if (list) list.style.display = 'block';

    // Clear form
    const titleInput = document.getElementById('todo-title-input');
    const descInput = document.getElementById('todo-description-input');
    const prioritySelect = document.getElementById('todo-priority-select');
    const deadlineInput = document.getElementById('todo-deadline-input');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (prioritySelect) prioritySelect.value = 'medium';
    if (deadlineInput) deadlineInput.value = '';
  }

  /**
   * Save new todo
   */
  async saveTodo() {
    const titleInput = document.getElementById('todo-title-input');
    const descInput = document.getElementById('todo-description-input');
    const prioritySelect = document.getElementById('todo-priority-select');
    const deadlineInput = document.getElementById('todo-deadline-input');

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

      const result = await window.knowledgeBase.invoke('todos.create', todoData);

      if (result.success) {
        this.hideTodoForm();
        await this.loadTodos();
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
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
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
    if (isPast) prefix = '⚠️ ';
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
    const panel = document.getElementById('todos-panel');
    if (panel) {
      panel.remove();
    }
  }
}
