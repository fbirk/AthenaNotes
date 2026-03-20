/**
 * DailyTodosTab Component
 * Single-column daily todos view with quick-add input bar.
 * Supports creating, toggling, and deleting daily todos.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import * as kb from '../services/kb-service.js';
import { useData } from '../hooks/use-data.js';

const PRIORITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

const SHORTCUTS = [
  { key: 'Space', description: 'Toggle' },
  { key: 'd', description: 'Delete' },
  { key: 'Enter', description: 'Add todo' },
];

/**
 * Format today's date as a human-readable string.
 * @returns {string} e.g. "Wednesday, March 19, 2026"
 */
function formatTodayDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate the number of days a todo is overdue.
 * @param {string} createdAt - ISO timestamp
 * @returns {number} Days overdue (0 if not overdue)
 */
function getDaysOverdue(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const today = new Date();
  // Strip time components for day comparison
  created.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today - created;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function DailyTodosTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(true);
  const { stdout } = useStdout();

  const fetchDailyTodos = useCallback(() => kb.listDailyTodos(), []);
  const { data, loading, error, refresh } = useData(fetchDailyTodos);

  const todos = data?.todos || [];

  // Report shortcuts to parent
  useEffect(() => {
    if (isActive) {
      onShortcutsChange?.(SHORTCUTS);
    }
  }, [isActive, onShortcutsChange]);

  // Report item count
  useEffect(() => {
    onItemCountChange?.(todos.length);
  }, [todos.length, onItemCountChange]);

  // Clamp selectedIndex
  useEffect(() => {
    if (todos.length > 0 && selectedIndex >= todos.length) {
      setSelectedIndex(Math.max(0, todos.length - 1));
    }
  }, [todos.length, selectedIndex]);

  // Focus the input on mount
  useEffect(() => {
    if (isActive) {
      setInputFocused(true);
    }
  }, [isActive]);

  // Set keyboard input mode when input is focused
  useEffect(() => {
    if (inputFocused) {
      keyboard?.setInputMode?.('text');
    } else {
      keyboard?.setInputMode?.(null);
    }
  }, [inputFocused, keyboard]);

  // Handle quick-add submit
  const handleAddSubmit = useCallback(async (value) => {
    const title = value.trim();
    if (!title) return;

    const result = await kb.createDailyTodo({ title });
    if (result.success) {
      setInputValue('');
      showFeedback?.('Daily todo added', 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [refresh, showFeedback]);

  // Handle toggle completion
  const handleToggle = useCallback(async () => {
    const todo = todos[selectedIndex];
    if (!todo) return;
    const result = await kb.toggleDailyTodoComplete(todo.id);
    if (result.success) {
      showFeedback?.(`Todo ${result.data.completed ? 'completed' : 'reopened'}`, 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [todos, selectedIndex, refresh, showFeedback]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    const todo = todos[selectedIndex];
    if (!todo) return;
    const result = await kb.deleteDailyTodo(todo.id);
    if (result.success) {
      showFeedback?.('Daily todo deleted', 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [todos, selectedIndex, refresh, showFeedback]);

  // Keyboard navigation and actions (only when input is not focused)
  useInput((input, key) => {
    if (!isActive || inputFocused) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(todos.length - 1, prev + 1));
    } else if (input === ' ') {
      handleToggle();
    } else if (input === 'd') {
      handleDelete();
    }
  }, { isActive: isActive && !inputFocused });

  // Handle focus switching between input and list
  useInput((input, key) => {
    if (!isActive) return;

    if (inputFocused && key.downArrow && todos.length > 0) {
      setInputFocused(false);
      setSelectedIndex(0);
    } else if (inputFocused && key.escape) {
      if (inputValue.trim()) {
        setInputValue('');
      } else if (todos.length > 0) {
        setInputFocused(false);
      }
    } else if (!inputFocused && key.escape) {
      setInputFocused(true);
    }
  }, { isActive });

  // Loading state
  if (loading && !data) {
    return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(Text, { dimColor: true }, 'Loading daily todos...'),
    );
  }

  // Error state
  if (error) {
    return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(Text, { color: 'red' }, `Error: ${error}`),
    );
  }

  const termWidth = stdout?.columns || 80;

  // Header row
  const header = React.createElement(Box, { justifyContent: 'space-between', paddingX: 1 },
    React.createElement(Text, { bold: true, color: 'cyan' }, 'Daily Todos'),
    React.createElement(Text, { dimColor: true }, formatTodayDate()),
  );

  // Separator
  const separator = React.createElement(Box, { paddingX: 1 },
    React.createElement(Text, { dimColor: true }, '\u2500'.repeat(Math.max(10, termWidth - 4))),
  );

  // Quick-add input bar
  const quickAdd = React.createElement(Box, { paddingX: 1, gap: 1 },
    React.createElement(Box, {
      borderStyle: inputFocused ? 'single' : undefined,
      borderColor: inputFocused ? 'cyan' : undefined,
      paddingX: inputFocused ? 1 : 0,
      flexGrow: 1,
    },
      React.createElement(TextInput, {
        value: inputValue,
        onChange: setInputValue,
        onSubmit: handleAddSubmit,
        placeholder: 'What do you need to do today?',
        focus: inputFocused && isActive,
      }),
    ),
    React.createElement(Box, { marginLeft: 1 },
      React.createElement(Text, {
        color: inputValue.trim() ? 'green' : 'gray',
        bold: inputValue.trim() ? true : false,
      }, '[Add]'),
    ),
  );

  // Todo list
  const todoItems = todos.map((todo, index) => {
    const isSelected = !inputFocused && index === selectedIndex;
    const daysOverdue = getDaysOverdue(todo.createdAt);
    const showOverdue = daysOverdue > 0 && !todo.completed;
    const priorityColor = PRIORITY_COLORS[todo.priority] || 'white';

    const checkbox = todo.completed ? '\u2611' : '\u2610';
    const titleText = todo.text || todo.title || '';

    return React.createElement(Box, {
      key: todo.id,
      paddingX: 1,
      justifyContent: 'space-between',
    },
      React.createElement(Box, { flexShrink: 1 },
        React.createElement(Text, {
          inverse: isSelected,
          bold: isSelected,
          color: todo.completed ? 'green' : undefined,
          strikethrough: todo.completed,
          dimColor: todo.completed,
        },
          isSelected ? '\u25B8 ' : '  ',
          `${checkbox} ${titleText}`,
        ),
      ),
      React.createElement(Box, { gap: 1, flexShrink: 0 },
        showOverdue && React.createElement(Text, { color: 'red' },
          `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
        ),
        React.createElement(Text, { color: priorityColor, bold: true }, todo.priority || 'medium'),
      ),
    );
  });

  // Empty state
  const emptyState = todos.length === 0
    ? React.createElement(Box, { paddingX: 1, paddingY: 1 },
        React.createElement(Text, { dimColor: true }, 'No daily todos. Type above and press Enter to add one.'),
      )
    : null;

  // Navigation hint
  const navHint = React.createElement(Box, { paddingX: 1, marginTop: 1 },
    React.createElement(Text, { dimColor: true },
      inputFocused
        ? 'Type and Enter to add \u2022 \u2193 to navigate list \u2022 Esc to clear/focus list'
        : '\u2191\u2193 Navigate \u2022 Space:Toggle \u2022 d:Delete \u2022 Esc to focus input',
    ),
  );

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    header,
    separator,
    quickAdd,
    separator,
    ...(emptyState ? [emptyState] : todoItems),
    navHint,
  );
}
