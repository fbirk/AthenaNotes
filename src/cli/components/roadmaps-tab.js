/**
 * RoadmapsTab Component
 * Displays project roadmaps with milestones, progress bars,
 * and timeline visualization. Supports milestone CRUD and project filtering.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { useData } from '../hooks/use-data.js';

const CONTEXT_ID = 'roadmaps-tab';

const SHORTCUTS = [
  { key: 'Space', description: 'Toggle' },
  { key: 'f', description: 'Filter' },
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

const PROGRESS_BAR_WIDTH = 12;

/**
 * Build a Unicode progress bar.
 * @param {number} ratio - Value between 0 and 1
 * @returns {string}
 */
function buildProgressBar(ratio) {
  const filled = Math.round(ratio * PROGRESS_BAR_WIDTH);
  const empty = PROGRESS_BAR_WIDTH - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

/**
 * Format a date string as YYYY-MM-DD.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

/**
 * Get today's date as YYYY-MM-DD string.
 * @returns {string}
 */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Whether this tab accepts input
 * @param {Object} props.keyboard - Keyboard hook instance
 * @param {Function} props.onShortcutsChange - Update status bar shortcuts
 * @param {Function} props.onItemCountChange - Update status bar item count
 * @param {Function} props.showFeedback - Show feedback in status bar
 */
export function RoadmapsTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [filterIndex, setFilterIndex] = useState(-1); // -1 = All
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [mode, setMode] = useState('view'); // view | creating-title | creating-deadline | creating-desc | editing-title | editing-deadline | editing-desc | confirm-delete
  const [inputValue, setInputValue] = useState('');
  const [pendingTitle, setPendingTitle] = useState('');
  const [pendingDeadline, setPendingDeadline] = useState('');

  const { stdout } = useStdout();
  const termHeight = stdout?.rows || 24;
  const visibleHeight = Math.max(termHeight - 6, 5);

  const { data: projects, refresh: refreshProjects } = useData(
    useCallback(() => kb.listProjects(), []),
    { autoLoad: true }
  );

  const { data: milestones, refresh: refreshMilestones } = useData(
    useCallback(() => kb.listMilestones(), []),
    { autoLoad: true }
  );

  const { data: todos, refresh: refreshTodos } = useData(
    useCallback(() => kb.listTodos(), []),
    { autoLoad: true }
  );

  const projectsList = projects || [];
  const milestonesList = milestones || [];
  const todosList = todos || [];

  // Current filter project (null = all)
  const filterProject = filterIndex >= 0 && filterIndex < projectsList.length
    ? projectsList[filterIndex]
    : null;

  // Build the flat timeline structure: array of { type, data, projectId, projectName }
  // grouped by project, each group preceded by a project header entry
  const timeline = useCallback(() => {
    const filteredProjects = filterProject
      ? projectsList.filter(p => p.id === filterProject.id)
      : projectsList;

    const result = [];

    for (const project of filteredProjects) {
      // Gather milestones for this project
      const projectMilestones = milestonesList
        .filter(m => m.projectId === project.id)
        .map(m => ({
          type: 'milestone',
          data: m,
          projectId: project.id,
          projectName: project.name,
          deadline: m.deadline || '',
          completed: m.completed,
          id: m.id,
        }));

      // Gather todos with this projectId
      const projectTodos = todosList
        .filter(t => t.projectId === project.id)
        .map(t => ({
          type: 'todo',
          data: t,
          projectId: project.id,
          projectName: project.name,
          deadline: t.deadline || '',
          completed: t.completed,
          id: t.id,
        }));

      // Combine and sort by deadline
      const items = [...projectMilestones, ...projectTodos].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });

      // Progress is milestones only
      const completedMilestones = projectMilestones.filter(m => m.completed).length;
      const totalMilestones = projectMilestones.length;

      result.push({
        type: 'project-header',
        projectId: project.id,
        projectName: project.name,
        completedMilestones,
        totalMilestones,
        items,
      });

      for (let i = 0; i < items.length; i++) {
        result.push({ ...items[i], isLast: i === items.length - 1 });
      }
    }

    return result;
  }, [projectsList, milestonesList, todosList, filterProject])();

  // Selectable items (only milestones and todos, not headers)
  const selectableItems = timeline.filter(
    entry => entry.type === 'milestone' || entry.type === 'todo'
  );

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count
  useEffect(() => {
    onItemCountChange?.(selectableItems.length);
  }, [selectableItems.length, onItemCountChange]);

  // Reset selection if out of bounds
  useEffect(() => {
    if (selectedItemIndex >= selectableItems.length && selectableItems.length > 0) {
      setSelectedItemIndex(selectableItems.length - 1);
    }
  }, [selectableItems.length, selectedItemIndex]);

  // Get the currently selected timeline item
  const selectedItem = selectableItems[selectedItemIndex] || null;

  // Find the project ID to assign new milestones to
  const getTargetProjectId = useCallback(() => {
    if (filterProject) return filterProject.id;
    if (selectedItem) return selectedItem.projectId;
    if (projectsList.length > 0) return projectsList[0].id;
    return null;
  }, [filterProject, selectedItem, projectsList]);

  // Toggle milestone completion
  const handleToggle = useCallback(async () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'milestone') {
      const result = await kb.toggleMilestoneComplete(selectedItem.id);
      if (result.success) {
        showFeedback?.(result.data.completed ? 'Milestone completed' : 'Milestone reopened', 'success');
        refreshMilestones();
      } else {
        showFeedback?.(`Toggle failed: ${result.error}`, 'error');
      }
    } else if (selectedItem.type === 'todo') {
      const result = await kb.toggleTodoComplete(selectedItem.id);
      if (result.success) {
        showFeedback?.(result.data.completed ? 'Todo completed' : 'Todo reopened', 'success');
        refreshTodos();
      } else {
        showFeedback?.(`Toggle failed: ${result.error}`, 'error');
      }
    }
  }, [selectedItem, showFeedback, refreshMilestones, refreshTodos]);

  // Cycle project filter
  const handleCycleFilter = useCallback(() => {
    if (projectsList.length === 0) {
      showFeedback?.('No projects available', 'info');
      return;
    }
    const nextIndex = filterIndex + 1;
    if (nextIndex >= projectsList.length) {
      setFilterIndex(-1);
      showFeedback?.('Filter: All Projects', 'info');
    } else {
      setFilterIndex(nextIndex);
      showFeedback?.(`Filter: ${projectsList[nextIndex].name}`, 'info');
    }
    setSelectedItemIndex(0);
    setScrollOffset(0);
  }, [projectsList, filterIndex, showFeedback]);

  // Create milestone - step 1: title
  const handleCreateStart = useCallback(() => {
    const targetProjectId = getTargetProjectId();
    if (!targetProjectId) {
      showFeedback?.('Create a project first', 'error');
      return;
    }
    setMode('creating-title');
    setInputValue('');
    setPendingTitle('');
    setPendingDeadline('');
    keyboard?.setInputMode?.('text');
  }, [keyboard, getTargetProjectId, showFeedback]);

  const handleCreateTitleSubmit = useCallback((title) => {
    const trimmed = title.trim();
    if (!trimmed) {
      setMode('view');
      setInputValue('');
      keyboard?.setInputMode?.(null);
      return;
    }
    setPendingTitle(trimmed);
    setInputValue('');
    setMode('creating-deadline');
  }, [keyboard]);

  const handleCreateDeadlineSubmit = useCallback((deadline) => {
    const trimmed = deadline.trim();
    // Validate YYYY-MM-DD format
    if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      showFeedback?.('Invalid date format. Use YYYY-MM-DD', 'error');
      return;
    }
    setPendingDeadline(trimmed);
    setInputValue('');
    setMode('creating-desc');
  }, [showFeedback]);

  const handleCreateDescSubmit = useCallback(async (description) => {
    keyboard?.setInputMode?.(null);
    const targetProjectId = getTargetProjectId();
    const result = await kb.createMilestone({
      title: pendingTitle,
      projectId: targetProjectId,
      deadline: pendingDeadline || null,
      description: description.trim(),
    });
    if (result.success) {
      showFeedback?.(`Created milestone: ${pendingTitle}`, 'success');
      refreshMilestones();
    } else {
      showFeedback?.(`Failed to create milestone: ${result.error}`, 'error');
    }
    setMode('view');
    setInputValue('');
    setPendingTitle('');
    setPendingDeadline('');
  }, [keyboard, pendingTitle, pendingDeadline, getTargetProjectId, showFeedback, refreshMilestones]);

  // Edit milestone
  const handleEditStart = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'milestone') {
      showFeedback?.('Select a milestone to edit', 'error');
      return;
    }
    setMode('editing-title');
    setInputValue(selectedItem.data.title || '');
    setPendingTitle('');
    setPendingDeadline('');
    keyboard?.setInputMode?.('text');
  }, [selectedItem, keyboard, showFeedback]);

  const handleEditTitleSubmit = useCallback((title) => {
    const trimmed = title.trim();
    if (!trimmed) {
      setMode('view');
      setInputValue('');
      keyboard?.setInputMode?.(null);
      return;
    }
    setPendingTitle(trimmed);
    setInputValue(selectedItem?.data?.deadline || '');
    setMode('editing-deadline');
  }, [keyboard, selectedItem]);

  const handleEditDeadlineSubmit = useCallback((deadline) => {
    const trimmed = deadline.trim();
    if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      showFeedback?.('Invalid date format. Use YYYY-MM-DD', 'error');
      return;
    }
    setPendingDeadline(trimmed);
    setInputValue(selectedItem?.data?.description || '');
    setMode('editing-desc');
  }, [showFeedback, selectedItem]);

  const handleEditDescSubmit = useCallback(async (description) => {
    keyboard?.setInputMode?.(null);
    const result = await kb.updateMilestone({
      id: selectedItem.id,
      updates: {
        title: pendingTitle,
        deadline: pendingDeadline || null,
        description: description.trim(),
      },
    });
    if (result.success) {
      showFeedback?.(`Updated milestone: ${pendingTitle}`, 'success');
      refreshMilestones();
    } else {
      showFeedback?.(`Failed to update milestone: ${result.error}`, 'error');
    }
    setMode('view');
    setInputValue('');
    setPendingTitle('');
    setPendingDeadline('');
  }, [keyboard, selectedItem, pendingTitle, pendingDeadline, showFeedback, refreshMilestones]);

  // Delete milestone
  const handleDeleteStart = useCallback(() => {
    if (!selectedItem || selectedItem.type !== 'milestone') {
      showFeedback?.('Select a milestone to delete', 'error');
      return;
    }
    setMode('confirm-delete');
  }, [selectedItem, showFeedback]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItem) return;
    const result = await kb.deleteMilestone(selectedItem.id);
    setMode('view');
    if (result.success) {
      showFeedback?.(`Deleted milestone: ${selectedItem.data.title}`, 'success');
      refreshMilestones();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedItem, showFeedback, refreshMilestones]);

  const handleDeleteCancel = useCallback(() => {
    setMode('view');
  }, []);

  // Handle back/escape
  const handleBack = useCallback(() => {
    if (mode !== 'view') {
      setMode('view');
      setInputValue('');
      setPendingTitle('');
      setPendingDeadline('');
      keyboard?.setInputMode?.(null);
    }
  }, [mode, keyboard]);

  // Arrow key navigation, space toggle, and shortcut keys
  useInput((input, key) => {
    if (!isActive || mode !== 'view') return;

    if (key.escape) {
      handleBack();
      return;
    }

    if (selectableItems.length === 0) return;

    if (key.upArrow) {
      setSelectedItemIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedItemIndex(prev => Math.min(selectableItems.length - 1, prev + 1));
    } else if (key.pageUp) {
      setSelectedItemIndex(prev => Math.max(0, prev - visibleHeight));
    } else if (key.pageDown) {
      setSelectedItemIndex(prev => Math.min(selectableItems.length - 1, prev + visibleHeight));
    } else if (input === ' ') {
      // Space key: toggle completion directly
      handleToggle();
    }
  }, { isActive: isActive && mode === 'view' });

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input, key) => {
      if (mode !== 'view') return false;

      if (input === ' ') {
        handleToggle();
        return true;
      }
      if (input === 'f') {
        handleCycleFilter();
        return true;
      }
      if (input === 'n') {
        handleCreateStart();
        return true;
      }
      if (input === 'e') {
        handleEditStart();
        return true;
      }
      if (input === 'd') {
        handleDeleteStart();
        return true;
      }
      return false;
    };

    keyboard.registerContext(CONTEXT_ID, handler);
    return () => {
      keyboard.unregisterContext(CONTEXT_ID);
    };
  }, [keyboard, isActive, mode, handleToggle, handleCycleFilter, handleCreateStart, handleEditStart, handleDeleteStart]);

  // Build rendered rows for the timeline view
  const today = todayStr();

  const renderTimeline = () => {
    if (timeline.length === 0) {
      return [
        React.createElement(Text, { key: 'empty', dimColor: true }, 'No projects or milestones found'),
      ];
    }

    const rows = [];
    let currentSelectableIndex = -1;

    for (let i = 0; i < timeline.length; i++) {
      const entry = timeline[i];

      if (entry.type === 'project-header') {
        // Project header with progress bar
        const { projectName, completedMilestones, totalMilestones } = entry;
        const ratio = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
        const percent = Math.round(ratio * 100);
        const bar = buildProgressBar(ratio);

        if (i > 0) {
          rows.push(React.createElement(Box, { key: `spacer-${i}`, height: 1 }));
        }

        rows.push(
          React.createElement(Box, { key: `ph-${entry.projectId}`, flexDirection: 'column' },
            React.createElement(Text, { bold: true, color: 'cyan' }, projectName),
            React.createElement(Box, { marginLeft: 2, marginTop: 0 },
              React.createElement(Text, { dimColor: true }, 'Progress: '),
              React.createElement(Text, { color: ratio >= 1 ? 'green' : ratio > 0 ? 'yellow' : 'gray' }, bar),
              React.createElement(Text, null, ` ${percent}% (${completedMilestones}/${totalMilestones})`),
            ),
          )
        );

        if (entry.items.length === 0) {
          rows.push(
            React.createElement(Box, { key: `no-items-${entry.projectId}`, marginLeft: 2 },
              React.createElement(Text, { dimColor: true }, 'No milestones'),
            )
          );
        }
      } else {
        // Timeline item (milestone or todo)
        currentSelectableIndex++;
        const isSelected = currentSelectableIndex === selectedItemIndex;
        const isLast = entry.isLast;
        const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
        const checkbox = entry.completed ? '\u2611 ' : '\u2610 ';
        const deadlineStr = formatDate(entry.deadline);

        let statusText = '';
        let statusColor = 'white';

        if (entry.completed) {
          statusText = '\u2713 Complete';
          statusColor = 'green';
        } else if (entry.deadline && entry.deadline < today) {
          statusText = '\u26A0 Overdue';
          statusColor = 'red';
        } else {
          statusText = 'Pending';
          statusColor = 'yellow';
        }

        const checkColor = entry.completed ? 'green' : (entry.deadline && entry.deadline < today ? 'red' : 'yellow');
        const typeLabel = entry.type === 'todo' ? ' [todo]' : '';

        rows.push(
          React.createElement(Box, { key: `item-${entry.id}-${currentSelectableIndex}`, marginLeft: 2 },
            React.createElement(Text, {
              inverse: isSelected,
              bold: isSelected,
            },
              connector,
              React.createElement(Text, { color: checkColor }, checkbox),
              entry.data.title || '(untitled)',
              typeLabel,
            ),
            React.createElement(Text, { dimColor: true }, `  ${deadlineStr}  `),
            React.createElement(Text, { color: statusColor }, statusText),
          )
        );
      }
    }

    return rows;
  };

  // Compute visible rows with scroll
  const allRows = renderTimeline();

  // Keep selected item visible by adjusting scroll
  useEffect(() => {
    const estimatedRowPos = Math.max(0, selectedItemIndex);
    if (estimatedRowPos < scrollOffset) {
      setScrollOffset(estimatedRowPos);
    } else if (estimatedRowPos >= scrollOffset + visibleHeight) {
      setScrollOffset(estimatedRowPos - visibleHeight + 1);
    }
  }, [selectedItemIndex, visibleHeight, scrollOffset]);

  // Filter label
  const filterLabel = filterProject ? filterProject.name : 'All Projects';

  // Render input panels for create/edit/delete
  if (mode === 'confirm-delete' && selectedItem) {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(ConfirmDialog, {
        message: `Delete milestone "${selectedItem.data.title}"?`,
        onConfirm: handleDeleteConfirm,
        onCancel: handleDeleteCancel,
      }),
    );
  }

  if (mode === 'creating-title') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Milestone'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleCreateTitleSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  }

  if (mode === 'creating-deadline') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Milestone'),
      React.createElement(Text, { dimColor: true }, `Title: ${pendingTitle}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Deadline (YYYY-MM-DD): '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleCreateDeadlineSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue (leave empty for no deadline), Escape to cancel'),
      ),
    );
  }

  if (mode === 'creating-desc') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Milestone'),
      React.createElement(Text, { dimColor: true }, `Title: ${pendingTitle}`),
      React.createElement(Text, { dimColor: true }, `Deadline: ${pendingDeadline || 'None'}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Description: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleCreateDescSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to create, Escape to cancel'),
      ),
    );
  }

  if (mode === 'editing-title') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Milestone'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleEditTitleSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  }

  if (mode === 'editing-deadline') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Milestone'),
      React.createElement(Text, { dimColor: true }, `Title: ${pendingTitle}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Deadline (YYYY-MM-DD): '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleEditDeadlineSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  }

  if (mode === 'editing-desc') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Milestone'),
      React.createElement(Text, { dimColor: true }, `Title: ${pendingTitle}`),
      React.createElement(Text, { dimColor: true }, `Deadline: ${pendingDeadline || 'None'}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Description: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleEditDescSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to save, Escape to cancel'),
      ),
    );
  }

  // Default: timeline view
  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    // Header bar with title and filter
    React.createElement(Box, { paddingX: 1, justifyContent: 'space-between' },
      React.createElement(Text, { bold: true }, 'Project Roadmaps'),
      React.createElement(Text, { color: 'cyan' }, `Filter: ${filterLabel}`),
    ),
    // Separator
    React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { dimColor: true }, '\u2501'.repeat(Math.min(stdout?.columns || 80, 80) - 2)),
    ),
    // Timeline content (scrollable)
    React.createElement(Box, {
      flexDirection: 'column',
      flexGrow: 1,
      paddingX: 1,
      overflow: 'hidden',
    },
      ...allRows,
    ),
    // Item counter
    selectableItems.length > 0 && React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { dimColor: true },
        `${selectedItemIndex + 1}/${selectableItems.length}`
      ),
    ),
  );
}
