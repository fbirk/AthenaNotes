const bridge = window.knowledgeBase ?? {};

function ensureBridge() {
  if (typeof bridge.invoke !== 'function') {
    throw new Error('IPC bridge is unavailable.');
  }
}

export function invoke(channel, payload) {
  ensureBridge();
  return bridge.invoke(channel, payload);
}

export function subscribe(channel, listener) {
  if (typeof bridge.on !== 'function') {
    return () => {};
  }
  return bridge.on(channel, listener);
}

// ==================== Daily Todos API ====================
// Convenience methods for the Daily Todos feature

export const dailyTodos = {
  /**
   * List all active daily todos (triggers automatic rollover if needed)
   * @returns {Promise<{success: boolean, data?: {todos: Array, lastRolloverDate: string}, error?: string}>}
   */
  list: () => invoke('dailyTodos.list'),

  /**
   * Create a new daily todo
   * @param {Object} todoData - { title: string }
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  create: (todoData) => invoke('dailyTodos.create', todoData),

  /**
   * Toggle completion status of a daily todo
   * @param {string} id - Todo ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  toggleComplete: (id) => invoke('dailyTodos.toggleComplete', id),

  /**
   * Delete a daily todo permanently
   * @param {string} id - Todo ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  delete: (id) => invoke('dailyTodos.delete', id),

  /**
   * Manually trigger rollover
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  rollover: () => invoke('dailyTodos.rollover'),

  /**
   * Get archived todos
   * @param {Object} options - { limit?, offset?, fromDate?, toDate? }
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  getArchive: (options) => invoke('dailyTodos.getArchive', options),

  /**
   * Update priority of a daily todo
   * @param {string} id - Todo ID
   * @param {string} priority - New priority (low, medium, high, critical)
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  updatePriority: (id, priority) => invoke('dailyTodos.updatePriority', id, priority)
};
