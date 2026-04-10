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
