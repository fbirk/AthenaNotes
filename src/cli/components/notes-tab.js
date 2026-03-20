/**
 * NotesTab Component
 * Full-featured notes management tab with list/preview/edit modes,
 * project filtering, sorting, and CRUD operations.
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

const SORT_OPTIONS = [
  { sortBy: 'modifiedAt', sortOrder: 'desc', label: 'Recent' },
  { sortBy: 'modifiedAt', sortOrder: 'asc', label: 'Oldest' },
  { sortBy: 'title', sortOrder: 'asc', label: 'Title A-Z' },
  { sortBy: 'title', sortOrder: 'desc', label: 'Title Z-A' },
  { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest' },
  { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest Created' },
];

const CONTEXT_ID = 'notes-tab';

const SHORTCUTS = [
  { key: 'e', description: 'Edit' },
  { key: 'n', description: 'New note' },
  { key: 'd', description: 'Delete' },
  { key: 'f', description: 'Filter project' },
  { key: 's', description: 'Sort' },
];

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Whether this tab accepts input
 * @param {Object} props.keyboard - Keyboard hook instance with registerContext/unregisterContext
 * @param {Function} props.onShortcutsChange - Update status bar shortcuts
 * @param {Function} props.onItemCountChange - Update status bar item count
 * @param {Function} props.showFeedback - Show feedback in status bar
 */
export function NotesTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedNote, setSelectedNote] = useState(null);
  const [mode, setMode] = useState('list');
  // list, preview, creating, creating-project, creating-finishing,
  // editing-title, editing-project, editing-finishing,
  const [newTitle, setNewTitle] = useState('');
  const [projectFilter, setProjectFilter] = useState(null);
  const [sortIndex, setSortIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createProjectIndex, setCreateProjectIndex] = useState(0); // 0 = None/current filter
  const [editTitle, setEditTitle] = useState('');
  const [editProjectIndex, setEditProjectIndex] = useState(0);

  const currentSort = SORT_OPTIONS[sortIndex];

  const fetchNotes = useCallback(
    () => kb.listNotes({
      projectId: projectFilter,
      sortBy: currentSort.sortBy,
      sortOrder: currentSort.sortOrder,
    }),
    [projectFilter, currentSort.sortBy, currentSort.sortOrder]
  );

  const { data: notes, loading: notesLoading, refresh: refreshNotes } = useData(
    fetchNotes,
    { autoLoad: true, deps: [projectFilter, sortIndex] }
  );

  const { data: projects, refresh: refreshProjects } = useData(
    useCallback(() => kb.listProjects(), []),
    { autoLoad: true }
  );

  const notesList = notes || [];
  const projectsList = projects || [];

  // Auto-load first note when list first arrives
  useEffect(() => {
    if (notesList.length > 0 && !selectedNote && mode === 'list') {
      const note = notesList[0];
      kb.getNote(note.id).then(result => {
        if (result.success) {
          setSelectedNote(result.data);
          setMode('preview');
        }
      });
    }
  }, [notesList.length]); // intentionally only triggers on list length change

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count when notes change
  useEffect(() => {
    onItemCountChange?.(notesList.length);
  }, [notesList.length, onItemCountChange]);

  // Reset selection when notes change
  useEffect(() => {
    if (selectedIndex >= notesList.length && notesList.length > 0) {
      setSelectedIndex(notesList.length - 1);
    }
  }, [notesList.length, selectedIndex]);

  // Load full note content when selecting
  const loadNote = useCallback(async (index) => {
    const note = notesList[index];
    if (!note) return;
    const result = await kb.getNote(note.id);
    if (result.success) {
      setSelectedNote(result.data);
      setMode('preview');
    } else {
      showFeedback?.(`Failed to load note: ${result.error}`, 'error');
    }
  }, [notesList, showFeedback]);

  // Handle note selection from list
  const handleSelect = useCallback((index) => {
    loadNote(index);
  }, [loadNote]);

  // Handle highlight change (arrow key navigation) — auto-load preview
  const handleHighlight = useCallback((index) => {
    setSelectedIndex(index);
    const note = notesList[index];
    if (note) {
      kb.getNote(note.id).then(result => {
        if (result.success) {
          setSelectedNote(result.data);
          setMode('preview');
        }
      });
    }
  }, [notesList]);

  // Handle back/escape
  const handleBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === 'creating' || mode === 'creating-project') {
      setMode('list');
      setNewTitle('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'editing-title' || mode === 'editing-project') {
      setMode('preview');
      keyboard?.setInputMode?.(null);
      return;
    }
  }, [mode, showDeleteConfirm, keyboard]);

  // Edit note flow: title → project → editor
  const handleEdit = useCallback(() => {
    if (!selectedNote) {
      showFeedback?.('Select a note first', 'error');
      return;
    }
    setMode('editing-title');
    setEditTitle(selectedNote.title);
    // Find current project index
    const projIdx = selectedNote.projectId
      ? projectsList.findIndex(p => p.id === selectedNote.projectId) + 1
      : 0;
    setEditProjectIndex(projIdx >= 0 ? projIdx : 0);
    keyboard?.setInputMode?.('text');
  }, [selectedNote, projectsList, keyboard, showFeedback]);

  const handleEditTitleSubmit = useCallback((title) => {
    const trimmed = title.trim() || selectedNote?.title || '';
    setEditTitle(trimmed);
    if (projectsList.length > 0) {
      setMode('editing-project');
      keyboard?.setInputMode?.(null);
    } else {
      setMode('editing-finishing');
      keyboard?.setInputMode?.(null);
    }
  }, [selectedNote, projectsList.length, keyboard]);

  const handleEditProjectConfirm = useCallback(() => {
    setMode('editing-finishing');
  }, []);

  // Effect to handle edit finishing (open editor + update)
  useEffect(() => {
    if (mode !== 'editing-finishing') return;
    if (!selectedNote) return;
    let cancelled = false;

    (async () => {
      const updates = {};
      if (editTitle !== selectedNote.title) {
        updates.title = editTitle;
      }
      const newProjectId = editProjectIndex > 0 ? projectsList[editProjectIndex - 1].id : null;
      if (newProjectId !== (selectedNote.projectId || null)) {
        updates.projectId = newProjectId;
      }

      try {
        const result = await editInExternalEditor(selectedNote.content || '');
        if (result.changed) {
          updates.content = result.content;
        }
      } catch {
        // Editor failed
      }
      if (cancelled) return;

      if (Object.keys(updates).length > 0) {
        const updateResult = await kb.updateNote({ id: selectedNote.id, updates });
        if (updateResult.success) {
          setSelectedNote(updateResult.data);
          showFeedback?.('Note saved', 'success');
          refreshNotes();
        } else {
          showFeedback?.(`Failed to save: ${updateResult.error}`, 'error');
        }
      } else {
        showFeedback?.('No changes made', 'info');
      }
      setMode('preview');
    })();

    return () => { cancelled = true; };
  }, [mode, selectedNote?.id, editTitle, editProjectIndex, projectsList, showFeedback, refreshNotes]);

  // Create new note flow: title → project → editor
  const handleCreateStart = useCallback(() => {
    setMode('creating');
    setNewTitle('');
    // Default to current filter project, or None
    const filterIdx = projectFilter
      ? projectsList.findIndex(p => p.id === projectFilter) + 1
      : 0;
    setCreateProjectIndex(filterIdx >= 0 ? filterIdx : 0);
    keyboard?.setInputMode?.('text');
  }, [keyboard, projectFilter, projectsList]);

  const handleCreateTitleSubmit = useCallback((title) => {
    if (!title.trim()) {
      setMode('list');
      setNewTitle('');
      keyboard?.setInputMode?.(null);
      return;
    }
    setNewTitle(title.trim());
    if (projectsList.length > 0) {
      setMode('creating-project');
      keyboard?.setInputMode?.(null);
    } else {
      setMode('creating-finishing');
      keyboard?.setInputMode?.(null);
    }
  }, [keyboard, projectsList.length]);

  const handleCreateProjectConfirm = useCallback(() => {
    setMode('creating-finishing');
  }, []);

  // Effect to handle create finishing (open editor + create)
  useEffect(() => {
    if (mode !== 'creating-finishing') return;
    let cancelled = false;

    (async () => {
      const projectId = createProjectIndex > 0 ? projectsList[createProjectIndex - 1].id : null;
      let content = '';
      try {
        const result = await editInExternalEditor('');
        content = result.content;
      } catch {
        // Editor failed
      }
      if (cancelled) return;

      const createResult = await kb.createNote({
        title: newTitle,
        content,
        projectId,
      });
      if (createResult.success) {
        showFeedback?.(`Created note: ${newTitle}`, 'success');
        refreshNotes();
        const noteResult = await kb.getNote(createResult.data.id);
        if (noteResult.success) {
          setSelectedNote(noteResult.data);
          setMode('preview');
        } else {
          setMode('list');
        }
      } else {
        showFeedback?.(`Failed to create note: ${createResult.error}`, 'error');
        setMode('list');
      }
      setNewTitle('');
    })();

    return () => { cancelled = true; };
  }, [mode, newTitle, createProjectIndex, projectsList, showFeedback, refreshNotes]);

  // Delete note
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedNote) return;
    const result = await kb.deleteNote(selectedNote.id);
    setShowDeleteConfirm(false);
    if (result.success) {
      showFeedback?.(`Deleted: ${selectedNote.title}`, 'success');
      setSelectedNote(null);
      setMode('list');
      refreshNotes();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedNote, showFeedback, refreshNotes]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Cycle project filter
  const handleCycleFilter = useCallback(() => {
    if (projectsList.length === 0) {
      showFeedback?.('No projects available', 'info');
      return;
    }
    if (projectFilter === null) {
      setProjectFilter(projectsList[0].id);
      showFeedback?.(`Filter: ${projectsList[0].name}`, 'info');
    } else {
      const currentIndex = projectsList.findIndex(p => p.id === projectFilter);
      if (currentIndex === -1 || currentIndex >= projectsList.length - 1) {
        setProjectFilter(null);
        showFeedback?.('Filter: All projects', 'info');
      } else {
        setProjectFilter(projectsList[currentIndex + 1].id);
        showFeedback?.(`Filter: ${projectsList[currentIndex + 1].name}`, 'info');
      }
    }
    setSelectedIndex(0);
    setSelectedNote(null);
    setMode('list');
  }, [projectsList, projectFilter, showFeedback]);

  // Cycle sort
  const handleCycleSort = useCallback(() => {
    const nextIndex = (sortIndex + 1) % SORT_OPTIONS.length;
    setSortIndex(nextIndex);
    showFeedback?.(`Sort: ${SORT_OPTIONS[nextIndex].label}`, 'info');
    setSelectedIndex(0);
  }, [sortIndex, showFeedback]);

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input, key) => {
      // Do not intercept keys while in text input mode, selection mode, or delete confirmation
      if (mode !== 'list' && mode !== 'preview') return false;
      if (showDeleteConfirm) return false;

      if (input === 'e') {
        handleEdit();
        return true;
      }
      if (input === 'n') {
        handleCreateStart();
        return true;
      }
      if (input === 'd') {
        if (selectedNote) {
          setShowDeleteConfirm(true);
        } else {
          showFeedback?.('Select a note to delete', 'error');
        }
        return true;
      }
      if (input === 'f') {
        handleCycleFilter();
        return true;
      }
      if (input === 's') {
        handleCycleSort();
        return true;
      }
      return false;
    };

    keyboard.registerContext(CONTEXT_ID, handler);
    return () => {
      keyboard.unregisterContext(CONTEXT_ID);
    };
  }, [
    keyboard, isActive, mode, selectedNote, showDeleteConfirm,
    handleEdit, handleCreateStart, handleCycleFilter, handleCycleSort, showFeedback,
  ]);

  // Handle escape in text input modes
  useInput((input, key) => {
    if (!isActive) return;
    if ((mode === 'creating' || mode === 'editing-title') && key.escape) {
      handleBack();
    }
  }, { isActive: isActive && (mode === 'creating' || mode === 'editing-title') });

  // Handle project selection during create
  useInput((input, key) => {
    if (!isActive || mode !== 'creating-project') return;
    const optionCount = projectsList.length + 1;
    if (key.upArrow || key.leftArrow) {
      setCreateProjectIndex(prev => (prev - 1 + optionCount) % optionCount);
    } else if (key.downArrow || key.rightArrow) {
      setCreateProjectIndex(prev => (prev + 1) % optionCount);
    } else if (key.return) {
      handleCreateProjectConfirm();
    } else if (key.escape) {
      handleBack();
    }
  }, { isActive: isActive && mode === 'creating-project' });

  // Handle project selection during edit
  useInput((input, key) => {
    if (!isActive || mode !== 'editing-project') return;
    const optionCount = projectsList.length + 1;
    if (key.upArrow || key.leftArrow) {
      setEditProjectIndex(prev => (prev - 1 + optionCount) % optionCount);
    } else if (key.downArrow || key.rightArrow) {
      setEditProjectIndex(prev => (prev + 1) % optionCount);
    } else if (key.return) {
      handleEditProjectConfirm();
    } else if (key.escape) {
      handleBack();
    }
  }, { isActive: isActive && mode === 'editing-project' });

  // Find project name for a note
  const getProjectName = useCallback((projectId) => {
    if (!projectId) return null;
    const project = projectsList.find(p => p.id === projectId);
    return project ? project.name : null;
  }, [projectsList]);

  // Build list items
  const items = notesList.map(note => ({
    id: note.id,
    label: note.title,
    meta: new Date(note.modifiedAt).toLocaleDateString(),
    dimmed: false,
  }));

  // Build detail panel content
  let detailContent = null;

  // Helper to render project selector
  const renderProjectSelector = (title, currentIndex, setIndex) => {
    const projectOptions = ['None', ...projectsList.map(p => p.name)];
    return React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, title),
      React.createElement(Box, { paddingX: 0, flexDirection: 'column', marginTop: 1 },
        ...projectOptions.map((name, i) =>
          React.createElement(Text, {
            key: name,
            bold: i === currentIndex,
            inverse: i === currentIndex,
            color: i === currentIndex ? 'cyan' : undefined,
          }, `${i === currentIndex ? '\u25B8 ' : '  '}${name}`)
        ),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, '\u2191/\u2193 to select, Enter to confirm, Escape to cancel'),
      ),
    );
  };

  if (showDeleteConfirm && selectedNote) {
    detailContent = React.createElement(ConfirmDialog, {
      message: `Delete "${selectedNote.title}"?`,
      onConfirm: handleDeleteConfirm,
      onCancel: handleDeleteCancel,
    });
  } else if (mode === 'creating') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Note \u2014 Title'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: newTitle,
          onChange: setNewTitle,
          onSubmit: handleCreateTitleSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to continue, Escape to cancel'),
      ),
    );
  } else if (mode === 'creating-project') {
    detailContent = renderProjectSelector('New Note \u2014 Project', createProjectIndex, setCreateProjectIndex);
  } else if (mode === 'creating-finishing') {
    detailContent = React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, 'Opening editor for content...'),
    );
  } else if (mode === 'editing-title') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Note \u2014 Title'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: editTitle,
          onChange: setEditTitle,
          onSubmit: handleEditTitleSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Enter to continue, Escape to cancel'),
      ),
    );
  } else if (mode === 'editing-project') {
    detailContent = renderProjectSelector('Edit Note \u2014 Project', editProjectIndex, setEditProjectIndex);
  } else if (mode === 'editing-finishing') {
    detailContent = React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, 'Opening editor for content...'),
    );
  } else if (selectedNote && mode === 'preview') {
    const projectName = getProjectName(selectedNote.projectId);
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
      React.createElement(Box, { marginBottom: 1, flexDirection: 'column' },
        React.createElement(Text, { bold: true }, selectedNote.title),
        projectName && React.createElement(Text, { color: 'cyan', dimColor: true }, `Project: ${projectName}`),
        React.createElement(Text, { dimColor: true },
          `Modified: ${new Date(selectedNote.modifiedAt).toLocaleString()}`
        ),
      ),
      React.createElement(MarkdownPreview, { markdown: selectedNote.content || '' }),
    );
  } else {
    detailContent = React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, "Select a note or press 'n' to create"),
    );
  }

  // Filter indicator
  const filterLabel = projectFilter
    ? getProjectName(projectFilter) || 'Unknown'
    : null;

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    // Filter/sort indicator bar
    (filterLabel || currentSort.label !== 'Recent') && React.createElement(
      Box, { paddingX: 1, gap: 2 },
      filterLabel && React.createElement(Text, { color: 'cyan' }, `Filter: ${filterLabel}`),
      currentSort.label !== 'Recent' && React.createElement(Text, { color: 'yellow' }, `Sort: ${currentSort.label}`),
    ),
    // Main list-detail layout
    React.createElement(ListDetail, {
      items,
      selectedIndex,
      onSelect: handleSelect,
      onHighlight: handleHighlight,
      onBack: handleBack,
      detail: detailContent,
      showDetail: true,
      isActive: isActive && (mode === 'list' || mode === 'preview') && !showDeleteConfirm,
      emptyMessage: notesLoading ? 'Loading notes...' : 'No notes found',
      listWidth: 30,
    }),
  );
}
