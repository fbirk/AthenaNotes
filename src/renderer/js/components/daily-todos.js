import { dailyTodos } from '../services/api.js';

/**
 * Daily Todos Component
 * A simple daily task list with automatic rollover and priority escalation.
 * Independent from the main todos system.
 */

export class DailyTodos {
  constructor() {
    this.todos = [];
    this.container = null;
    this.lastRolloverDate = null;
  }

  /**
   * Render the daily todos section
   * @param {HTMLElement} container - Container to render into
   */
  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="daily-todos-section">
        <div class="daily-todos-header">
          <h2>Daily Todos</h2>
          <span class="daily-todos-date" id="daily-todos-date"></span>
        </div>

        <div class="daily-todos-input-bar">
          <input
            type="text"
            id="daily-todo-input"
            class="daily-todo-input"
            placeholder="What do you need to do today?"
            maxlength="500"
          />
          <button type="button" id="daily-todo-add-btn" class="btn-primary">Add</button>
        </div>

        <div class="daily-todos-list" id="daily-todos-list">
          <div class="loading">Loading daily todos...</div>
        </div>

        <div class="feedback-message" id="daily-todos-feedback"></div>
      </div>
    `;

    this.setupEventListeners();
    this.loadTodos();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const input = document.getElementById('daily-todo-input');
    const addBtn = document.getElementById('daily-todo-add-btn');

    if (input) {
      // Enter key to add todo
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.createTodo();
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => this.createTodo());
    }
  }

  /**
   * Load todos from backend
   */
  async loadTodos() {
    try {
      const result = await dailyTodos.list();

      if (result.success) {
        this.todos = result.data.todos;
        this.lastRolloverDate = result.data.lastRolloverDate;
        this.renderTodosList();
        this.updateDateDisplay();
      } else {
        this.showError('Failed to load daily todos: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading daily todos:', error);
      this.showError('Error loading daily todos');
    }
  }

  /**
   * Update the date display
   */
  updateDateDisplay() {
    const dateEl = document.getElementById('daily-todos-date');
    if (dateEl) {
      const today = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = today.toLocaleDateString('en-US', options);
    }
  }

  /**
   * Render the todos list
   */
  renderTodosList() {
    const listContainer = document.getElementById('daily-todos-list');
    if (!listContainer) return;

    if (this.todos.length === 0) {
      listContainer.innerHTML = `
        <div class="daily-todos-empty">
          <p>No todos for today. Add one above to get started!</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.todos.map(todo => this.renderTodoItem(todo)).join('');
    this.attachTodoEventListeners();
  }

  /**
   * Render a single todo item
   * @param {Object} todo - Todo object
   * @returns {string} HTML string
   */
  renderTodoItem(todo) {
    const priorityClass = `priority-${todo.priority}`;
    const completedClass = todo.completed ? 'completed' : '';
    const titleClass = todo.completed ? 'strikethrough' : '';

    // Days overdue indicator
    let overdueIndicator = '';
    if (todo.daysOverdue > 0 && !todo.completed) {
      const dayText = todo.daysOverdue === 1 ? 'day' : 'days';
      overdueIndicator = `<span class="daily-todo-overdue">${todo.daysOverdue} ${dayText} overdue</span>`;
    }

    return `
      <div class="daily-todo-item ${completedClass}" data-todo-id="${todo.id}">
        <input
          type="checkbox"
          class="daily-todo-checkbox"
          ${todo.completed ? 'checked' : ''}
          data-todo-id="${todo.id}"
        />
        <div class="daily-todo-content">
          <span class="daily-todo-title ${titleClass}">${this.escapeHtml(todo.title)}</span>
          <div class="daily-todo-meta">
            <span class="daily-todo-priority ${priorityClass}">${todo.priority}</span>
            ${overdueIndicator}
          </div>
        </div>
        <button
          type="button"
          class="daily-todo-delete btn-icon-tiny"
          data-todo-id="${todo.id}"
          title="Delete"
        >&times;</button>
      </div>
    `;
  }

  /**
   * Attach event listeners to todo items
   */
  attachTodoEventListeners() {
    const listContainer = document.getElementById('daily-todos-list');
    if (!listContainer) return;

    // Checkbox toggle
    listContainer.querySelectorAll('.daily-todo-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        this.toggleComplete(e.target.dataset.todoId);
      });
    });

    // Delete button
    listContainer.querySelectorAll('.daily-todo-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTodo(e.target.dataset.todoId);
      });
    });
  }

  /**
   * Create a new todo
   */
  async createTodo() {
    const input = document.getElementById('daily-todo-input');
    if (!input) return;

    const title = input.value.trim();
    if (!title) {
      input.focus();
      return;
    }

    try {
      const result = await dailyTodos.create({ title });

      if (result.success) {
        input.value = '';
        input.focus();
        await this.loadTodos();
      } else {
        this.showError('Failed to create todo: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      this.showError('Error creating todo');
    }
  }

  /**
   * Toggle todo completion
   * @param {string} todoId - Todo ID
   */
  async toggleComplete(todoId) {
    try {
      const result = await dailyTodos.toggleComplete(todoId);

      if (result.success) {
        await this.loadTodos();
      } else {
        this.showError('Failed to toggle todo: ' + result.error);
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
      this.showError('Error toggling todo');
    }
  }

  /**
   * Delete a todo
   * @param {string} todoId - Todo ID
   */
  async deleteTodo(todoId) {
    // No confirmation per FR-025
    try {
      const result = await dailyTodos.delete(todoId);

      if (result.success) {
        await this.loadTodos();
      } else {
        this.showError('Failed to delete todo: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      this.showError('Error deleting todo');
    }
  }

  /**
   * Show success message
   * @param {string} message - Message to show
   */
  showSuccess(message) {
    this.showFeedback(message, 'success');
  }

  /**
   * Show error message
   * @param {string} message - Message to show
   */
  showError(message) {
    this.showFeedback(message, 'error');
  }

  /**
   * Show feedback message
   * @param {string} message - Message to show
   * @param {string} type - 'success' or 'error'
   */
  showFeedback(message, type) {
    const feedbackEl = document.getElementById('daily-todos-feedback');
    if (!feedbackEl) return;

    feedbackEl.textContent = message;
    feedbackEl.className = `feedback-message ${type} show`;

    setTimeout(() => {
      feedbackEl.classList.remove('show');
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
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
    this.todos = [];
    this.container = null;
  }
}
