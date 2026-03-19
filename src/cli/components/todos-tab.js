/**
 * TodosTab Component
 * Full todos management tab with list-detail layout.
 * Supports creating, editing, toggling, filtering, and deleting todos.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ListDetail } from './list-detail.js';
import { MarkdownPreview } from './markdown-preview.js';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { editInExternalEditor } from '../services/editor-service.js';
import { useData } from '../hooks/use-data.js';
import { useFocus } from '../hooks/use-focus.js';

const PRIORITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

const FILTERS = ['all', 'active', 'completed'];

const SHORTCUTS = [
  { key: 'Space', description: 'Toggle' },
  { key: 'f', description: 'Filter' },
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

export function TodosTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('all');
  const [mode, setMode] = useState('browse'); // browse, create-title, edit-title, confirm-delete
  const [inputValue, setInputValue] = useState('');
  const { activePanel, isListFocused, focusList, focusDetail } = useFocus('list');

  const fetchTodos = useCallback(() => kb.listTodos(), []);
  const { data: todos, loading, error, refresh } = useData(fetchTodos);

  // Report shortcuts to parent
  useEffect(() => {
    if (isActive) {
      onShortcutsChange?.(SHORTCUTS);
    }
  }, [isActive, onShortcutsChange]);

  // Filter todos
  const filteredTodos = React.useMemo(() => {
    if (!todos) return [];
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  // Report item count
  useEffect(() => {
    onItemCountChange?.(filteredTodos.length);
  }, [filteredTodos.length, onItemCountChange]);

  // Clamp selectedIndex
  useEffect(() => {
    if (filteredTodos.length > 0 && selectedIndex >= filteredTodos.length) {
      setSelectedIndex(Math.max(0, filteredTodos.length - 1));
    }
  }, [filteredTodos.length, selectedIndex]);

  const selectedTodo = filteredTodos[selectedIndex] || null;

  // Build list items
  const items = filteredTodos.map(todo => ({
    id: todo.id,
    label: `${todo.completed ? '\u2611' : '\u2610'} ${todo.title}`,
    meta: todo.priority,
    highlight: todo.completed,
    dimmed: todo.completed,
  }));

  // Handle toggle completion
  const handleToggle = useCallback(async () => {
    if (!selectedTodo) return;
    const result = await kb.toggleTodoComplete(selectedTodo.id);
    if (result.success) {
      showFeedback?.(`Todo ${result.data.completed ? 'completed' : 'reopened'}`, 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [selectedTodo, refresh, showFeedback]);

  // Handle filter cycling
  const handleCycleFilter = useCallback(() => {
    setFilter(prev => {
      const idx = FILTERS.indexOf(prev);
      return FILTERS[(idx + 1) % FILTERS.length];
    });
    setSelectedIndex(0);
  }, []);

  // Handle create todo
  const handleStartCreate = useCallback(() => {
    setMode('create-title');
    setInputValue('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleCreateSubmit = useCallback(async (title) => {
    if (!title.trim()) {
      setMode('browse');
      keyboard?.setInputMode?.(null);
      return;
    }

    setMode('browse');
    keyboard?.setInputMode?.(null);

    // Open editor for description
    let description = '';
    try {
      const editorResult = await editInExternalEditor('', '.md');
      if (editorResult.changed) {
        description = editorResult.content;
      }
    } catch {
      // Editor failed, continue with empty description
    }

    const result = await kb.createTodo({ title: title.trim(), description, priority: 'medium' });
    if (result.success) {
      showFeedback?.('Todo created', 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [keyboard, refresh, showFeedback]);

  // Handle edit todo
  const handleStartEdit = useCallback(() => {
    if (!selectedTodo) return;
    setMode('edit-title');
    setInputValue(selectedTodo.title);
    keyboard?.setInputMode?.('text');
  }, [selectedTodo, keyboard]);

  const handleEditSubmit = useCallback(async (title) => {
    if (!selectedTodo) return;

    setMode('browse');
    keyboard?.setInputMode?.(null);

    const updates = {};
    if (title.trim() && title.trim() !== selectedTodo.title) {
      updates.title = title.trim();
    }

    // Open editor for description
    try {
      const editorResult = await editInExternalEditor(selectedTodo.description || '', '.md');
      if (editorResult.changed) {
        updates.description = editorResult.content;
      }
    } catch {
      // Editor failed, skip description update
    }

    if (Object.keys(updates).length > 0) {
      const result = await kb.updateTodo({ id: selectedTodo.id, updates });
      if (result.success) {
        showFeedback?.('Todo updated', 'success');
        refresh();
      } else {
        showFeedback?.(result.error, 'error');
      }
    }
  }, [selectedTodo, keyboard, refresh, showFeedback]);

  // Handle delete
  const handleStartDelete = useCallback(() => {
    if (!selectedTodo) return;
    setMode('confirm-delete');
  }, [selectedTodo]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedTodo) return;
    setMode('browse');
    const result = await kb.deleteTodo(selectedTodo.id);
    if (result.success) {
      showFeedback?.('Todo deleted', 'success');
      refresh();
    } else {
      showFeedback?.(result.error, 'error');
    }
  }, [selectedTodo, refresh, showFeedback]);

  const handleCancelDelete = useCallback(() => {
    setMode('browse');
  }, []);

  // Handle input cancel
  const handleInputCancel = useCallback(() => {
    setMode('browse');
    setInputValue('');
    keyboard?.setInputMode?.(null);
  }, [keyboard]);

  // Keyboard input for browse mode
  useInput((input, key) => {
    if (!isActive || mode !== 'browse') return;

    if (input === ' ') {
      handleToggle();
    } else if (input === 'f') {
      handleCycleFilter();
    } else if (input === 'n') {
      handleStartCreate();
    } else if (input === 'e') {
      handleStartEdit();
    } else if (input === 'd') {
      handleStartDelete();
    }
  }, { isActive: isActive && mode === 'browse' });

  // Handle escape in input modes
  useInput((input, key) => {
    if (!isActive) return;
    if ((mode === 'create-title' || mode === 'edit-title') && key.escape) {
      handleInputCancel();
    }
  }, { isActive: isActive && (mode === 'create-title' || mode === 'edit-title') });

  // Render detail panel
  const renderDetail = () => {
    if (!selectedTodo) {
      return React.createElement(Text, { dimColor: true }, 'No todo selected');
    }

    const priorityColor = PRIORITY_COLORS[selectedTodo.priority] || 'white';

    return React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
      // Title
      React.createElement(Box, { marginBottom: 1 },
        React.createElement(Text, { bold: true, wrap: 'wrap' }, selectedTodo.title),
      ),
      // Status
      React.createElement(Box, { marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, 'Status: '),
        React.createElement(Text, {
          color: selectedTodo.completed ? 'green' : 'yellow',
        }, selectedTodo.completed ? 'Completed' : 'Active'),
      ),
      // Priority
      React.createElement(Box, { marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, 'Priority: '),
        React.createElement(Text, { color: priorityColor, bold: true }, selectedTodo.priority),
      ),
      // Project
      selectedTodo.projectId && React.createElement(Box, { marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, 'Project: '),
        React.createElement(Text, null, selectedTodo.projectId),
      ),
      // Deadline
      selectedTodo.deadline && React.createElement(Box, { marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, 'Deadline: '),
        React.createElement(Text, null, selectedTodo.deadline),
      ),
      // Description
      React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
        React.createElement(Text, { dimColor: true, bold: true }, 'Description'),
        React.createElement(MarkdownPreview, { markdown: selectedTodo.description || '' }),
      ),
    );
  };

  // Render input overlay for create/edit
  if (mode === 'create-title' || mode === 'edit-title') {
    const isCreate = mode === 'create-title';
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(Box, { paddingX: 1, paddingY: 1 },
        React.createElement(Text, { bold: true, color: 'cyan' },
          isCreate ? 'New Todo' : 'Edit Todo',
        ),
      ),
      React.createElement(Box, { paddingX: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: isCreate ? handleCreateSubmit : handleEditSubmit,
        }),
      ),
      React.createElement(Box, { paddingX: 1, marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to confirm, Escape to cancel'),
      ),
    );
  }

  // Render confirm delete overlay
  if (mode === 'confirm-delete') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(ConfirmDialog, {
        message: `Delete todo "${selectedTodo?.title}"?`,
        onConfirm: handleConfirmDelete,
        onCancel: handleCancelDelete,
      }),
    );
  }

  // Loading state
  if (loading && !todos) {
    return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(Text, { dimColor: true }, 'Loading todos...'),
    );
  }

  // Error state
  if (error) {
    return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(Text, { color: 'red' }, `Error: ${error}`),
    );
  }

  // Filter indicator
  const filterLabel = filter !== 'all'
    ? React.createElement(Box, { paddingX: 1 },
        React.createElement(Text, { dimColor: true }, 'Filter: '),
        React.createElement(Text, { color: 'cyan', bold: true }, filter),
      )
    : null;

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    filterLabel,
    React.createElement(ListDetail, {
      items,
      selectedIndex,
      onSelect: (idx) => focusDetail(),
      onHighlight: setSelectedIndex,
      onBack: focusList,
      detail: renderDetail(),
      showDetail: true,
      isActive: isActive && mode === 'browse',
      emptyMessage: filter === 'all' ? 'No todos yet. Press n to create one.' : `No ${filter} todos.`,
    }),
  );
}
