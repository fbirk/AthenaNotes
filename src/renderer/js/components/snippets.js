// src/renderer/js/components/snippets.js
// Code Snippets UI Component
// Handles listing, creating, editing, deleting, and searching code snippets

import { invoke } from '../services/api.js';

let snippets = [];
let filters = { language: '', usage: '', module: '' };

let searchQuery = '';
let lastSearchResults = [];

export async function renderSnippetsComponent(container) {
  container.innerHTML = `<div class="snippets-section">
    <div class="snippets-header">
      <h2>Code Snippets</h2>
      <button id="add-snippet-btn">+ New Snippet</button>
      <input id="snippet-search" type="text" placeholder="Search snippets..." />
    </div>
    <div class="snippets-filters">
      <input id="filter-language" type="text" placeholder="Language" />
      <input id="filter-usage" type="text" placeholder="Usage" />
      <input id="filter-module" type="text" placeholder="Module" />
    </div>
    <div id="snippets-list"></div>
    <div id="snippet-form-modal" class="modal" style="display:none;"></div>
  </div>`;

  document.getElementById('add-snippet-btn').onclick = () => showSnippetForm();
  document.getElementById('snippet-search').oninput = async (e) => {
    searchQuery = e.target.value;
    await performSearch();
    renderSnippetsList();
  };
  document.getElementById('filter-language').oninput = async (e) => {
    filters.language = e.target.value;
    await performSearch();
    renderSnippetsList();
  };
  document.getElementById('filter-usage').oninput = async (e) => {
    filters.usage = e.target.value;
    await performSearch();
    renderSnippetsList();
  };
  document.getElementById('filter-module').oninput = async (e) => {
    filters.module = e.target.value;
    await performSearch();
    renderSnippetsList();
  };

  await performSearch();
  renderSnippetsList();
}


async function loadSnippets() {
  const res = await invoke('snippets.list');
  snippets = res.success ? res.data : [];
}

async function performSearch() {
  // Use IPC search for accuracy and performance
  const tagFilters = {};
  if (filters.language) tagFilters.language = [filters.language];
  if (filters.usage) tagFilters.usage = [filters.usage];
  if (filters.module) tagFilters.module = [filters.module];
  const res = await invoke('snippets.search', searchQuery, tagFilters);
  lastSearchResults = res.success ? res.data : [];
}

function renderSnippetsList() {
  const list = document.getElementById('snippets-list');
  const display = lastSearchResults.length ? lastSearchResults : snippets;
  if (!display.length) {
    list.innerHTML = '<div class="empty">No snippets found.</div>';
    return;
  }
  list.innerHTML = display.map(s => `
    <div class="snippet-card">
      <div class="snippet-header">
        <span class="snippet-title">${s.title}</span>
        <span class="snippet-language">${s.language}</span>
        <button class="copy-code-btn" data-id="${s.id}">Copy</button>
        <button class="edit-snippet-btn" data-id="${s.id}">Edit</button>
        <button class="delete-snippet-btn" data-id="${s.id}">Delete</button>
      </div>
      <div class="snippet-description">${s.description || ''}</div>
      <pre><code class="hljs ${s.language}">${escapeHtml(s.code)}</code></pre>
      <div class="snippet-tags">
        ${renderTags(s.tags)}
      </div>
    </div>
  `).join('');
  // Attach event listeners
  list.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.onclick = (e) => copySnippetCode(e.target.dataset.id);
  });
  list.querySelectorAll('.edit-snippet-btn').forEach(btn => {
    btn.onclick = (e) => showSnippetForm(e.target.dataset.id);
  });
  list.querySelectorAll('.delete-snippet-btn').forEach(btn => {
    btn.onclick = (e) => deleteSnippet(e.target.dataset.id);
  });
  // Highlight code
  if (window.hljs) {
    list.querySelectorAll('pre code').forEach(block => window.hljs.highlightElement(block));
  }
}

function renderTags(tags) {
  return ['language', 'usage', 'module'].map(cat =>
    (tags[cat] || []).map(tag => `<span class="tag tag-${cat}">${tag}</span>`).join(' ')
  ).join(' ');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}


async function showSnippetForm(id) {
  let snippet = id ? snippets.find(s => s.id === id) : {
    title: '', description: '', language: '', code: '', tags: { language: [], usage: [], module: [] }
  };
  const modal = document.getElementById('snippet-form-modal');
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${id ? 'Edit' : 'New'} Snippet</h3>
      <form id="snippet-form">
        <label>Title <input name="title" value="${snippet.title || ''}" required maxlength="200" /></label>
        <label>Description <input name="description" value="${snippet.description || ''}" maxlength="500" /></label>
        <label>Language <input name="language" value="${snippet.language || ''}" required /></label>
        <label>Code
          <textarea name="code" id="snippet-code-area" rows="8" required>${snippet.code || ''}</textarea>
        </label>
        <div id="snippet-code-preview" class="code-preview" style="margin-top:8px;"></div>
        <label>Tags (comma, space separated)</label>
        <div class="tag-inputs">
          <input name="tags-language" placeholder="Languages" value="${(snippet.tags.language||[]).join(', ')}" />
          <input name="tags-usage" placeholder="Usage" value="${(snippet.tags.usage||[]).join(', ')}" />
          <input name="tags-module" placeholder="Module" value="${(snippet.tags.module||[]).join(', ')}" />
        </div>
        <div class="modal-actions">
          <button type="submit">${id ? 'Update' : 'Create'}</button>
          <button type="button" id="cancel-snippet-form">Cancel</button>
        </div>
      </form>
    </div>
  `;
  modal.style.display = '';
  document.getElementById('cancel-snippet-form').onclick = () => { modal.style.display = 'none'; };
  // Live code preview with highlight.js
  const codeArea = document.getElementById('snippet-code-area');
  const codePreview = document.getElementById('snippet-code-preview');
  function updatePreview() {
    const lang = document.querySelector('input[name="language"]').value.trim();
    const code = codeArea.value;
    codePreview.innerHTML = `<pre><code class="hljs ${lang}">${escapeHtml(code)}</code></pre>`;
    if (window.hljs) {
      codePreview.querySelectorAll('pre code').forEach(block => window.hljs.highlightElement(block));
    }
  }
  codeArea.oninput = updatePreview;
  document.querySelector('input[name="language"]').oninput = updatePreview;
  updatePreview();
  document.getElementById('snippet-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'),
      description: fd.get('description'),
      language: fd.get('language'),
      code: fd.get('code'),
      tags: {
        language: (fd.get('tags-language')||'').split(/[, ]+/).filter(Boolean),
        usage: (fd.get('tags-usage')||'').split(/[, ]+/).filter(Boolean),
        module: (fd.get('tags-module')||'').split(/[, ]+/).filter(Boolean),
      }
    };
    if (id) {
      await invoke('snippets.update', id, data);
    } else {
      await invoke('snippets.create', data);
    }
    await loadSnippets();
    renderSnippetsList();
    modal.style.display = 'none';
  };
}

async function deleteSnippet(id) {
  if (!confirm('Delete this snippet?')) return;
  await invoke('snippets.delete', id);
  await loadSnippets();
  renderSnippetsList();
}

async function copySnippetCode(id) {
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;
  try {
    await navigator.clipboard.writeText(snippet.code);
    alert('Code copied!');
  } catch {
    alert('Copy failed.');
  }
}
