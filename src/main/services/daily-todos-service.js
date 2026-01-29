import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Daily Todos Service
 * Handles all daily todo operations including rollover logic.
 * This service is completely independent from the regular todos system.
 */

// Priority levels in order (lowest to highest)
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const DEFAULT_PRIORITY = 'medium';
const MAX_TITLE_LENGTH = 500;
const ARCHIVE_RETENTION_DAYS = 30;

class DailyTodosService {
  constructor() {
    this.storageRoot = null;
    this.dailyTodosPath = null;
    this.archivePath = null;
  }

  /**
   * Initialize the service with storage location
   * @param {string} storagePath - Absolute path to storage root
   */
  initialize(storagePath) {
    this.storageRoot = storagePath;
    this.dailyTodosPath = path.join(storagePath, '.knowledgebase', 'daily-todos.json');
    this.archivePath = path.join(storagePath, '.knowledgebase', 'daily-todos-archive.json');
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format (local timezone)
   * @returns {string} Today's date
   */
  getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Load daily todos from file, initializing if necessary
   * @returns {Promise<Object>} Daily todos data
   */
  async loadDailyTodos() {
    try {
      const data = await fs.readFile(this.dailyTodosPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Initialize with empty data
        const initialData = {
          dailyTodos: [],
          lastRolloverDate: this.getTodayDate()
        };
        await this.saveDailyTodos(initialData);
        return initialData;
      }
      throw new Error('DAILY_TODOS_PARSE_ERROR');
    }
  }

  /**
   * Save daily todos to file with atomic write
   * @param {Object} data - Daily todos data
   */
  async saveDailyTodos(data) {
    await this.ensureDirectoryExists(path.dirname(this.dailyTodosPath));
    const tempPath = this.dailyTodosPath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.dailyTodosPath);
  }

  /**
   * Load archive from file, initializing if necessary
   * @returns {Promise<Object>} Archive data
   */
  async loadArchive() {
    try {
      const data = await fs.readFile(this.archivePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Initialize with empty data
        const initialData = {
          archivedTodos: [],
          retentionDays: ARCHIVE_RETENTION_DAYS
        };
        await this.saveArchive(initialData);
        return initialData;
      }
      throw new Error('ARCHIVE_PARSE_ERROR');
    }
  }

  /**
   * Save archive to file with atomic write
   * @param {Object} data - Archive data
   */
  async saveArchive(data) {
    await this.ensureDirectoryExists(path.dirname(this.archivePath));
    const tempPath = this.archivePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.archivePath);
  }

  /**
   * Get the next priority level (one higher)
   * @param {string} currentPriority - Current priority
   * @returns {string} Next priority (capped at max)
   */
  getNextPriority(currentPriority) {
    const currentIndex = PRIORITIES.indexOf(currentPriority);
    if (currentIndex === -1) return DEFAULT_PRIORITY;
    const nextIndex = Math.min(currentIndex + 1, PRIORITIES.length - 1);
    return PRIORITIES[nextIndex];
  }

  /**
   * Calculate days between two dates
   * @param {string} dateStr1 - First date (YYYY-MM-DD)
   * @param {string} dateStr2 - Second date (YYYY-MM-DD)
   * @returns {number} Days difference
   */
  daysBetween(dateStr1, dateStr2) {
    const date1 = new Date(dateStr1 + 'T00:00:00');
    const date2 = new Date(dateStr2 + 'T00:00:00');
    const diffTime = Math.abs(date2 - date1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Perform rollover for missed days
   * @param {Object} data - Daily todos data
   * @param {Object} archive - Archive data
   * @param {number} daysMissed - Number of days to process
   * @returns {Object} { todosArchived, todosEscalated }
   */
  async performRollover(data, archive, daysMissed) {
    let todosArchived = 0;
    let todosEscalated = 0;
    const today = this.getTodayDate();

    // Process each missed day
    for (let i = 0; i < daysMissed; i++) {
      const todosToArchive = [];
      const todosToKeep = [];

      for (const todo of data.dailyTodos) {
        if (todo.completed) {
          // Archive completed todos
          const archivedTodo = {
            id: todo.id,
            title: todo.title,
            priority: todo.priority,
            completedAt: todo.completedAt,
            createdAt: todo.createdAt,
            createdDate: todo.createdDate,
            archivedDate: today,
            daysToComplete: this.daysBetween(todo.createdDate, todo.completedAt.split('T')[0])
          };
          archive.archivedTodos.push(archivedTodo);
          todosToArchive.push(todo.id);
          todosArchived++;
        } else {
          // Escalate incomplete todos
          todo.daysOverdue = (todo.daysOverdue || 0) + 1;
          todo.priority = this.getNextPriority(todo.priority);
          todosEscalated++;
          todosToKeep.push(todo);
        }
      }

      data.dailyTodos = todosToKeep;
    }

    // Cleanup old archive entries
    this.cleanupArchive(archive);

    data.lastRolloverDate = today;

    return { todosArchived, todosEscalated };
  }

  /**
   * Clean up archive entries older than retention period
   * @param {Object} archive - Archive data
   */
  cleanupArchive(archive) {
    const today = this.getTodayDate();
    const retentionDays = archive.retentionDays || ARCHIVE_RETENTION_DAYS;

    archive.archivedTodos = archive.archivedTodos.filter(todo => {
      const daysSinceArchived = this.daysBetween(todo.archivedDate, today);
      return daysSinceArchived <= retentionDays;
    });
  }

  /**
   * Sort todos by priority, days overdue, and creation date
   * @param {Array} todos - Array of todos
   * @returns {Array} Sorted todos
   */
  sortTodos(todos) {
    return [...todos].sort((a, b) => {
      // Incomplete before completed
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Within incomplete: priority (critical > high > medium > low)
      const priorityA = PRIORITIES.indexOf(a.priority);
      const priorityB = PRIORITIES.indexOf(b.priority);
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      // Within same priority: days overdue (highest first)
      const daysOverdueA = a.daysOverdue || 0;
      const daysOverdueB = b.daysOverdue || 0;
      if (daysOverdueA !== daysOverdueB) {
        return daysOverdueB - daysOverdueA;
      }

      // Within same days overdue: creation date (oldest first)
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  // ==================== IPC Handler Methods ====================

  /**
   * List all active daily todos (with automatic rollover)
   * @returns {Promise<Object>} Response with todos list
   */
  async list() {
    const data = await this.loadDailyTodos();
    const today = this.getTodayDate();

    // Check if rollover is needed
    if (data.lastRolloverDate < today) {
      const daysMissed = this.daysBetween(data.lastRolloverDate, today);
      const archive = await this.loadArchive();
      await this.performRollover(data, archive, daysMissed);
      await this.saveDailyTodos(data);
      await this.saveArchive(archive);
    }

    return {
      todos: this.sortTodos(data.dailyTodos),
      lastRolloverDate: data.lastRolloverDate
    };
  }

  /**
   * Create a new daily todo
   * @param {Object} todoData - { title: string }
   * @returns {Promise<Object>} Created todo
   */
  async create(todoData) {
    // Validate title
    if (!todoData.title || !todoData.title.trim()) {
      throw new Error('VALIDATION_ERROR: Title cannot be empty');
    }

    const title = todoData.title.trim();
    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error(`VALIDATION_ERROR: Title exceeds ${MAX_TITLE_LENGTH} characters`);
    }

    const data = await this.loadDailyTodos();
    const now = new Date().toISOString();
    const today = this.getTodayDate();

    const newTodo = {
      id: uuidv4(),
      title,
      priority: DEFAULT_PRIORITY,
      completed: false,
      completedAt: null,
      createdAt: now,
      createdDate: today,
      daysOverdue: 0
    };

    data.dailyTodos.push(newTodo);
    await this.saveDailyTodos(data);

    return newTodo;
  }

  /**
   * Toggle completion status of a daily todo
   * @param {string} id - Todo ID
   * @returns {Promise<Object>} Updated todo
   */
  async toggleComplete(id) {
    const data = await this.loadDailyTodos();
    const todo = data.dailyTodos.find(t => t.id === id);

    if (!todo) {
      throw new Error('DAILY_TODO_NOT_FOUND');
    }

    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;

    await this.saveDailyTodos(data);

    return {
      id: todo.id,
      completed: todo.completed,
      completedAt: todo.completedAt
    };
  }

  /**
   * Delete a daily todo
   * @param {string} id - Todo ID
   * @returns {Promise<Object>} Delete confirmation
   */
  async delete(id) {
    const data = await this.loadDailyTodos();
    const todoIndex = data.dailyTodos.findIndex(t => t.id === id);

    if (todoIndex === -1) {
      throw new Error('DAILY_TODO_NOT_FOUND');
    }

    data.dailyTodos.splice(todoIndex, 1);
    await this.saveDailyTodos(data);

    return { deleted: true };
  }

  /**
   * Manually trigger rollover
   * @returns {Promise<Object>} Rollover result
   */
  async rollover() {
    const data = await this.loadDailyTodos();
    const today = this.getTodayDate();

    if (data.lastRolloverDate >= today) {
      return {
        rolledOver: false,
        todosArchived: 0,
        todosEscalated: 0,
        newRolloverDate: data.lastRolloverDate
      };
    }

    const daysMissed = this.daysBetween(data.lastRolloverDate, today);
    const archive = await this.loadArchive();
    const result = await this.performRollover(data, archive, daysMissed);

    await this.saveDailyTodos(data);
    await this.saveArchive(archive);

    return {
      rolledOver: true,
      todosArchived: result.todosArchived,
      todosEscalated: result.todosEscalated,
      newRolloverDate: today
    };
  }

  /**
   * Get archived todos
   * @param {Object} options - { limit?, offset?, fromDate?, toDate? }
   * @returns {Promise<Object>} Archive data
   */
  async getArchive(options = {}) {
    const archive = await this.loadArchive();
    let results = [...archive.archivedTodos];

    // Filter by date range
    if (options.fromDate) {
      results = results.filter(t => t.archivedDate >= options.fromDate);
    }
    if (options.toDate) {
      results = results.filter(t => t.archivedDate <= options.toDate);
    }

    // Sort by archivedDate descending
    results.sort((a, b) => b.archivedDate.localeCompare(a.archivedDate));

    const total = results.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    return {
      archivedTodos: results,
      total,
      retentionDays: archive.retentionDays || ARCHIVE_RETENTION_DAYS
    };
  }

  /**
   * Update priority of a daily todo
   * @param {string} id - Todo ID
   * @param {string} priority - New priority
   * @returns {Promise<Object>} Updated todo
   */
  async updatePriority(id, priority) {
    if (!PRIORITIES.includes(priority)) {
      throw new Error('VALIDATION_ERROR: Invalid priority value');
    }

    const data = await this.loadDailyTodos();
    const todo = data.dailyTodos.find(t => t.id === id);

    if (!todo) {
      throw new Error('DAILY_TODO_NOT_FOUND');
    }

    todo.priority = priority;
    await this.saveDailyTodos(data);

    return {
      id: todo.id,
      priority: todo.priority
    };
  }
}

// Export singleton instance
export const dailyTodosService = new DailyTodosService();
