/**
 * ShortcutsTab Component
 * Keyboard shortcuts reference with grouped display,
 * search filtering, and CRUD operations.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { useData } from '../hooks/use-data.js';

const CONTEXT_ID = 'shortcuts-tab';

const SHORTCUTS = [
  { key: '/', description: 'Search' },
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

const CREATE_STEPS = ['program', 'shortcut', 'description'];

/**
 * @param {Object} props
 * @param {boolean} props.isActive
 * @param {Object} props.keyboard
 * @param {Function} props.onShortcutsChange
 * @param {Function} props.onItemCountChange
 * @param {Function} props.showFeedback
 */
export function ShortcutsTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const { stdout } = useStdout();
  const termHeight = stdout?.rows || 24;
  const visibleHeight = Math.max(termHeight - 6, 5);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('list'); // list, creating, editing, searching
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Create flow state
  const [createStep, setCreateStep] = useState(0);
  const [createData, setCreateData] = useState({ program: '', shortcut: '', description: '' });
  const [createInput, setCreateInput] = useState('');

  // Edit flow state
  const [editStep, setEditStep] = useState(null);
  const [editInput, setEditInput] = useState('');

  // Search input state
  const [searchInput, setSearchInput] = useState('');

  const { data: allShortcuts, loading, refresh: refreshShortcuts } = useData(
    useCallback(() => kb.listShortcuts(), []),
    { autoLoad: true }
  );

  const shortcutsList = allShortcuts || [];

  // Filter by search
  const query = searchQuery.toLowerCase();
  const filteredShortcuts = query
    ? shortcutsList.filter(s =>
        s.program.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query))
    : shortcutsList;

  // Group by program
  const programs = [...new Set(filteredShortcuts.map(s => s.program))].sort();

  // Build flat rows: program headers + shortcut items
  const flatRows = [];
  for (const program of programs) {
    const programShortcuts = filteredShortcuts.filter(s => s.program === program);
    flatRows.push({ type: 'header', program });
    for (const sc of programShortcuts) {
      flatRows.push({ type: 'shortcut', shortcut: sc });
    }
  }

  // Selectable indices (skip headers)
  const selectableIndices = flatRows
    .map((row, i) => row.type === 'shortcut' ? i : -1)
    .filter(i => i !== -1);

  const currentFlatIndex = selectableIndices[selectedIndex] ?? -1;

  const selectedShortcut = currentFlatIndex >= 0 && flatRows[currentFlatIndex]?.type === 'shortcut'
    ? flatRows[currentFlatIndex].shortcut
    : null;

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count
  useEffect(() => {
    onItemCountChange?.(filteredShortcuts.length);
  }, [filteredShortcuts.length, onItemCountChange]);

  // Reset selection when list changes
  useEffect(() => {
    if (selectedIndex >= selectableIndices.length && selectableIndices.length > 0) {
      setSelectedIndex(selectableIndices.length - 1);
    }
  }, [selectableIndices.length, selectedIndex]);

  // Keep selected item in view
  useEffect(() => {
    if (currentFlatIndex < scrollOffset) {
      setScrollOffset(Math.max(0, currentFlatIndex - 1));
    } else if (currentFlatIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(currentFlatIndex - visibleHeight + 1);
    }
  }, [currentFlatIndex, visibleHeight, scrollOffset]);

  // Keyboard navigation
  useInput((input, key) => {
    if (!isActive || (mode !== 'list' && mode !== 'searching') || showDeleteConfirm) return;
    if (mode === 'searching') return;
    if (selectableIndices.length === 0 && !key.upArrow && !key.downArrow) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(selectableIndices.length - 1, prev + 1));
    } else if (key.pageUp) {
      setSelectedIndex(prev => Math.max(0, prev - visibleHeight));
    } else if (key.pageDown) {
      setSelectedIndex(prev => Math.min(selectableIndices.length - 1, prev + visibleHeight));
    } else if (key.escape) {
      if (searchQuery) {
        setSearchQuery('');
        setSelectedIndex(0);
        setScrollOffset(0);
      }
    }
  }, { isActive: isActive && mode === 'list' && !showDeleteConfirm });

  // Back handler
  const handleBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === 'searching') {
      setMode('list');
      setSearchInput('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'creating') {
      setMode('list');
      setCreateStep(0);
      setCreateData({ program: '', shortcut: '', description: '' });
      setCreateInput('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'editing') {
      setMode('list');
      setEditStep(null);
      setEditInput('');
      keyboard?.setInputMode?.(null);
      return;
    }
  }, [mode, showDeleteConfirm, keyboard]);

  // Search flow
  const handleSearchStart = useCallback(() => {
    setMode('searching');
    setSearchInput(searchQuery);
    keyboard?.setInputMode?.('text');
  }, [keyboard, searchQuery]);

  const handleSearchSubmit = useCallback((value) => {
    setSearchQuery(value);
    setMode('list');
    setSelectedIndex(0);
    setScrollOffset(0);
    keyboard?.setInputMode?.(null);
  }, [keyboard]);

  // Create flow
  const handleCreateStart = useCallback(() => {
    setMode('creating');
    setCreateStep(0);
    setCreateData({ program: '', shortcut: '', description: '' });
    setCreateInput('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleCreateStepSubmit = useCallback(async (value) => {
    const step = CREATE_STEPS[createStep];

    if (step === 'program') {
      if (!value.trim()) {
        setMode('list');
        setCreateStep(0);
        setCreateData({ program: '', shortcut: '', description: '' });
        setCreateInput('');
        keyboard?.setInputMode?.(null);
        return;
      }
      setCreateData(prev => ({ ...prev, program: value.trim() }));
      setCreateStep(1);
      setCreateInput('');
    } else if (step === 'shortcut') {
      if (!value.trim()) {
        showFeedback?.('Shortcut is required', 'error');
        setCreateInput('');
        return;
      }
      setCreateData(prev => ({ ...prev, shortcut: value.trim() }));
      setCreateStep(2);
      setCreateInput('');
    } else if (step === 'description') {
      if (!value.trim()) {
        showFeedback?.('Description is required', 'error');
        setCreateInput('');
        return;
      }
      keyboard?.setInputMode?.(null);

      const result = await kb.createShortcut({
        program: createData.program,
        shortcut: createData.shortcut,
        description: value.trim(),
      });

      if (result.success) {
        showFeedback?.(`Added shortcut for ${createData.program}`, 'success');
        refreshShortcuts();
      } else {
        showFeedback?.(`Failed to create: ${result.error}`, 'error');
      }

      setMode('list');
      setCreateStep(0);
      setCreateData({ program: '', shortcut: '', description: '' });
      setCreateInput('');
    }
  }, [createStep, createData, keyboard, showFeedback, refreshShortcuts]);

  // Edit flow
  const handleEditStart = useCallback(() => {
    if (!selectedShortcut) {
      showFeedback?.('Select a shortcut first', 'error');
      return;
    }
    setMode('editing');
    setEditStep('program');
    setEditInput(selectedShortcut.program || '');
    keyboard?.setInputMode?.('text');
  }, [selectedShortcut, keyboard, showFeedback]);

  const handleEditStepSubmit = useCallback(async (value) => {
    if (!selectedShortcut) return;

    if (editStep === 'program') {
      selectedShortcut._editProgram = value.trim() || selectedShortcut.program;
      setEditStep('shortcut');
      setEditInput(selectedShortcut.shortcut || '');
    } else if (editStep === 'shortcut') {
      selectedShortcut._editShortcut = value.trim() || selectedShortcut.shortcut;
      setEditStep('description');
      setEditInput(selectedShortcut.description || '');
    } else if (editStep === 'description') {
      keyboard?.setInputMode?.(null);

      const result = await kb.updateShortcut({
        id: selectedShortcut.id,
        updates: {
          program: selectedShortcut._editProgram || selectedShortcut.program,
          shortcut: selectedShortcut._editShortcut || selectedShortcut.shortcut,
          description: value.trim() || selectedShortcut.description,
        },
      });

      delete selectedShortcut._editProgram;
      delete selectedShortcut._editShortcut;

      if (result.success) {
        showFeedback?.('Shortcut updated', 'success');
        refreshShortcuts();
      } else {
        showFeedback?.(`Failed to update: ${result.error}`, 'error');
      }

      setMode('list');
      setEditStep(null);
      setEditInput('');
    }
  }, [editStep, selectedShortcut, keyboard, showFeedback, refreshShortcuts]);

  // Delete
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedShortcut) return;
    const result = await kb.deleteShortcut(selectedShortcut.id);
    setShowDeleteConfirm(false);
    if (result.success) {
      showFeedback?.(`Deleted shortcut`, 'success');
      setSelectedIndex(prev => Math.max(0, prev - 1));
      refreshShortcuts();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedShortcut, showFeedback, refreshShortcuts]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input) => {
      if (mode === 'creating' || mode === 'editing' || mode === 'searching') return false;
      if (showDeleteConfirm) return false;

      if (input === '/') {
        handleSearchStart();
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
        if (selectedShortcut) {
          setShowDeleteConfirm(true);
        } else {
          showFeedback?.('Select a shortcut to delete', 'error');
        }
        return true;
      }
      return false;
    };

    keyboard.registerContext(CONTEXT_ID, handler);
    return () => {
      keyboard.unregisterContext(CONTEXT_ID);
    };
  }, [
    keyboard, isActive, mode, selectedShortcut, showDeleteConfirm,
    handleSearchStart, handleCreateStart, handleEditStart, showFeedback,
  ]);

  // Render delete confirmation
  if (showDeleteConfirm && selectedShortcut) {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(ConfirmDialog, {
        message: `Delete "${selectedShortcut.shortcut}" (${selectedShortcut.program})?`,
        onConfirm: handleDeleteConfirm,
        onCancel: handleDeleteCancel,
      }),
    );
  }

  // Render search mode
  if (mode === 'searching') {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Search Shortcuts'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Filter: '),
        React.createElement(TextInput, {
          value: searchInput,
          onChange: setSearchInput,
          onSubmit: handleSearchSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to apply, Escape to cancel'),
      ),
    );
  }

  // Render create form
  if (mode === 'creating') {
    const stepLabel = CREATE_STEPS[createStep];
    const prompts = {
      program: 'Program',
      shortcut: 'Shortcut',
      description: 'Description',
    };
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Shortcut'),
      createData.program && React.createElement(Text, { dimColor: true }, `Program: ${createData.program}`),
      createData.shortcut && React.createElement(Text, { dimColor: true }, `Shortcut: ${createData.shortcut}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, `${prompts[stepLabel]}: `),
        React.createElement(TextInput, {
          value: createInput,
          onChange: setCreateInput,
          onSubmit: handleCreateStepSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  }

  // Render edit form
  if (mode === 'editing' && editStep) {
    const prompts = {
      program: 'Program',
      shortcut: 'Shortcut',
      description: 'Description',
    };
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Shortcut'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, `${prompts[editStep]}: `),
        React.createElement(TextInput, {
          value: editInput,
          onChange: setEditInput,
          onSubmit: handleEditStepSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  }

  // Render main list
  const visibleRows = flatRows.slice(scrollOffset, scrollOffset + visibleHeight);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + visibleHeight < flatRows.length;

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    // Search indicator
    searchQuery && React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { color: 'yellow' }, `Search: "${searchQuery}"  (Escape to clear)`),
    ),
    // Title
    React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { bold: true }, 'Keyboard Shortcuts'),
      React.createElement(Text, { dimColor: true }, '  '),
      React.createElement(Text, { dimColor: true }, '\u2500'.repeat(Math.max(0, (stdout?.columns || 80) - 24))),
    ),
    // Scrollable list
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
      loading
        ? React.createElement(Text, { dimColor: true }, 'Loading shortcuts...')
        : flatRows.length === 0
          ? React.createElement(Text, { dimColor: true },
              searchQuery ? 'No shortcuts match your search.' : 'No shortcuts found. Press n to add one.')
          : React.createElement(React.Fragment, null,
              showScrollUp && React.createElement(Text, { dimColor: true }, '  \u25B2 more'),
              ...visibleRows.map((row, i) => {
                const actualIndex = scrollOffset + i;
                if (row.type === 'header') {
                  return React.createElement(Box, { key: `header-${row.program}`, marginTop: i > 0 ? 1 : 0 },
                    React.createElement(Text, { bold: true, color: 'cyan' }, row.program),
                  );
                }

                const sc = row.shortcut;
                const selectableIdx = selectableIndices.indexOf(actualIndex);
                const isSelected = selectableIdx === selectedIndex;

                return React.createElement(Box, { key: sc.id },
                  React.createElement(Text, {
                    inverse: isSelected,
                    bold: isSelected,
                  },
                    isSelected ? '  \u25B8 ' : '    ',
                  ),
                  React.createElement(Text, { color: 'yellow' }, sc.shortcut.padEnd(20)),
                  React.createElement(Text, { dimColor: !isSelected }, `  ${sc.description}`),
                );
              }),
              showScrollDown && React.createElement(Text, { dimColor: true }, '  \u25BE more'),
              selectableIndices.length > 0 && React.createElement(Text, { dimColor: true },
                `${selectedIndex + 1}/${selectableIndices.length}`
              ),
            ),
    ),
  );
}
