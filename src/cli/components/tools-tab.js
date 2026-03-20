/**
 * ToolsTab Component
 * Tools launcher tab with grouped category display,
 * launch capability, category filtering, and CRUD operations.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { useData } from '../hooks/use-data.js';

const CONTEXT_ID = 'tools-tab';

const SHORTCUTS = [
  { key: 'Enter', description: 'Launch' },
  { key: 'f', description: 'Filter' },
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

const CREATE_STEPS = ['name', 'launchType', 'path', 'category', 'description'];

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Whether this tab accepts input
 * @param {Object} props.keyboard - Keyboard hook instance
 * @param {Function} props.onShortcutsChange - Update status bar shortcuts
 * @param {Function} props.onItemCountChange - Update status bar item count
 * @param {Function} props.showFeedback - Show feedback in status bar
 */
export function ToolsTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const { stdout } = useStdout();
  const termHeight = stdout?.rows || 24;
  const visibleHeight = Math.max(termHeight - 6, 5);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState(null); // null = All
  const [mode, setMode] = useState('list'); // list, creating, editing
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Create flow state
  const [createStep, setCreateStep] = useState(0);
  const [createData, setCreateData] = useState({ name: '', launchType: '', path: '', category: '', description: '' });
  const [createInput, setCreateInput] = useState('');

  // Edit flow state
  const [editStep, setEditStep] = useState(null);
  const [editInput, setEditInput] = useState('');

  const { data: tools, loading, refresh: refreshTools } = useData(
    useCallback(() => kb.listTools(), []),
    { autoLoad: true }
  );

  const toolsList = tools || [];

  // Get unique categories from tools
  const categories = [...new Set(toolsList.map(t => t.category || 'Uncategorized').filter(Boolean))].sort();

  // Filter tools by category
  const filteredTools = categoryFilter
    ? toolsList.filter(t => (t.category || 'Uncategorized') === categoryFilter)
    : toolsList;

  // Group tools by category for display
  const groupedTools = [];
  const groupedCategories = [...new Set(filteredTools.map(t => t.category || 'Uncategorized'))].sort();

  // Build flat list of renderable rows: category headers + tool items
  const flatRows = [];
  for (const category of groupedCategories) {
    const categoryTools = filteredTools.filter(t => (t.category || 'Uncategorized') === category);
    flatRows.push({ type: 'header', category });
    for (const tool of categoryTools) {
      flatRows.push({ type: 'tool', tool });
    }
  }

  // Build flat list of selectable tool indices (skip headers)
  const selectableIndices = flatRows
    .map((row, i) => row.type === 'tool' ? i : -1)
    .filter(i => i !== -1);

  // Get current selectable position
  const currentFlatIndex = selectableIndices[selectedIndex] ?? -1;

  // Get currently selected tool
  const selectedTool = currentFlatIndex >= 0 && flatRows[currentFlatIndex]?.type === 'tool'
    ? flatRows[currentFlatIndex].tool
    : null;

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count when tools change
  useEffect(() => {
    onItemCountChange?.(filteredTools.length);
  }, [filteredTools.length, onItemCountChange]);

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
    if (!isActive || mode !== 'list' || showDeleteConfirm) return;
    if (selectableIndices.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(selectableIndices.length - 1, prev + 1));
    } else if (key.pageUp) {
      setSelectedIndex(prev => Math.max(0, prev - visibleHeight));
    } else if (key.pageDown) {
      setSelectedIndex(prev => Math.min(selectableIndices.length - 1, prev + visibleHeight));
    } else if (key.return) {
      handleLaunch();
    } else if (key.escape) {
      handleBack();
    }
  }, { isActive: isActive && mode === 'list' && !showDeleteConfirm });

  // Launch tool
  const handleLaunch = useCallback(async () => {
    if (!selectedTool) {
      showFeedback?.('No tool selected', 'error');
      return;
    }
    showFeedback?.('Launching...', 'info');
    const result = await kb.launchTool(selectedTool.id);
    if (result.success) {
      showFeedback?.(`Launched: ${selectedTool.name}`, 'success');
    } else {
      showFeedback?.(`Failed to launch: ${result.error}`, 'error');
    }
  }, [selectedTool, showFeedback]);

  // Back handler
  const handleBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === 'creating') {
      setMode('list');
      setCreateStep(0);
      setCreateData({ name: '', launchType: '', path: '', category: '', description: '' });
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

  // Cycle category filter
  const handleCycleFilter = useCallback(() => {
    if (categories.length === 0) {
      showFeedback?.('No categories available', 'info');
      return;
    }
    if (categoryFilter === null) {
      setCategoryFilter(categories[0]);
      showFeedback?.(`Filter: ${categories[0]}`, 'info');
    } else {
      const currentIdx = categories.indexOf(categoryFilter);
      if (currentIdx === -1 || currentIdx >= categories.length - 1) {
        setCategoryFilter(null);
        showFeedback?.('Filter: All', 'info');
      } else {
        setCategoryFilter(categories[currentIdx + 1]);
        showFeedback?.(`Filter: ${categories[currentIdx + 1]}`, 'info');
      }
    }
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [categories, categoryFilter, showFeedback]);

  // Create flow
  const handleCreateStart = useCallback(() => {
    setMode('creating');
    setCreateStep(0);
    setCreateData({ name: '', launchType: '', path: '', category: '', description: '' });
    setCreateInput('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleCreateStepSubmit = useCallback(async (value) => {
    const step = CREATE_STEPS[createStep];

    if (step === 'name') {
      if (!value.trim()) {
        setMode('list');
        setCreateStep(0);
        setCreateData({ name: '', launchType: '', path: '', category: '', description: '' });
        setCreateInput('');
        keyboard?.setInputMode?.(null);
        return;
      }
      setCreateData(prev => ({ ...prev, name: value.trim() }));
      setCreateStep(1);
      setCreateInput('');
    } else if (step === 'launchType') {
      const type = value.trim().toLowerCase();
      if (type !== 'app' && type !== 'url') {
        showFeedback?.('Please enter "app" or "url"', 'error');
        setCreateInput('');
        return;
      }
      setCreateData(prev => ({ ...prev, launchType: type }));
      setCreateStep(2);
      setCreateInput('');
    } else if (step === 'path') {
      if (!value.trim()) {
        showFeedback?.('Path is required', 'error');
        setCreateInput('');
        return;
      }
      setCreateData(prev => ({ ...prev, path: value.trim() }));
      setCreateStep(3);
      setCreateInput('');
    } else if (step === 'category') {
      setCreateData(prev => ({ ...prev, category: value.trim() }));
      setCreateStep(4);
      setCreateInput('');
    } else if (step === 'description') {
      keyboard?.setInputMode?.(null);

      const result = await kb.createTool({
        name: createData.name,
        launchType: createData.launchType,
        launchPath: createData.path,
        category: createData.category || 'Uncategorized',
        description: value.trim(),
      });

      if (result.success) {
        showFeedback?.(`Created tool: ${createData.name}`, 'success');
        refreshTools();
      } else {
        showFeedback?.(`Failed to create: ${result.error}`, 'error');
      }

      setMode('list');
      setCreateStep(0);
      setCreateData({ name: '', launchType: '', path: '', category: '', description: '' });
      setCreateInput('');
    }
  }, [createStep, createData, keyboard, showFeedback, refreshTools]);

  // Edit flow
  const handleEditStart = useCallback(() => {
    if (!selectedTool) {
      showFeedback?.('Select a tool first', 'error');
      return;
    }
    setMode('editing');
    setEditStep('name');
    setEditInput(selectedTool.name || '');
    keyboard?.setInputMode?.('text');
  }, [selectedTool, keyboard, showFeedback]);

  const handleEditStepSubmit = useCallback(async (value) => {
    if (!selectedTool) return;

    if (editStep === 'name') {
      selectedTool._editName = value.trim() || selectedTool.name;
      setEditStep('launchType');
      setEditInput(selectedTool.launchType || '');
    } else if (editStep === 'launchType') {
      const type = value.trim().toLowerCase();
      if (type && type !== 'app' && type !== 'url') {
        showFeedback?.('Please enter "app" or "url"', 'error');
        setEditInput('');
        return;
      }
      selectedTool._editLaunchType = type || selectedTool.launchType;
      setEditStep('path');
      setEditInput(selectedTool.launchPath || '');
    } else if (editStep === 'path') {
      selectedTool._editPath = value.trim() || selectedTool.launchPath;
      setEditStep('category');
      setEditInput(selectedTool.category || '');
    } else if (editStep === 'category') {
      selectedTool._editCategory = value.trim() || selectedTool.category;
      setEditStep('description');
      setEditInput(selectedTool.description || '');
    } else if (editStep === 'description') {
      keyboard?.setInputMode?.(null);

      const result = await kb.updateTool({
        id: selectedTool.id,
        updates: {
          name: selectedTool._editName || selectedTool.name,
          launchType: selectedTool._editLaunchType || selectedTool.launchType,
          launchPath: selectedTool._editPath || selectedTool.launchPath,
          category: selectedTool._editCategory || selectedTool.category,
          description: value.trim(),
        },
      });

      delete selectedTool._editName;
      delete selectedTool._editLaunchType;
      delete selectedTool._editPath;
      delete selectedTool._editCategory;

      if (result.success) {
        showFeedback?.('Tool updated', 'success');
        refreshTools();
      } else {
        showFeedback?.(`Failed to update: ${result.error}`, 'error');
      }

      setMode('list');
      setEditStep(null);
      setEditInput('');
    }
  }, [editStep, selectedTool, keyboard, showFeedback, refreshTools]);

  // Delete tool
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTool) return;
    const result = await kb.deleteTool(selectedTool.id);
    setShowDeleteConfirm(false);
    if (result.success) {
      showFeedback?.(`Deleted: ${selectedTool.name}`, 'success');
      setSelectedIndex(prev => Math.max(0, prev - 1));
      refreshTools();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedTool, showFeedback, refreshTools]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input, key) => {
      if (mode === 'creating' || mode === 'editing') return false;
      if (showDeleteConfirm) return false;

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
        if (selectedTool) {
          setShowDeleteConfirm(true);
        } else {
          showFeedback?.('Select a tool to delete', 'error');
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
    keyboard, isActive, mode, selectedTool, showDeleteConfirm,
    handleCycleFilter, handleCreateStart, handleEditStart, showFeedback,
  ]);

  // Render delete confirmation overlay
  if (showDeleteConfirm && selectedTool) {
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
      React.createElement(ConfirmDialog, {
        message: `Delete tool "${selectedTool.name}"?`,
        onConfirm: handleDeleteConfirm,
        onCancel: handleDeleteCancel,
      }),
    );
  }

  // Render create form
  if (mode === 'creating') {
    const stepLabel = CREATE_STEPS[createStep];
    const prompts = {
      name: 'Name',
      launchType: 'Type (app/url)',
      path: 'Path or URL',
      category: 'Category',
      description: 'Description',
    };
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Tool'),
      createData.name && React.createElement(Text, { dimColor: true }, `Name: ${createData.name}`),
      createData.launchType && React.createElement(Text, { dimColor: true }, `Type: ${createData.launchType}`),
      createData.path && React.createElement(Text, { dimColor: true }, `Path: ${createData.path}`),
      createData.category && React.createElement(Text, { dimColor: true }, `Category: ${createData.category}`),
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
      name: 'Name',
      launchType: 'Type (app/url)',
      path: 'Path or URL',
      category: 'Category',
      description: 'Description',
    };
    return React.createElement(Box, { flexDirection: 'column', flexGrow: 1, paddingX: 2, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Tool'),
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

  // Render main tools list
  const visibleRows = flatRows.slice(scrollOffset, scrollOffset + visibleHeight);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + visibleHeight < flatRows.length;

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    // Filter indicator
    categoryFilter && React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { color: 'yellow' }, `Filter: ${categoryFilter}`),
    ),
    // Title
    React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { bold: true }, 'Software Tools'),
      React.createElement(Text, { dimColor: true }, '  '),
      React.createElement(Text, { dimColor: true }, '\u2500'.repeat(Math.max(0, (stdout?.columns || 80) - 20))),
    ),
    // Scrollable list
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
      loading
        ? React.createElement(Text, { dimColor: true }, 'Loading tools...')
        : flatRows.length === 0
          ? React.createElement(Text, { dimColor: true }, 'No tools found. Press n to add one.')
          : React.createElement(React.Fragment, null,
              showScrollUp && React.createElement(Text, { dimColor: true }, '  \u25B2 more'),
              ...visibleRows.map((row, i) => {
                const actualIndex = scrollOffset + i;
                if (row.type === 'header') {
                  return React.createElement(Box, { key: `header-${row.category}`, marginTop: i > 0 ? 1 : 0 },
                    React.createElement(Text, { bold: true, color: 'cyan' }, row.category),
                  );
                }

                // Tool row
                const tool = row.tool;
                const selectableIdx = selectableIndices.indexOf(actualIndex);
                const isSelected = selectableIdx === selectedIndex;
                const badge = tool.launchType === 'url' ? '[url]' : '[app]';
                const badgeColor = tool.launchType === 'url' ? 'blue' : 'green';

                return React.createElement(Box, { key: tool.id },
                  React.createElement(Text, {
                    inverse: isSelected,
                    bold: isSelected,
                  },
                    isSelected ? '  \u25B8 ' : '    ',
                    tool.name,
                  ),
                  React.createElement(Text, { color: badgeColor }, ` ${badge}`),
                  tool.description && React.createElement(Text, { dimColor: true }, `  ${tool.description}`),
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
