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

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

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
  const [mode, setMode] = useState('browse'); // browse, create-title, create-priority, create-project, edit-title, confirm-delete
  const [inputValue, setInputValue] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createPriority, setCreatePriority] = useState(1); // index into PRIORITY_OPTIONS, default 'medium'
  const [createProjectIndex, setCreateProjectIndex] = useState(0); // 0 = None
  const { activePanel, isListFocused, focusList, focusDetail } = useFocus('list');

  const fetchTodos = useCallback(() => kb.listTodos(), []);
  const { data: todos, loading, error, refresh } = useData(fetchTodos);

  const fetchProjects = useCallback(() => kb.listProjects(), []);
  const { data: projects } = useData(fetchProjects);
  const projectsList = projects || [];

  // Resolve projectId to project name
  const getProjectName = useCallback((projectId) => {
    if (!projectId) return null;
    const project = projectsList.find(p => p.id === projectId);
    return project ? project.name : null;
  }, [projectsList]);

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
    metaColor: PRIORITY_COLORS[todo.priority] || 'white',
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
    setCreateTitle('');
    setCreatePriority(1); // default medium
    setCreateProjectIndex(0); // default None
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleTitleSubmit = useCallback((title) => {
    if (!title.trim()) {
      setMode('browse');
      keyboard?.setInputMode?.(null);
      return;
    }
    setCreateTitle(title.trim());
    setMode('create-priority');
    keyboard?.setInputMode?.(null);
  }, [keyboard]);

  const handlePriorityConfirm = useCallback(() => {
    if (projectsList.length > 0) {
      setMode('create-project');
    } else {
      // No projects available, skip to editor
      setMode('create-finishing');
    }
  }, [projectsList.length]);

  const handleProjectConfirm = useCallback(() => {
    setMode('create-finishing');
  }, []);

  // Effect to handle the finishing step (open editor + create)
  useEffect(() => {
    if (mode !== 'create-finishing') return;
    let cancelled = false;

    (async () => {
      const priority = PRIORITY_OPTIONS[createPriority];
      const projectId = createProjectIndex > 0 ? projectsList[createProjectIndex - 1].id : null;

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

      if (cancelled) return;

      const result = await kb.createTodo({ title: createTitle, description, priority, projectId });
      if (result.success) {
        showFeedback?.('Todo created', 'success');
        refresh();
      } else {
        showFeedback?.(result.error, 'error');
      }
      setMode('browse');
    })();

    return () => { cancelled = true; };
  }, [mode, createTitle, createPriority, createProjectIndex, projectsList, refresh, showFeedback]);

  // Handle edit todo: title → priority → project → editor
  const [editPriority, setEditPriority] = useState(1);
  const [editProjectIndex, setEditProjectIndex] = useState(0);
  const [editTitleValue, setEditTitleValue] = useState('');

  const handleStartEdit = useCallback(() => {
    if (!selectedTodo) return;
    setMode('edit-title');
    setInputValue(selectedTodo.title);
    setEditTitleValue(selectedTodo.title);
    setEditPriority(PRIORITY_OPTIONS.indexOf(selectedTodo.priority || 'medium'));
    const projIdx = selectedTodo.projectId
      ? projectsList.findIndex(p => p.id === selectedTodo.projectId) + 1
      : 0;
    setEditProjectIndex(projIdx >= 0 ? projIdx : 0);
    keyboard?.setInputMode?.('text');
  }, [selectedTodo, projectsList, keyboard]);

  const handleEditTitleSubmit = useCallback((title) => {
    if (!selectedTodo) return;
    setEditTitleValue(title.trim() || selectedTodo.title);
    setMode('edit-priority');
    keyboard?.setInputMode?.(null);
  }, [selectedTodo, keyboard]);

  const handleEditPriorityConfirm = useCallback(() => {
    if (projectsList.length > 0) {
      setMode('edit-project');
    } else {
      setMode('edit-finishing');
    }
  }, [projectsList.length]);

  const handleEditProjectConfirm = useCallback(() => {
    setMode('edit-finishing');
  }, []);

  // Effect to handle edit finishing (open editor + update)
  useEffect(() => {
    if (mode !== 'edit-finishing') return;
    if (!selectedTodo) return;
    let cancelled = false;

    (async () => {
      const updates = {};
      if (editTitleValue !== selectedTodo.title) {
        updates.title = editTitleValue;
      }
      const newPriority = PRIORITY_OPTIONS[editPriority];
      if (newPriority !== selectedTodo.priority) {
        updates.priority = newPriority;
      }
      const newProjectId = editProjectIndex > 0 ? projectsList[editProjectIndex - 1].id : null;
      if (newProjectId !== (selectedTodo.projectId || null)) {
        updates.projectId = newProjectId;
      }

      try {
        const editorResult = await editInExternalEditor(selectedTodo.description || '', '.md');
        if (editorResult.changed) {
          updates.description = editorResult.content;
        }
      } catch {
        // Editor failed
      }
      if (cancelled) return;

      if (Object.keys(updates).length > 0) {
        const result = await kb.updateTodo({ id: selectedTodo.id, updates });
        if (result.success) {
          showFeedback?.('Todo updated', 'success');
          refresh();
        } else {
          showFeedback?.(result.error, 'error');
        }
      }
      setMode('browse');
    })();

    return () => { cancelled = true; };
  }, [mode, selectedTodo?.id, editTitleValue, editPriority, editProjectIndex, projectsList, refresh, showFeedback]);

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

  // Handle priority selection mode
  useInput((input, key) => {
    if (!isActive || mode !== 'create-priority') return;

    if (key.leftArrow || key.upArrow) {
      setCreatePriority(prev => (prev - 1 + PRIORITY_OPTIONS.length) % PRIORITY_OPTIONS.length);
    } else if (key.rightArrow || key.downArrow) {
      setCreatePriority(prev => (prev + 1) % PRIORITY_OPTIONS.length);
    } else if (key.return) {
      handlePriorityConfirm();
    } else if (key.escape) {
      setMode('browse');
    }
  }, { isActive: isActive && mode === 'create-priority' });

  // Handle project selection mode
  useInput((input, key) => {
    if (!isActive || mode !== 'create-project') return;

    const optionCount = projectsList.length + 1; // +1 for "None"
    if (key.leftArrow || key.upArrow) {
      setCreateProjectIndex(prev => (prev - 1 + optionCount) % optionCount);
    } else if (key.rightArrow || key.downArrow) {
      setCreateProjectIndex(prev => (prev + 1) % optionCount);
    } else if (key.return) {
      handleProjectConfirm();
    } else if (key.escape) {
      setMode('browse');
    }
  }, { isActive: isActive && mode === 'create-project' });

  // Handle edit priority selection mode
  useInput((input, key) => {
    if (!isActive || mode !== 'edit-priority') return;

    if (key.leftArrow || key.upArrow) {
      setEditPriority(prev => (prev - 1 + PRIORITY_OPTIONS.length) % PRIORITY_OPTIONS.length);
    } else if (key.rightArrow || key.downArrow) {
      setEditPriority(prev => (prev + 1) % PRIORITY_OPTIONS.length);
    } else if (key.return) {
      handleEditPriorityConfirm();
    } else if (key.escape) {
      setMode('browse');
    }
  }, { isActive: isActive && mode === 'edit-priority' });

  // Handle edit project selection mode
  useInput((input, key) => {
    if (!isActive || mode !== 'edit-project') return;

    const optionCount = projectsList.length + 1;
    if (key.leftArrow || key.upArrow) {
      setEditProjectIndex(prev => (prev - 1 + optionCount) % optionCount);
    } else if (key.rightArrow || key.downArrow) {
      setEditProjectIndex(prev => (prev + 1) % optionCount);
    } else if (key.return) {
      handleEditProjectConfirm();
    } else if (key.escape) {
      setMode('browse');
    }
  }, { isActive: isActive && mode === 'edit-project' });

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
      selectedTodo.projectId && getProjectName(selectedTodo.projectId) && React.createElement(Box, { marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, 'Project: '),
        React.createElement(Text, { color: 'cyan' }, getProjectName(selectedTodo.projectId)),
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

  // Helper to render priority selector
  const renderPrioritySelector = (heading, currentIndex) => {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(Box, { paddingX: 1, paddingY: 1 },
        React.createElement(Text, { bold: true, color: 'cyan' }, heading),
      ),
      React.createElement(Box, { paddingX: 1, gap: 2 },
        ...PRIORITY_OPTIONS.map((p, i) =>
          React.createElement(Text, {
            key: p,
            color: PRIORITY_COLORS[p],
            bold: i === currentIndex,
            inverse: i === currentIndex,
          }, ` ${p} `)
        ),
      ),
      React.createElement(Box, { paddingX: 1, marginTop: 1 },
        React.createElement(Text, { dimColor: true }, '\u2190/\u2192 to select, Enter to confirm, Escape to cancel'),
      ),
    );
  };

  // Helper to render project selector
  const renderProjectSelector = (heading, currentIndex) => {
    const projectOptions = ['None', ...projectsList.map(p => p.name)];
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(Box, { paddingX: 1, paddingY: 1 },
        React.createElement(Text, { bold: true, color: 'cyan' }, heading),
      ),
      React.createElement(Box, { paddingX: 1, flexDirection: 'column' },
        ...projectOptions.map((name, i) =>
          React.createElement(Text, {
            key: name,
            bold: i === currentIndex,
            inverse: i === currentIndex,
            color: i === currentIndex ? 'cyan' : undefined,
          }, `${i === currentIndex ? '\u25B8 ' : '  '}${name}`)
        ),
      ),
      React.createElement(Box, { paddingX: 1, marginTop: 1 },
        React.createElement(Text, { dimColor: true }, '\u2191/\u2193 to select, Enter to confirm, Escape to cancel'),
      ),
    );
  };

  // Render input overlay for create/edit title
  if (mode === 'create-title' || mode === 'edit-title') {
    const isCreate = mode === 'create-title';
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(Box, { paddingX: 1, paddingY: 1 },
        React.createElement(Text, { bold: true, color: 'cyan' },
          isCreate ? 'New Todo \u2014 Title' : 'Edit Todo \u2014 Title',
        ),
      ),
      React.createElement(Box, { paddingX: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: isCreate ? handleTitleSubmit : handleEditTitleSubmit,
        }),
      ),
      React.createElement(Box, { paddingX: 1, marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to confirm, Escape to cancel'),
      ),
    );
  }

  // Render priority selection overlays
  if (mode === 'create-priority') {
    return renderPrioritySelector('New Todo \u2014 Priority', createPriority);
  }
  if (mode === 'edit-priority') {
    return renderPrioritySelector('Edit Todo \u2014 Priority', editPriority);
  }

  // Render project selection overlays
  if (mode === 'create-project') {
    return renderProjectSelector('New Todo \u2014 Project', createProjectIndex);
  }
  if (mode === 'edit-project') {
    return renderProjectSelector('Edit Todo \u2014 Project', editProjectIndex);
  }

  // Render finishing states (editor is open)
  if (mode === 'create-finishing' || mode === 'edit-finishing') {
    return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(Text, { dimColor: true }, 'Opening editor for description...'),
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
