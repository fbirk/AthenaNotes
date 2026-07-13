/**
 * ProjectsTab Component
 * Full-featured project management tab with list/detail layout,
 * CRUD operations, and per-project note counts.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ListDetail } from './list-detail.js';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { useData } from '../hooks/use-data.js';

const CONTEXT_ID = 'projects-tab';

const SHORTCUTS = [
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Whether this tab accepts input
 * @param {Object} props.keyboard - Keyboard hook instance
 * @param {Function} props.onShortcutsChange - Update status bar shortcuts
 * @param {Function} props.onItemCountChange - Update status bar item count
 * @param {Function} props.showFeedback - Show feedback in status bar
 */
export function ProjectsTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('list'); // list | creating-name | creating-desc | editing-name | editing-desc | confirm-delete
  const [inputValue, setInputValue] = useState('');
  const [pendingName, setPendingName] = useState('');

  const { data: projects, loading: projectsLoading, refresh: refreshProjects } = useData(
    useCallback(() => kb.listProjects(), []),
    { autoLoad: true }
  );

  const { data: notes, refresh: refreshNotes } = useData(
    useCallback(() => kb.listNotes(), []),
    { autoLoad: true }
  );

  const projectsList = projects || [];
  const notesList = notes || [];

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count when projects change
  useEffect(() => {
    onItemCountChange?.(projectsList.length);
  }, [projectsList.length, onItemCountChange]);

  // Reset selection when projects change
  useEffect(() => {
    if (selectedIndex >= projectsList.length && projectsList.length > 0) {
      setSelectedIndex(projectsList.length - 1);
    }
  }, [projectsList.length, selectedIndex]);

  // Count notes for a given project
  const getNoteCount = useCallback((projectId) => {
    return notesList.filter(n => n.projectId === projectId).length;
  }, [notesList]);

  // Get the currently selected project
  const selectedProject = projectsList[selectedIndex] || null;

  // Handle highlight change
  const handleHighlight = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  // Handle select (Enter)
  const handleSelect = useCallback(() => {
    // No-op; detail is always shown for selected project
  }, []);

  // Handle back/escape
  const handleBack = useCallback(() => {
    if (mode === 'creating-name' || mode === 'creating-desc') {
      setMode('list');
      setInputValue('');
      setPendingName('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'editing-name' || mode === 'editing-desc') {
      setMode('list');
      setInputValue('');
      setPendingName('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'confirm-delete') {
      setMode('list');
      return;
    }
  }, [mode, keyboard]);

  // Escape cancels the active create/edit form. This runs independently of the
  // global keyboard hook, so the tab isn't left stuck in a form. The delete
  // confirmation handles its own escape via ConfirmDialog.
  useInput((input, key) => {
    if (key.escape) handleBack();
  }, {
    isActive: isActive && (mode === 'creating-name' || mode === 'creating-desc'
      || mode === 'editing-name' || mode === 'editing-desc'),
  });

  // Create project - step 1: name
  const handleCreateStart = useCallback(() => {
    setMode('creating-name');
    setInputValue('');
    setPendingName('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  // Create project - submit name, move to description
  const handleCreateNameSubmit = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMode('list');
      setInputValue('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (trimmed.length > 100) {
      showFeedback?.('Name must be 100 characters or less', 'error');
      return;
    }
    setPendingName(trimmed);
    setInputValue('');
    setMode('creating-desc');
  }, [keyboard, showFeedback]);

  // Create project - submit description
  const handleCreateDescSubmit = useCallback(async (description) => {
    keyboard?.setInputMode?.(null);
    const trimmed = description.trim();
    if (trimmed.length > 500) {
      showFeedback?.('Description must be 500 characters or less', 'error');
      return;
    }
    const result = await kb.createProject({ name: pendingName, description: trimmed });
    if (result.success) {
      showFeedback?.(`Created project: ${pendingName}`, 'success');
      refreshProjects();
      refreshNotes();
    } else {
      showFeedback?.(`Failed to create project: ${result.error}`, 'error');
    }
    setMode('list');
    setInputValue('');
    setPendingName('');
  }, [keyboard, pendingName, showFeedback, refreshProjects, refreshNotes]);

  // Edit project - step 1: name
  const handleEditStart = useCallback(() => {
    if (!selectedProject) {
      showFeedback?.('Select a project to edit', 'error');
      return;
    }
    setMode('editing-name');
    setInputValue(selectedProject.name);
    setPendingName('');
    keyboard?.setInputMode?.('text');
  }, [selectedProject, keyboard, showFeedback]);

  // Edit project - submit name, move to description
  const handleEditNameSubmit = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMode('list');
      setInputValue('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (trimmed.length > 100) {
      showFeedback?.('Name must be 100 characters or less', 'error');
      return;
    }
    setPendingName(trimmed);
    setInputValue(selectedProject?.description || '');
    setMode('editing-desc');
  }, [keyboard, selectedProject, showFeedback]);

  // Edit project - submit description
  const handleEditDescSubmit = useCallback(async (description) => {
    keyboard?.setInputMode?.(null);
    const trimmed = description.trim();
    if (trimmed.length > 500) {
      showFeedback?.('Description must be 500 characters or less', 'error');
      return;
    }
    const result = await kb.updateProject({
      id: selectedProject.id,
      updates: { name: pendingName, description: trimmed },
    });
    if (result.success) {
      showFeedback?.(`Updated project: ${pendingName}`, 'success');
      refreshProjects();
      refreshNotes();
    } else {
      showFeedback?.(`Failed to update project: ${result.error}`, 'error');
    }
    setMode('list');
    setInputValue('');
    setPendingName('');
  }, [keyboard, selectedProject, pendingName, showFeedback, refreshProjects, refreshNotes]);

  // Delete project
  const handleDeleteStart = useCallback(() => {
    if (!selectedProject) {
      showFeedback?.('Select a project to delete', 'error');
      return;
    }
    setMode('confirm-delete');
  }, [selectedProject, showFeedback]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedProject) return;
    const result = await kb.deleteProject({ projectId: selectedProject.id, deleteNotes: true });
    setMode('list');
    if (result.success) {
      showFeedback?.(`Deleted project: ${selectedProject.name}`, 'success');
      refreshProjects();
      refreshNotes();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedProject, showFeedback, refreshProjects, refreshNotes]);

  const handleDeleteCancel = useCallback(() => {
    setMode('list');
  }, []);

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input, key) => {
      if (mode !== 'list') return false;

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
  }, [keyboard, isActive, mode, handleCreateStart, handleEditStart, handleDeleteStart]);

  // Build list items
  const items = projectsList.map(p => ({
    id: p.id,
    label: p.name,
    meta: p.status,
  }));

  // Build detail panel content
  let detailContent = null;

  if (mode === 'confirm-delete' && selectedProject) {
    detailContent = React.createElement(ConfirmDialog, {
      message: `Delete project "${selectedProject.name}" and its notes?`,
      onConfirm: handleDeleteConfirm,
      onCancel: handleDeleteCancel,
    });
  } else if (mode === 'creating-name') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Project'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Name: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleCreateNameSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  } else if (mode === 'creating-desc') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Project'),
      React.createElement(Text, { dimColor: true }, `Name: ${pendingName}`),
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
  } else if (mode === 'editing-name' && selectedProject) {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Project'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Name: '),
        React.createElement(TextInput, {
          value: inputValue,
          onChange: setInputValue,
          onSubmit: handleEditNameSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  } else if (mode === 'editing-desc' && selectedProject) {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Project'),
      React.createElement(Text, { dimColor: true }, `Name: ${pendingName}`),
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
  } else if (selectedProject) {
    const noteCount = getNoteCount(selectedProject.id);
    const statusColor = selectedProject.status === 'active' ? 'green' : 'gray';
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
      React.createElement(Box, { marginBottom: 1, flexDirection: 'column' },
        React.createElement(Text, { bold: true }, selectedProject.name),
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { dimColor: true }, 'Status: '),
          React.createElement(Text, { color: statusColor }, selectedProject.status || 'active'),
        ),
        selectedProject.description && React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
          React.createElement(Text, { dimColor: true }, 'Description:'),
          React.createElement(Text, null, selectedProject.description),
        ),
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { dimColor: true }, 'Notes: '),
          React.createElement(Text, null, `${noteCount} note${noteCount !== 1 ? 's' : ''}`),
        ),
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { dimColor: true },
            `Created: ${new Date(selectedProject.createdAt).toLocaleString()}`
          ),
        ),
      ),
    );
  } else {
    detailContent = React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, "Select a project or press 'n' to create"),
    );
  }

  const isInputMode = mode === 'creating-name' || mode === 'creating-desc'
    || mode === 'editing-name' || mode === 'editing-desc';

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    React.createElement(ListDetail, {
      items,
      selectedIndex,
      onSelect: handleSelect,
      onHighlight: handleHighlight,
      onBack: handleBack,
      detail: detailContent,
      showDetail: true,
      isActive: isActive && !isInputMode && mode !== 'confirm-delete',
      emptyMessage: projectsLoading ? 'Loading projects...' : 'No projects found',
      listWidth: 30,
    }),
  );
}
