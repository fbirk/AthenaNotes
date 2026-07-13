/**
 * SnippetsTab Component
 * Full-featured snippets management tab with list/detail view,
 * search, tag filtering, clipboard copy, and CRUD operations.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ListDetail } from './list-detail.js';
import { ConfirmDialog } from './confirm-dialog.js';
import * as kb from '../services/kb-service.js';
import { editInExternalEditor } from '../services/editor-service.js';
import { useData } from '../hooks/use-data.js';
import { highlightCode } from '../lib/syntax-highlight.js';
import { copyToClipboard } from '../lib/clipboard.js';

const CONTEXT_ID = 'snippets-tab';

const FILTER_MODES = ['off', 'language', 'usage', 'module'];

const SHORTCUTS = [
  { key: '/', description: 'Search' },
  { key: 'c', description: 'Copy' },
  { key: 'f', description: 'Filter' },
  { key: 'n', description: 'New' },
  { key: 'e', description: 'Edit' },
  { key: 'd', description: 'Delete' },
];

const CREATE_STEPS = ['title', 'language', 'tags', 'editor'];

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Whether this tab accepts input
 * @param {Object} props.keyboard - Keyboard hook instance
 * @param {Function} props.onShortcutsChange - Update status bar shortcuts
 * @param {Function} props.onItemCountChange - Update status bar item count
 * @param {Function} props.showFeedback - Show feedback in status bar
 */
export function SnippetsTab({ isActive, keyboard, onShortcutsChange, onItemCountChange, showFeedback }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [mode, setMode] = useState('list'); // list, search, filter-input, creating, editing
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('off'); // off, language, usage, module
  const [filterValue, setFilterValue] = useState('');
  const [activeFilter, setActiveFilter] = useState(null); // { category: string, value: string }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Create flow state
  const [createStep, setCreateStep] = useState(0);
  const [createData, setCreateData] = useState({ title: '', language: '', tags: '' });
  const [createInput, setCreateInput] = useState('');

  // Edit flow state
  const [editStep, setEditStep] = useState(null); // null, 'title', 'language', 'tags', 'editor'
  const [editInput, setEditInput] = useState('');

  // Build fetch function based on search and filter state
  const fetchSnippets = useCallback(() => {
    if (activeSearchQuery || activeFilter) {
      const tagFilters = {};
      if (activeFilter) {
        tagFilters[activeFilter.category] = [activeFilter.value];
      }
      return kb.searchSnippets(activeSearchQuery, tagFilters);
    }
    return kb.listSnippets();
  }, [activeSearchQuery, activeFilter]);

  const { data: snippets, loading, refresh: refreshSnippets } = useData(
    fetchSnippets,
    { autoLoad: true, deps: [activeSearchQuery, activeFilter] }
  );

  const snippetsList = snippets || [];

  // Auto-load first snippet when list first arrives
  useEffect(() => {
    if (snippetsList.length > 0 && !selectedSnippet && mode === 'list') {
      kb.getSnippet(snippetsList[0].id).then(result => {
        if (result.success) {
          setSelectedSnippet(result.data);
        }
      });
    }
  }, [snippetsList.length]); // intentionally only triggers on list length change

  // Report shortcuts on mount
  useEffect(() => {
    onShortcutsChange?.(SHORTCUTS);
  }, [onShortcutsChange]);

  // Report item count when snippets change
  useEffect(() => {
    onItemCountChange?.(snippetsList.length);
  }, [snippetsList.length, onItemCountChange]);

  // Reset selection when list changes
  useEffect(() => {
    if (selectedIndex >= snippetsList.length && snippetsList.length > 0) {
      setSelectedIndex(snippetsList.length - 1);
    }
  }, [snippetsList.length, selectedIndex]);

  // Load full snippet when selecting from list
  const loadSnippet = useCallback(async (index) => {
    const snippet = snippetsList[index];
    if (!snippet) return;
    const result = await kb.getSnippet(snippet.id);
    if (result.success) {
      setSelectedSnippet(result.data);
    } else {
      showFeedback?.(`Failed to load snippet: ${result.error}`, 'error');
    }
  }, [snippetsList, showFeedback]);

  const handleSelect = useCallback((index) => {
    loadSnippet(index);
  }, [loadSnippet]);

  const handleHighlight = useCallback((index) => {
    setSelectedIndex(index);
    // Auto-load snippet preview on highlight (arrow key navigation)
    const snippet = snippetsList[index];
    if (snippet) {
      kb.getSnippet(snippet.id).then(result => {
        if (result.success) {
          setSelectedSnippet(result.data);
        }
      });
    }
  }, [snippetsList]);

  // Handle back/escape
  const handleBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === 'search') {
      setMode('list');
      setSearchQuery('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'filter-input') {
      setMode('list');
      setFilterValue('');
      keyboard?.setInputMode?.(null);
      return;
    }
    if (mode === 'creating') {
      setMode('list');
      setCreateStep(0);
      setCreateData({ title: '', language: '', tags: '' });
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
    if (selectedSnippet) {
      setSelectedSnippet(null);
      return;
    }
  }, [mode, selectedSnippet, showDeleteConfirm, keyboard]);

  // Escape cancels the active search/filter/create/edit form. This runs
  // independently of the global keyboard hook, so the tab isn't left stuck in a
  // form. The delete confirmation handles its own escape via ConfirmDialog.
  useInput((input, key) => {
    if (key.escape) handleBack();
  }, {
    isActive: isActive && !showDeleteConfirm
      && (mode === 'search' || mode === 'filter-input' || mode === 'creating' || mode === 'editing'),
  });

  // Search mode handlers
  const handleSearchStart = useCallback(() => {
    setMode('search');
    setSearchQuery('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleSearchSubmit = useCallback((query) => {
    keyboard?.setInputMode?.(null);
    setActiveSearchQuery(query.trim());
    setMode('list');
    setSelectedIndex(0);
    setSelectedSnippet(null);
    if (query.trim()) {
      showFeedback?.(`Search: "${query.trim()}"`, 'info');
    } else {
      showFeedback?.('Search cleared', 'info');
    }
  }, [keyboard, showFeedback]);

  // Filter mode handlers
  const handleCycleFilter = useCallback(() => {
    const currentIdx = FILTER_MODES.indexOf(filterMode);
    const nextIdx = (currentIdx + 1) % FILTER_MODES.length;
    const nextMode = FILTER_MODES[nextIdx];
    setFilterMode(nextMode);

    if (nextMode === 'off') {
      setActiveFilter(null);
      setFilterValue('');
      showFeedback?.('Filter: Off', 'info');
      setSelectedIndex(0);
      setSelectedSnippet(null);
    } else {
      // Prompt for filter value
      setMode('filter-input');
      setFilterValue('');
      keyboard?.setInputMode?.('text');
      showFeedback?.(`Filter by ${nextMode}: enter value`, 'info');
    }
  }, [filterMode, keyboard, showFeedback]);

  const handleFilterSubmit = useCallback((value) => {
    keyboard?.setInputMode?.(null);
    setMode('list');
    if (value.trim()) {
      setActiveFilter({ category: filterMode, value: value.trim() });
      showFeedback?.(`Filter: ${filterMode}="${value.trim()}"`, 'info');
    } else {
      setActiveFilter(null);
      showFeedback?.('Filter cleared', 'info');
    }
    setFilterValue('');
    setSelectedIndex(0);
    setSelectedSnippet(null);
  }, [filterMode, keyboard, showFeedback]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!selectedSnippet) {
      showFeedback?.('Select a snippet first', 'error');
      return;
    }
    const success = await copyToClipboard(selectedSnippet.code || '');
    if (success) {
      showFeedback?.('Copied!', 'success');
    } else {
      showFeedback?.('Failed to copy to clipboard', 'error');
    }
  }, [selectedSnippet, showFeedback]);

  // Create new snippet flow
  const handleCreateStart = useCallback(() => {
    setMode('creating');
    setCreateStep(0);
    setCreateData({ title: '', language: '', tags: '' });
    setCreateInput('');
    keyboard?.setInputMode?.('text');
  }, [keyboard]);

  const handleCreateStepSubmit = useCallback(async (value) => {
    const step = CREATE_STEPS[createStep];

    if (step === 'title') {
      if (!value.trim()) {
        setMode('list');
        setCreateStep(0);
        setCreateData({ title: '', language: '', tags: '' });
        setCreateInput('');
        keyboard?.setInputMode?.(null);
        return;
      }
      setCreateData(prev => ({ ...prev, title: value.trim() }));
      setCreateStep(1);
      setCreateInput('');
    } else if (step === 'language') {
      setCreateData(prev => ({ ...prev, language: value.trim() }));
      setCreateStep(2);
      setCreateInput('');
    } else if (step === 'tags') {
      setCreateData(prev => ({ ...prev, tags: value.trim() }));
      setCreateStep(3);
      setCreateInput('');
      keyboard?.setInputMode?.(null);

      // Open editor for code body
      try {
        const ext = value.trim() ? `.${createData.language || 'txt'}` : '.txt';
        const result = await editInExternalEditor('', ext);
        const tags = {};
        if (value.trim()) {
          value.trim().split(',').forEach(t => {
            const trimmed = t.trim();
            if (trimmed) {
              if (!tags.general) tags.general = [];
              tags.general.push(trimmed);
            }
          });
        }

        const createResult = await kb.createSnippet({
          title: createData.title,
          language: createData.language || '',
          description: '',
          code: result.content,
          tags,
        });

        if (createResult.success) {
          showFeedback?.(`Created snippet: ${createData.title}`, 'success');
          refreshSnippets();
          const snippetResult = await kb.getSnippet(createResult.data.id);
          if (snippetResult.success) {
            setSelectedSnippet(snippetResult.data);
          }
        } else {
          showFeedback?.(`Failed to create: ${createResult.error}`, 'error');
        }
      } catch (err) {
        showFeedback?.(`Editor error: ${err.message}`, 'error');
      }

      setMode('list');
      setCreateStep(0);
      setCreateData({ title: '', language: '', tags: '' });
      setCreateInput('');
    }
  }, [createStep, createData, keyboard, showFeedback, refreshSnippets]);

  // Edit snippet
  const handleEditStart = useCallback(() => {
    if (!selectedSnippet) {
      showFeedback?.('Select a snippet first', 'error');
      return;
    }
    setMode('editing');
    setEditStep('title');
    setEditInput(selectedSnippet.title || '');
    keyboard?.setInputMode?.('text');
  }, [selectedSnippet, keyboard, showFeedback]);

  const handleEditStepSubmit = useCallback(async (value) => {
    if (editStep === 'title') {
      const newTitle = value.trim() || selectedSnippet.title;
      setEditStep('language');
      setEditInput(selectedSnippet.language || '');
      selectedSnippet._editTitle = newTitle;
    } else if (editStep === 'language') {
      const newLanguage = value.trim();
      setEditStep('tags');
      const existingTags = selectedSnippet.tags || {};
      const tagStrs = [];
      for (const [, vals] of Object.entries(existingTags)) {
        if (Array.isArray(vals)) tagStrs.push(...vals);
      }
      setEditInput(tagStrs.join(', '));
      selectedSnippet._editLanguage = newLanguage;
    } else if (editStep === 'tags') {
      keyboard?.setInputMode?.(null);
      setEditStep(null);

      try {
        const ext = selectedSnippet._editLanguage
          ? `.${selectedSnippet._editLanguage}`
          : `.${selectedSnippet.language || 'txt'}`;
        const result = await editInExternalEditor(selectedSnippet.code || '', ext);

        const tags = {};
        if (value.trim()) {
          tags.general = value.trim().split(',').map(t => t.trim()).filter(Boolean);
        }

        const updateResult = await kb.updateSnippet({
          id: selectedSnippet.id,
          updates: {
            title: selectedSnippet._editTitle || selectedSnippet.title,
            language: selectedSnippet._editLanguage ?? selectedSnippet.language,
            code: result.content,
            tags,
          },
        });

        delete selectedSnippet._editTitle;
        delete selectedSnippet._editLanguage;

        if (updateResult.success) {
          setSelectedSnippet(updateResult.data);
          showFeedback?.('Snippet updated', 'success');
          refreshSnippets();
        } else {
          showFeedback?.(`Failed to update: ${updateResult.error}`, 'error');
        }
      } catch (err) {
        showFeedback?.(`Editor error: ${err.message}`, 'error');
      }

      setMode('list');
      setEditInput('');
    }
  }, [editStep, selectedSnippet, keyboard, showFeedback, refreshSnippets]);

  // Delete snippet
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedSnippet) return;
    const result = await kb.deleteSnippet(selectedSnippet.id);
    setShowDeleteConfirm(false);
    if (result.success) {
      showFeedback?.(`Deleted: ${selectedSnippet.title}`, 'success');
      setSelectedSnippet(null);
      refreshSnippets();
    } else {
      showFeedback?.(`Failed to delete: ${result.error}`, 'error');
    }
  }, [selectedSnippet, showFeedback, refreshSnippets]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Register keyboard context
  useEffect(() => {
    if (!keyboard || !isActive) return;

    const handler = (input, key) => {
      if (mode === 'search' || mode === 'filter-input' || mode === 'creating' || mode === 'editing') return false;
      if (showDeleteConfirm) return false;

      if (input === '/') {
        handleSearchStart();
        return true;
      }
      if (input === 'c') {
        handleCopy();
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
        if (selectedSnippet) {
          setShowDeleteConfirm(true);
        } else {
          showFeedback?.('Select a snippet to delete', 'error');
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
    keyboard, isActive, mode, selectedSnippet, showDeleteConfirm,
    handleSearchStart, handleCopy, handleCycleFilter,
    handleCreateStart, handleEditStart, showFeedback,
  ]);

  // Build list items
  const items = snippetsList.map(s => ({
    id: s.id,
    label: s.title,
    meta: s.language,
    metaColor: 'cyan',
  }));

  // Build detail panel content
  let detailContent = null;

  if (showDeleteConfirm && selectedSnippet) {
    detailContent = React.createElement(ConfirmDialog, {
      message: `Delete snippet "${selectedSnippet.title}"?`,
      onConfirm: handleDeleteConfirm,
      onCancel: handleDeleteCancel,
    });
  } else if (mode === 'search') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'Search Snippets'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Query: '),
        React.createElement(TextInput, {
          value: searchQuery,
          onChange: setSearchQuery,
          onSubmit: handleSearchSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to search, Escape to cancel'),
      ),
    );
  } else if (mode === 'filter-input') {
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, `Filter by ${filterMode}`),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, 'Value: '),
        React.createElement(TextInput, {
          value: filterValue,
          onChange: setFilterValue,
          onSubmit: handleFilterSubmit,
        }),
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to apply, Escape to cancel'),
      ),
    );
  } else if (mode === 'creating') {
    const stepLabel = CREATE_STEPS[createStep];
    const prompts = {
      title: 'Title',
      language: 'Language (e.g., javascript, python)',
      tags: 'Tags (comma-separated)',
    };
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'New Snippet'),
      createData.title && React.createElement(Text, { dimColor: true }, `Title: ${createData.title}`),
      createData.language && React.createElement(Text, { dimColor: true }, `Language: ${createData.language}`),
      stepLabel !== 'editor' && React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, null, `${prompts[stepLabel]}: `),
        React.createElement(TextInput, {
          value: createInput,
          onChange: setCreateInput,
          onSubmit: handleCreateStepSubmit,
        }),
      ),
      stepLabel === 'editor' && React.createElement(Text, { dimColor: true }, 'Opening editor...'),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Enter to continue, Escape to cancel'),
      ),
    );
  } else if (mode === 'editing' && editStep) {
    const prompts = {
      title: 'Title',
      language: 'Language',
      tags: 'Tags (comma-separated)',
    };
    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Edit Snippet'),
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
  } else if (selectedSnippet) {
    // Detail view: title, description, tags, syntax-highlighted code
    const tagBadges = [];
    if (selectedSnippet.tags && typeof selectedSnippet.tags === 'object') {
      for (const [category, values] of Object.entries(selectedSnippet.tags)) {
        if (Array.isArray(values)) {
          values.forEach(v => {
            tagBadges.push({ category, value: v });
          });
        }
      }
    }

    detailContent = React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
      // Title
      React.createElement(Text, { bold: true }, selectedSnippet.title),
      // Language
      selectedSnippet.language && React.createElement(Text, { color: 'cyan' },
        `Language: ${selectedSnippet.language}`
      ),
      // Description
      selectedSnippet.description && React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, selectedSnippet.description),
      ),
      // Tags as badges
      tagBadges.length > 0 && React.createElement(Box, { marginTop: 1, flexWrap: 'wrap', gap: 1 },
        ...tagBadges.map((tag, i) =>
          React.createElement(Text, { key: `${tag.category}-${tag.value}-${i}`, color: 'magenta' },
            `[${tag.category}:${tag.value}]`
          )
        ),
      ),
      // Syntax-highlighted code
      React.createElement(Box, {
        marginTop: 1,
        borderStyle: 'single',
        borderColor: 'gray',
        paddingX: 1,
        flexDirection: 'column',
      },
        React.createElement(Text, null,
          highlightCode(selectedSnippet.code || '', selectedSnippet.language || '')
        ),
      ),
    );
  } else {
    detailContent = React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, "Select a snippet or press 'n' to create"),
    );
  }

  // Build indicator bar for active search/filter
  const indicators = [];
  if (activeSearchQuery) {
    indicators.push(React.createElement(Text, { key: 'search', color: 'cyan' }, `Search: "${activeSearchQuery}"`));
  }
  if (activeFilter) {
    indicators.push(React.createElement(Text, { key: 'filter', color: 'yellow' }, `Filter: ${activeFilter.category}="${activeFilter.value}"`));
  }

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    // Indicator bar
    indicators.length > 0 && React.createElement(Box, { paddingX: 1, gap: 2 }, ...indicators),
    // Main list-detail layout
    React.createElement(ListDetail, {
      items,
      selectedIndex,
      onSelect: handleSelect,
      onHighlight: handleHighlight,
      onBack: handleBack,
      detail: detailContent,
      showDetail: !!(selectedSnippet || snippetsList.length > 0 || mode === 'search' || mode === 'filter-input' || mode === 'creating' || mode === 'editing'),
      isActive: isActive && mode === 'list' && !showDeleteConfirm,
      emptyMessage: loading ? 'Loading snippets...' : 'No snippets found',
      listWidth: 30,
    }),
  );
}
