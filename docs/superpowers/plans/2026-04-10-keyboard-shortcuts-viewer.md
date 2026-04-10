# Keyboard Shortcuts Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Shortcuts" section to both GUI and CLI for saving/viewing keyboard shortcuts of external programs, serving as a quick-reference cheat sheet.

**Architecture:** New `shortcuts.json` data file with CRUD via IPC handlers (GUI) and kb-service (CLI). GUI uses a CSS multi-column flowing layout grouped by program name with instant search. CLI uses Ink React component with grouped list display and keyboard-driven CRUD.

**Tech Stack:** Vanilla JS (GUI renderer), React/Ink (CLI), Vitest (tests), existing fileService for JSON persistence.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/renderer/js/components/shortcuts.js` | GUI component: search, multi-column grouped list, modal form, edit/delete |
| `src/cli/components/shortcuts-tab.js` | CLI component: grouped list, keyboard nav, inline CRUD forms |
| `tests/unit/shortcuts-ipc.test.js` | Unit tests for IPC handlers and kb-service CRUD |

### Modified Files
| File | Change |
|------|--------|
| `src/main/main.js` | Add `shortcuts.*` IPC handlers after tools section |
| `src/cli/services/kb-service.js` | Add shortcuts CRUD functions |
| `src/renderer/js/router.js` | Add `#/shortcuts` route |
| `src/renderer/js/app.js` | Add `#/shortcuts` to navigation array |
| `src/renderer/styles/components.css` | Add shortcuts section styling |
| `src/cli/components/tab-bar.js` | Add 8th tab entry |
| `src/cli/app.js` | Import and wire ShortcutsTab component |

---

### Task 1: IPC Handlers for Shortcuts CRUD

**Files:**
- Modify: `src/main/main.js` (after the tools section, ~line 1045)
- Test: `tests/unit/shortcuts-ipc.test.js`

- [ ] **Step 1: Write tests for shortcuts IPC handlers**

Create `tests/unit/shortcuts-ipc.test.js`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    rename: vi.fn(),
    rm: vi.fn(),
    constants: { W_OK: 2 },
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import fs from 'node:fs/promises';
const { fileService } = await import('../../src/main/services/file-service.js');

describe('Shortcuts CRUD via fileService', () => {
  const testStoragePath = '/test/storage';

  beforeEach(async () => {
    vi.clearAllMocks();
    fileService.storageRoot = null;
    fileService.configPath = null;
    fs.access.mockResolvedValue(undefined);
    fs.mkdir.mockResolvedValue(undefined);
    await fileService.initialize(testStoragePath);
  });

  describe('list shortcuts', () => {
    it('should return empty array when no shortcuts file exists', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      const data = await fileService.readJSON('shortcuts.json');
      const shortcuts = data?.shortcuts || [];
      expect(shortcuts).toEqual([]);
    });

    it('should return shortcuts sorted by program then description', async () => {
      const stored = {
        shortcuts: [
          { id: '2', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: '1', program: 'VS Code', shortcut: 'Ctrl+P', description: 'Quick open', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: '3', program: 'Chrome', shortcut: 'Ctrl+L', description: 'Focus address bar', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));

      const data = await fileService.readJSON('shortcuts.json');
      const shortcuts = data?.shortcuts || [];
      shortcuts.sort((a, b) => {
        if (a.program !== b.program) return a.program.localeCompare(b.program);
        return a.description.localeCompare(b.description);
      });

      expect(shortcuts[0].program).toBe('Chrome');
      expect(shortcuts[0].description).toBe('Focus address bar');
      expect(shortcuts[1].program).toBe('Chrome');
      expect(shortcuts[1].description).toBe('New tab');
      expect(shortcuts[2].program).toBe('VS Code');
    });
  });

  describe('create shortcut', () => {
    it('should create a shortcut with generated id and timestamps', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue(undefined);

      const shortcutData = { program: 'VS Code', shortcut: 'Ctrl+Shift+P', description: 'Command palette' };
      const data = { shortcuts: [] };
      const now = new Date().toISOString();
      const newShortcut = {
        id: 'test-uuid-1234',
        ...shortcutData,
        createdAt: now,
        modifiedAt: now,
      };
      data.shortcuts.push(newShortcut);

      expect(newShortcut.id).toBe('test-uuid-1234');
      expect(newShortcut.program).toBe('VS Code');
      expect(newShortcut.shortcut).toBe('Ctrl+Shift+P');
      expect(newShortcut.description).toBe('Command palette');
    });
  });

  describe('update shortcut', () => {
    it('should update fields and modifiedAt timestamp', async () => {
      const stored = {
        shortcuts: [
          { id: 'abc', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));
      fs.writeFile.mockResolvedValue(undefined);

      const data = await fileService.readJSON('shortcuts.json');
      const index = data.shortcuts.findIndex(s => s.id === 'abc');
      expect(index).toBe(0);

      data.shortcuts[index] = {
        ...data.shortcuts[index],
        description: 'Open new tab',
        modifiedAt: new Date().toISOString(),
      };

      expect(data.shortcuts[0].description).toBe('Open new tab');
      expect(data.shortcuts[0].program).toBe('Chrome');
    });

    it('should fail when shortcut id not found', async () => {
      const stored = { shortcuts: [] };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));

      const data = await fileService.readJSON('shortcuts.json');
      const index = data.shortcuts.findIndex(s => s.id === 'nonexistent');
      expect(index).toBe(-1);
    });
  });

  describe('delete shortcut', () => {
    it('should remove shortcut by id', async () => {
      const stored = {
        shortcuts: [
          { id: 'abc', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: 'def', program: 'VS Code', shortcut: 'Ctrl+P', description: 'Quick open', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));
      fs.writeFile.mockResolvedValue(undefined);

      const data = await fileService.readJSON('shortcuts.json');
      const filtered = data.shortcuts.filter(s => s.id !== 'abc');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('def');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (no IPC handlers yet, but fileService tests pass)**

Run: `npm run test -- tests/unit/shortcuts-ipc.test.js`
Expected: All tests PASS (they test fileService directly, which already exists)

- [ ] **Step 3: Add IPC handlers to main.js**

In `src/main/main.js`, after the `tools.launch` handler (after line 1045), before the Daily Todos section, add:

```javascript
  // ==================== Shortcuts API ====================
  ipcMain.handle('shortcuts.list', async () => {
    try {
      const data = await fileService.readJSON('shortcuts.json');
      const shortcuts = data?.shortcuts || [];

      shortcuts.sort((a, b) => {
        if (a.program !== b.program) return a.program.localeCompare(b.program);
        return a.description.localeCompare(b.description);
      });

      return { success: true, data: shortcuts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shortcuts.create', async (_event, shortcutData) => {
    try {
      if (!shortcutData.program?.trim() || !shortcutData.shortcut?.trim() || !shortcutData.description?.trim()) {
        return { success: false, error: 'VALIDATION_ERROR: program, shortcut, and description are required' };
      }

      const data = await fileService.readJSON('shortcuts.json') || { shortcuts: [] };
      if (!data.shortcuts) data.shortcuts = [];
      const now = new Date().toISOString();

      const newShortcut = {
        id: fileService.generateId(),
        program: shortcutData.program.trim(),
        shortcut: shortcutData.shortcut.trim(),
        description: shortcutData.description.trim(),
        createdAt: now,
        modifiedAt: now,
      };

      data.shortcuts.push(newShortcut);
      await fileService.writeJSON('shortcuts.json', data);

      return { success: true, data: newShortcut };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shortcuts.update', async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON('shortcuts.json');
      if (!data || !data.shortcuts) {
        return { success: false, error: 'SHORTCUT_NOT_FOUND' };
      }

      const index = data.shortcuts.findIndex(s => s.id === id);
      if (index === -1) {
        return { success: false, error: 'SHORTCUT_NOT_FOUND' };
      }

      const allowed = {};
      if (updates.program !== undefined) allowed.program = updates.program.trim();
      if (updates.shortcut !== undefined) allowed.shortcut = updates.shortcut.trim();
      if (updates.description !== undefined) allowed.description = updates.description.trim();

      data.shortcuts[index] = {
        ...data.shortcuts[index],
        ...allowed,
        modifiedAt: new Date().toISOString(),
      };

      await fileService.writeJSON('shortcuts.json', data);

      return { success: true, data: data.shortcuts[index] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shortcuts.delete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('shortcuts.json');
      if (!data || !data.shortcuts) {
        return { success: false, error: 'SHORTCUT_NOT_FOUND' };
      }

      const index = data.shortcuts.findIndex(s => s.id === id);
      if (index === -1) {
        return { success: false, error: 'SHORTCUT_NOT_FOUND' };
      }

      data.shortcuts.splice(index, 1);
      await fileService.writeJSON('shortcuts.json', data);

      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/shortcuts-ipc.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/main.js tests/unit/shortcuts-ipc.test.js
git commit -m "feat(shortcuts): add IPC handlers for shortcuts CRUD"
```

---

### Task 2: CLI Service Layer

**Files:**
- Modify: `src/cli/services/kb-service.js` (after the Tools section, ~line 515)

- [ ] **Step 1: Add shortcuts CRUD functions to kb-service.js**

After the `launchTool` function (line 514), add:

```javascript
// ==================== Shortcuts ====================

async function _readShortcuts() {
  const data = await fileService.readJSON('shortcuts.json');
  return data?.shortcuts || [];
}

async function _writeShortcuts(shortcuts) {
  await fileService.writeJSON('shortcuts.json', { shortcuts });
}

export async function listShortcuts() {
  try {
    const shortcuts = await _readShortcuts();
    shortcuts.sort((a, b) => {
      if (a.program !== b.program) return a.program.localeCompare(b.program);
      return a.description.localeCompare(b.description);
    });
    return wrapResult(shortcuts);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createShortcut({ program, shortcut, description }) {
  try {
    const shortcuts = await _readShortcuts();
    const now = new Date().toISOString();
    const entry = {
      id: uuidv4(),
      program: program.trim(),
      shortcut: shortcut.trim(),
      description: description.trim(),
      createdAt: now,
      modifiedAt: now,
    };
    shortcuts.push(entry);
    await _writeShortcuts(shortcuts);
    return wrapResult(entry);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateShortcut({ id, updates }) {
  try {
    const shortcuts = await _readShortcuts();
    const index = shortcuts.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Shortcut not found' };
    shortcuts[index] = { ...shortcuts[index], ...updates, modifiedAt: new Date().toISOString() };
    await _writeShortcuts(shortcuts);
    return wrapResult(shortcuts[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteShortcut(shortcutId) {
  try {
    const shortcuts = await _readShortcuts();
    const filtered = shortcuts.filter(s => s.id !== shortcutId);
    if (filtered.length === shortcuts.length) return { success: false, error: 'Shortcut not found' };
    await _writeShortcuts(filtered);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}
```

- [ ] **Step 2: Run existing tests to verify nothing is broken**

Run: `npm run test`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/cli/services/kb-service.js
git commit -m "feat(shortcuts): add shortcuts CRUD to CLI kb-service"
```

---

### Task 3: GUI Component

**Files:**
- Create: `src/renderer/js/components/shortcuts.js`

- [ ] **Step 1: Create the shortcuts component**

Create `src/renderer/js/components/shortcuts.js`:

```javascript
import { invoke } from '../services/api.js';

let shortcuts = [];
let searchQuery = '';

export async function renderShortcutsComponent(container) {
  container.innerHTML = `<div class="shortcuts-section">
    <div class="shortcuts-header">
      <h2>Shortcuts</h2>
      <input type="text" id="shortcuts-search" class="shortcuts-search" placeholder="Search by program or description..." />
      <button id="add-shortcut-btn" class="btn-primary">+ Add Shortcut</button>
    </div>
    <div id="shortcuts-list" class="shortcuts-columns"></div>
    <div id="shortcut-form-modal" class="modal" style="display:none;"></div>
  </div>`;

  await loadShortcuts();
  renderShortcutsList();
  setupEventListeners();
}

async function loadShortcuts() {
  const res = await invoke('shortcuts.list');
  shortcuts = res.success ? res.data : [];
}

function getPrograms() {
  return [...new Set(shortcuts.map(s => s.program))].sort();
}

function renderShortcutsList() {
  const list = document.getElementById('shortcuts-list');
  if (!list) return;

  const query = searchQuery.toLowerCase();
  const filtered = query
    ? shortcuts.filter(s =>
        s.program.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query))
    : shortcuts;

  if (filtered.length === 0) {
    list.innerHTML = shortcuts.length === 0
      ? '<div class="empty">No shortcuts yet. Add a shortcut to get started.</div>'
      : '<div class="empty">No shortcuts match your search.</div>';
    return;
  }

  const grouped = {};
  filtered.forEach(s => {
    if (!grouped[s.program]) grouped[s.program] = [];
    grouped[s.program].push(s);
  });

  list.innerHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([program, programShortcuts]) => `
      <div class="shortcuts-group">
        <h3 class="shortcuts-group-title">${escapeHtml(program)}</h3>
        ${programShortcuts.map(s => `
          <div class="shortcut-row" data-id="${s.id}">
            <kbd class="shortcut-key">${escapeHtml(s.shortcut)}</kbd>
            <span class="shortcut-description">${escapeHtml(s.description)}</span>
            <span class="shortcut-actions">
              <button class="btn-icon-tiny shortcut-edit-btn" data-id="${s.id}" title="Edit">&#9998;</button>
              <button class="btn-icon-tiny shortcut-delete-btn" data-id="${s.id}" title="Delete">&times;</button>
            </span>
          </div>
        `).join('')}
      </div>
    `).join('');

  attachShortcutEventListeners();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setupEventListeners() {
  const addBtn = document.getElementById('add-shortcut-btn');
  if (addBtn) {
    addBtn.onclick = () => showShortcutForm();
  }

  const searchInput = document.getElementById('shortcuts-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      renderShortcutsList();
    };
  }
}

function attachShortcutEventListeners() {
  document.querySelectorAll('.shortcut-edit-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      editShortcut(btn.dataset.id);
    };
  });

  document.querySelectorAll('.shortcut-delete-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteShortcut(btn.dataset.id);
    };
  });
}

function showShortcutForm(shortcut = null) {
  const modal = document.getElementById('shortcut-form-modal');
  if (!modal) return;

  const isEdit = shortcut !== null;
  const programs = getPrograms();

  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${isEdit ? 'Edit' : 'Add'} Shortcut</h3>
      <form id="shortcut-form">
        ${isEdit ? `<input type="hidden" name="id" value="${shortcut.id}" />` : ''}
        <div class="form-group">
          <label>Program</label>
          <input type="text" name="program" value="${escapeHtml(shortcut?.program || '')}" required maxlength="100" list="program-options" />
          <datalist id="program-options">
            ${programs.map(p => `<option value="${escapeHtml(p)}">`).join('')}
          </datalist>
        </div>
        <div class="form-group">
          <label>Shortcut</label>
          <input type="text" name="shortcut" value="${escapeHtml(shortcut?.shortcut || '')}" required maxlength="100" placeholder="e.g. Ctrl+Shift+P" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" value="${escapeHtml(shortcut?.description || '')}" required maxlength="200" placeholder="What does this shortcut do?" />
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'}</button>
          <button type="button" class="btn-secondary" id="cancel-shortcut-form">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('cancel-shortcut-form').onclick = () => {
    modal.style.display = 'none';
  };

  document.getElementById('shortcut-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      program: fd.get('program'),
      shortcut: fd.get('shortcut'),
      description: fd.get('description'),
    };

    if (isEdit) {
      await invoke('shortcuts.update', { id: fd.get('id'), updates: data });
    } else {
      await invoke('shortcuts.create', data);
    }

    modal.style.display = 'none';
    await loadShortcuts();
    renderShortcutsList();
  };
}

function editShortcut(id) {
  const shortcut = shortcuts.find(s => s.id === id);
  if (shortcut) {
    showShortcutForm(shortcut);
  }
}

async function deleteShortcut(id) {
  if (!confirm('Delete this shortcut?')) return;
  await invoke('shortcuts.delete', id);
  await loadShortcuts();
  renderShortcutsList();
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls src/renderer/js/components/shortcuts.js`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/renderer/js/components/shortcuts.js
git commit -m "feat(shortcuts): add GUI shortcuts component"
```

---

### Task 4: GUI Routing and Navigation

**Files:**
- Modify: `src/renderer/js/router.js` (add import and route)
- Modify: `src/renderer/js/app.js` (add nav item)

- [ ] **Step 1: Add route to router.js**

At the top of `src/renderer/js/router.js`, add the import after the tools import (line 6):

```javascript
import { renderShortcutsComponent } from './components/shortcuts.js';
```

In the `routes` Map, after the `#/tools` entry (after line 46), add:

```javascript
  ['#/shortcuts', async (container) => {
    await renderShortcutsComponent(container);
    return null;
  }],
```

- [ ] **Step 2: Add navigation item to app.js**

In `src/renderer/js/app.js`, in the `mountNavigation` function (line 78), add `'#/shortcuts'` to the routes array:

Change:
```javascript
  ['#/notes', '#/daily-todos', '#/todos', '#/projects', '#/roadmaps', '#/snippets', '#/tools'].forEach((route) => {
```

To:
```javascript
  ['#/notes', '#/daily-todos', '#/todos', '#/projects', '#/roadmaps', '#/snippets', '#/tools', '#/shortcuts'].forEach((route) => {
```

- [ ] **Step 3: Run tests to verify nothing is broken**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/js/router.js src/renderer/js/app.js
git commit -m "feat(shortcuts): add GUI routing and navigation"
```

---

### Task 5: GUI Styling

**Files:**
- Modify: `src/renderer/styles/components.css` (append shortcuts styles at the end)

- [ ] **Step 1: Add shortcuts CSS to components.css**

Append to the end of `src/renderer/styles/components.css`:

```css
/* ==================== Shortcuts Section ==================== */

.shortcuts-section {
  padding: 1.5rem;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.shortcuts-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  flex: 0 0 auto;
}

.shortcuts-search {
  flex: 1;
  max-width: 400px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
}

.shortcuts-search:focus {
  outline: none;
  border-color: var(--color-accent);
}

.shortcuts-columns {
  column-count: 3;
  column-gap: 2rem;
}

.shortcuts-columns .empty {
  column-span: all;
  text-align: center;
  padding: 3rem;
  color: var(--color-muted);
}

@media (max-width: 1200px) {
  .shortcuts-columns {
    column-count: 2;
  }
}

@media (max-width: 768px) {
  .shortcuts-columns {
    column-count: 1;
  }
}

.shortcuts-group {
  break-inside: avoid;
  margin-bottom: 1.5rem;
}

.shortcuts-group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border);
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.25rem;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.shortcut-row:hover {
  background: var(--color-surface-alt, rgba(255,255,255,0.03));
}

.shortcut-key {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.shortcut-description {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.shortcut-row:hover .shortcut-actions {
  opacity: 1;
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/renderer/styles/components.css
git commit -m "feat(shortcuts): add GUI styles for shortcuts section"
```

---

### Task 6: CLI Tab Bar and App Wiring

**Files:**
- Modify: `src/cli/components/tab-bar.js` (add 8th tab)
- Modify: `src/cli/app.js` (import and register component)

- [ ] **Step 1: Add Shortcuts tab to tab-bar.js**

In `src/cli/components/tab-bar.js`, add the 8th tab entry to the `TABS` array (after line 16, before the closing `];`):

```javascript
  { label: 'Shortcuts', key: '8' },
```

- [ ] **Step 2: Wire ShortcutsTab in app.js**

In `src/cli/app.js`, add the import after the ToolsTab import (line 21):

```javascript
import { ShortcutsTab } from './components/shortcuts-tab.js';
```

Add `ShortcutsTab` to the `TAB_COMPONENTS` array (after line 30, before the closing `];`):

```javascript
  ShortcutsTab,
```

- [ ] **Step 3: Commit**

```bash
git add src/cli/components/tab-bar.js src/cli/app.js
git commit -m "feat(shortcuts): wire shortcuts tab in CLI app"
```

---

### Task 7: CLI Shortcuts Tab Component

**Files:**
- Create: `src/cli/components/shortcuts-tab.js`

- [ ] **Step 1: Create the CLI shortcuts tab component**

Create `src/cli/components/shortcuts-tab.js`:

```javascript
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
```

- [ ] **Step 2: Verify file was created**

Run: `ls src/cli/components/shortcuts-tab.js`
Expected: File exists

- [ ] **Step 3: Run existing tests to confirm nothing broke**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/cli/components/shortcuts-tab.js
git commit -m "feat(shortcuts): add CLI shortcuts tab component"
```

---

### Task 8: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update IPC channels list in CLAUDE.md**

In `CLAUDE.md`, in the IPC Communication section, add the shortcuts channels after the `tools.*` line:

```markdown
- `shortcuts.*` - Shortcuts CRUD (list, create, update, delete)
```

- [ ] **Step 2: Update Routes section**

In the Routing section, add:

```markdown
- `#/shortcuts` - Keyboard shortcuts reference
```

- [ ] **Step 3: Update Data Storage section**

In the Data Storage structure, add `shortcuts.json` to the `.knowledgebase/` listing:

```markdown
│   ├── shortcuts.json           # Keyboard shortcuts for external programs
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with shortcuts feature references"
```

---

### Task 9: End-to-End Smoke Test

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Start dev server and manually verify**

Run: `npm run dev`

Manual verification checklist:
- "Shortcuts" appears in the navigation sidebar
- Clicking it shows the shortcuts section with empty state message
- Click "+ Add Shortcut" opens a modal with program, shortcut, description fields
- Creating a shortcut shows it in the grouped list
- Search filters instantly as you type
- Edit/delete icons appear on hover
- Edit opens the modal pre-filled
- Delete asks for confirmation

- [ ] **Step 4: Test CLI**

Run: `npm run cli`

Manual verification checklist:
- Tab 8 "Shortcuts" appears in the tab bar
- Press `8` to switch to shortcuts tab
- Press `n` to create a new shortcut (program, shortcut, description steps)
- Shortcut appears in grouped list
- Press `/` to search
- Press `e` to edit selected shortcut
- Press `d` to delete with confirmation
