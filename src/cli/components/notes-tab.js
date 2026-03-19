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
  { key: 'p', description: 'Preview' },
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
  const [newTitle, setNewTitle] = useState('');
  const [projectFilter, setProjectFilter] = useState(null);
  const [sortIndex, setSortIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Handle highlight change (arrow key navigation)
  const handleHighlight = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  // Handle back/escape
  const handleBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === 'creating') {
      setMode('list');
      setNewTitle('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (selectedNote) {
      setSelectedNote(null);
      setMode('list');
      return;
    }
  }, [mode, selectedNote, showDeleteConfirm, keyboard]);

  // Edit note in external editor
  const handleEdit = useCallback(async () => {
    if (!selectedNote) {
      showFeedback?.('Select a note first', 'error');
      return;
    }
    try {
      const result = await editInExternalEditor(selectedNote.content || '');
      if (result.changed) {
        const updateResult = await kb.updateNote({
          id: selectedNote.id,
          updates: { content: result.content },
        });
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
    } catch (err) {
      showFeedback?.(`Editor error: ${err.message}`, 'error');
    }
  }, [selectedNote, showFeedback, refreshNotes]);

  // Create new note flow
  const handleCreateStart = useCallback(() => {
    setMode('creating');
    setNewTitle('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleCreateSubmit = useCallback(async (title) => {
    keyboard?.setInputMode?.(null);
    if (!title.trim()) {
      setMode('list');
      setNewTitle('');
      return;
    }
    try {
      const result = await editInExternalEditor('');
      const createResult = await kb.createNote({
        title: title.trim(),
        content: result.content,
        projectId: projectFilter,
      });
      if (createResult.success) {
        showFeedback?.(`Created note: ${title.trim()}`, 'success');
        setMode('list');
        setNewTitle('');
        refreshNotes();
        // Select the new note
        const noteResult = await kb.getNote(createResult.data.id);
        if (noteResult.success) {
          setSelectedNote(noteResult.data);
          setMode('preview');
        }
      } else {
        showFeedback?.(`Failed to create note: ${createResult.error}`, 'error');
        setMode('list');
        setNewTitle('');
      }
    } catch (err) {
      showFeedback?.(`Error creating note: ${err.message}`, 'error');
      setMode('list');
      setNewTitle('');
    }
  }, [keyboard, projectFilter, showFeedback, refreshNotes]);

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
      // Do not intercept keys while in text input mode or delete confirmation
      if (mode === 'creating') return false;
      if (showDeleteConfirm) return false;

      if (input === 'e') {
        handleEdit();
        return true;
      }
      if (input === 'p' && selectedNote) {
        setMode('preview');
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

  if (showDeleteConfirm && selectedNote) {
    detailContent = React.createElement(ConfirmDialog, {
      message: `Delete "${selectedNote.title}"?`,
      onConfirm: handleDeleteConfirm,
      onCancel: handleDeleteCancel,
    });
  } else if (mode === 'creating') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Note'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Title: '),
        React.createElement(TextInput, {
          value: newTitle,
          onChange: setNewTitle,
          onSubmit: handleCreateSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to open editor, Escape to cancel'),
      ),
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
      showDetail: !!(selectedNote || mode === 'creating'),
      isActive: isActive && mode !== 'creating' && !showDeleteConfirm,
      emptyMessage: notesLoading ? 'Loading notes...' : 'No notes found',
      listWidth: 30,
    }),
  );
}
