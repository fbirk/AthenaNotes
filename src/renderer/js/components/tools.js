// src/renderer/js/components/tools.js
// Software Tools UI Component
// Quick-launch for frequently used applications and URLs

import { invoke } from '../services/api.js';

let tools = [];
let categoryFilter = '';

export async function renderToolsComponent(container) {
  container.innerHTML = `<div class="tools-section">
    <div class="tools-header">
      <h2>Software Tools</h2>
      <button id="add-tool-btn" class="btn-primary">+ Add Tool</button>
      <select id="tools-category-filter">
        <option value="">All Categories</option>
      </select>
    </div>
    <div id="tools-list" class="tools-grid"></div>
    <div id="tool-form-modal" class="modal" style="display:none;"></div>
  </div>`;

  await loadTools();
  renderCategoryFilter();
  renderToolsList();
  setupEventListeners();
}

async function loadTools() {
  const res = await invoke('tools.list');
  tools = res.success ? res.data : [];
}

function getCategories() {
  const categories = new Set(tools.map(t => t.category || 'General'));
  return Array.from(categories).sort();
}

function renderCategoryFilter() {
  const select = document.getElementById('tools-category-filter');
  if (!select) return;

  const categories = getCategories();
  select.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');

  if (categoryFilter) {
    select.value = categoryFilter;
  }
}

function renderToolsList() {
  const list = document.getElementById('tools-list');
  if (!list) return;

  let displayTools = tools;
  if (categoryFilter) {
    displayTools = tools.filter(t => (t.category || 'General') === categoryFilter);
  }

  if (displayTools.length === 0) {
    list.innerHTML = '<div class="empty">No tools yet. Add a tool to get started.</div>';
    return;
  }

  // Group by category
  const grouped = {};
  displayTools.forEach(tool => {
    const cat = tool.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tool);
  });

  list.innerHTML = Object.entries(grouped).map(([category, categoryTools]) => `
    <div class="tools-category">
      <h3 class="category-title">${category}</h3>
      <div class="tools-category-grid">
        ${categoryTools.map(tool => renderToolCard(tool)).join('')}
      </div>
    </div>
  `).join('');

  attachToolEventListeners();
}

function renderToolCard(tool) {
  const isUrl = tool.launchType === 'url';
  const icon = isUrl ? '&#127760;' : '&#128187;';

  return `
    <div class="tool-card" data-id="${tool.id}">
      <div class="tool-icon">${icon}</div>
      <div class="tool-info">
        <span class="tool-name">${tool.name}</span>
        <span class="tool-description">${tool.description || ''}</span>
        <span class="tool-path">${truncatePath(tool.launchPath)}</span>
      </div>
      <div class="tool-actions">
        <button class="btn-launch tool-launch-btn" data-id="${tool.id}" title="Launch">&#9654;</button>
        <button class="btn-icon-tiny tool-edit-btn" data-id="${tool.id}" title="Edit">&#9998;</button>
        <button class="btn-icon-tiny tool-delete-btn" data-id="${tool.id}" title="Delete">&times;</button>
      </div>
    </div>
  `;
}

function truncatePath(path) {
  if (!path) return '';
  if (path.length <= 50) return path;
  return '...' + path.slice(-47);
}

function setupEventListeners() {
  const addBtn = document.getElementById('add-tool-btn');
  if (addBtn) {
    addBtn.onclick = () => showToolForm();
  }

  const categorySelect = document.getElementById('tools-category-filter');
  if (categorySelect) {
    categorySelect.onchange = (e) => {
      categoryFilter = e.target.value;
      renderToolsList();
    };
  }
}

function attachToolEventListeners() {
  document.querySelectorAll('.tool-launch-btn').forEach(btn => {
    btn.onclick = () => launchTool(btn.dataset.id);
  });

  document.querySelectorAll('.tool-edit-btn').forEach(btn => {
    btn.onclick = () => editTool(btn.dataset.id);
  });

  document.querySelectorAll('.tool-delete-btn').forEach(btn => {
    btn.onclick = () => deleteTool(btn.dataset.id);
  });
}

async function launchTool(id) {
  const res = await invoke('tools.launch', id);
  if (!res.success) {
    alert('Failed to launch tool: ' + res.error);
  }
}

function showToolForm(tool = null) {
  const modal = document.getElementById('tool-form-modal');
  if (!modal) return;

  const isEdit = tool !== null;
  const categories = getCategories();

  modal.style.display = '';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${isEdit ? 'Edit' : 'Add'} Tool</h3>
      <form id="tool-form">
        ${isEdit ? `<input type="hidden" name="id" value="${tool.id}" />` : ''}
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${tool?.name || ''}" required maxlength="100" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" name="description" value="${tool?.description || ''}" maxlength="300" />
        </div>
        <div class="form-group">
          <label>Launch Type</label>
          <select name="launchType">
            <option value="application" ${tool?.launchType !== 'url' ? 'selected' : ''}>Application</option>
            <option value="url" ${tool?.launchType === 'url' ? 'selected' : ''}>URL</option>
          </select>
        </div>
        <div class="form-group">
          <label>Launch Path / URL</label>
          <input type="text" name="launchPath" value="${tool?.launchPath || ''}" required />
        </div>
        <div class="form-group">
          <label>Category</label>
          <input type="text" name="category" value="${tool?.category || ''}" list="category-options" placeholder="General" maxlength="50" />
          <datalist id="category-options">
            ${categories.map(c => `<option value="${c}">`).join('')}
          </datalist>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'}</button>
          <button type="button" class="btn-secondary" id="cancel-tool-form">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('cancel-tool-form').onclick = () => {
    modal.style.display = 'none';
  };

  document.getElementById('tool-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      description: fd.get('description'),
      launchPath: fd.get('launchPath'),
      launchType: fd.get('launchType'),
      category: fd.get('category') || 'General',
    };

    if (isEdit) {
      await invoke('tools.update', { id: fd.get('id'), updates: data });
    } else {
      await invoke('tools.create', data);
    }

    modal.style.display = 'none';
    await loadTools();
    renderCategoryFilter();
    renderToolsList();
  };
}

async function editTool(id) {
  const tool = tools.find(t => t.id === id);
  if (tool) {
    showToolForm(tool);
  }
}

async function deleteTool(id) {
  if (!confirm('Delete this tool?')) return;
  await invoke('tools.delete', id);
  await loadTools();
  renderCategoryFilter();
  renderToolsList();
}
