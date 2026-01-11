// src/renderer/js/components/roadmaps.js
// Roadmaps/Milestones UI Component
// Displays project milestones in a timeline view

import { invoke } from '../services/api.js';

let projects = [];
let milestones = [];
let todos = [];
let selectedProjectId = null;

export async function renderRoadmapsComponent(container) {
  container.innerHTML = `<div class="roadmaps-section">
    <div class="roadmaps-header">
      <h2>Project Roadmaps</h2>
      <select id="roadmap-project-filter">
        <option value="">All Projects</option>
      </select>
    </div>
    <div class="roadmaps-content">
      <div class="roadmap-summary" id="roadmap-summary"></div>
      <div class="milestone-form-container" id="milestone-form-container" style="display:none;"></div>
    </div>
  </div>`;

  await loadProjects();
  await loadMilestones();
  await loadTodos();
  renderProjectFilter();
  renderRoadmapSummary();
  setupEventListeners();
}

async function loadProjects() {
  const res = await invoke('projects.list');
  projects = res.success ? res.data : [];
}

async function loadMilestones(projectId = null) {
  const res = await invoke('milestones.list', projectId);
  milestones = res.success ? res.data : [];
}

async function loadTodos() {
  const res = await invoke('todos.list');
  // Filter only todos that have a projectId (tagged with a project)
  todos = res.success ? res.data.filter(t => t.projectId) : [];
}

function renderProjectFilter() {
  const select = document.getElementById('roadmap-project-filter');
  if (!select) return;

  select.innerHTML = '<option value="">All Projects</option>' +
    projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  if (selectedProjectId) {
    select.value = selectedProjectId;
  }
}

function renderRoadmapSummary() {
  const summary = document.getElementById('roadmap-summary');
  if (!summary) return;

  if (selectedProjectId) {
    // Show single project roadmap
    const project = projects.find(p => p.id === selectedProjectId);
    const projectMilestones = milestones.filter(m => m.projectId === selectedProjectId);
    summary.innerHTML = renderProjectRoadmap(project, projectMilestones);
  } else {
    // Show all project roadmaps summary
    if (projects.length === 0) {
      summary.innerHTML = '<div class="empty">No projects yet. Create a project to add milestones.</div>';
      return;
    }

    summary.innerHTML = projects.map(project => {
      const projectMilestones = milestones.filter(m => m.projectId === project.id);
      return renderProjectRoadmap(project, projectMilestones);
    }).join('');
  }

  attachMilestoneEventListeners();
}

function renderProjectRoadmap(project, projectMilestones) {
  if (!project) return '';

  // Get todos tagged with this project
  const projectTodos = todos.filter(t => t.projectId === project.id);

  // Combine milestones and todos into a unified timeline
  const timelineItems = [
    ...projectMilestones.map(m => ({ ...m, type: 'milestone' })),
    ...projectTodos.map(t => ({ ...t, type: 'todo', title: t.title, description: t.description }))
  ];

  // Sort by deadline/date (items with deadlines first, then by deadline date)
  timelineItems.sort((a, b) => {
    const aDate = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
    const bDate = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
    return aDate - bDate;
  });

  const completedCount = timelineItems.filter(item => item.completed).length;
  const totalCount = timelineItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return `
    <div class="roadmap-card" data-project-id="${project.id}">
      <div class="roadmap-card-header">
        <h3>${project.name}</h3>
        <button class="btn-secondary btn-small add-milestone-btn" data-project-id="${project.id}">+ Milestone</button>
      </div>
      <p class="roadmap-description">${project.description || ''}</p>
      <div class="roadmap-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <span class="progress-text">${completedCount}/${totalCount} completed</span>
      </div>
      <div class="milestone-timeline">
        ${timelineItems.length > 0
          ? timelineItems.map(item => item.type === 'milestone' ? renderMilestone(item) : renderTodoAsMilestone(item)).join('')
          : '<div class="empty-milestones">No milestones or todos yet</div>'
        }
      </div>
    </div>
  `;
}

function renderMilestone(milestone) {
  const isOverdue = !milestone.completed && new Date(milestone.deadline) < new Date();
  const deadlineDate = new Date(milestone.deadline).toLocaleDateString();

  return `
    <div class="milestone-item ${milestone.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-milestone-id="${milestone.id}">
      <div class="milestone-marker">
        <input type="checkbox" class="milestone-checkbox" ${milestone.completed ? 'checked' : ''} data-id="${milestone.id}" />
      </div>
      <div class="milestone-content">
        <div class="milestone-header">
          <span class="milestone-title ${milestone.completed ? 'strikethrough' : ''}">${milestone.title}</span>
          <span class="milestone-deadline ${isOverdue ? 'overdue' : ''}">${deadlineDate}</span>
        </div>
        ${milestone.description ? `<p class="milestone-description">${milestone.description}</p>` : ''}
      </div>
      <div class="milestone-actions">
        <button class="btn-icon-tiny edit-milestone-btn" data-id="${milestone.id}" title="Edit">&#9998;</button>
        <button class="btn-icon-tiny delete-milestone-btn" data-id="${milestone.id}" title="Delete">&times;</button>
      </div>
    </div>
  `;
}

function renderTodoAsMilestone(todo) {
  const hasDeadline = todo.deadline && todo.deadline !== '';
  const isOverdue = hasDeadline && !todo.completed && new Date(todo.deadline) < new Date();
  const deadlineDate = hasDeadline ? new Date(todo.deadline).toLocaleDateString() : 'No deadline';

  return `
    <div class="milestone-item todo-milestone ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-todo-id="${todo.id}">
      <div class="milestone-marker">
        <input type="checkbox" class="todo-milestone-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}" />
      </div>
      <div class="milestone-content">
        <div class="milestone-header">
          <span class="milestone-title ${todo.completed ? 'strikethrough' : ''}">
            ${todo.title}
            <span class="milestone-type-badge todo-badge">Todo</span>
          </span>
          <span class="milestone-deadline ${isOverdue ? 'overdue' : ''}">${deadlineDate}</span>
        </div>
        ${todo.description ? `<p class="milestone-description">${todo.description}</p>` : ''}
      </div>
      <div class="milestone-actions">
        <span class="todo-priority-badge priority-${todo.priority}">${todo.priority}</span>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  const projectFilter = document.getElementById('roadmap-project-filter');
  if (projectFilter) {
    projectFilter.addEventListener('change', async (e) => {
      selectedProjectId = e.target.value || null;
      await loadMilestones(selectedProjectId);
      renderRoadmapSummary();
    });
  }
}

function attachMilestoneEventListeners() {
  // Add milestone buttons
  document.querySelectorAll('.add-milestone-btn').forEach(btn => {
    btn.onclick = () => showMilestoneForm(btn.dataset.projectId);
  });

  // Milestone checkboxes
  document.querySelectorAll('.milestone-checkbox').forEach(checkbox => {
    checkbox.onchange = async () => {
      await invoke('milestones.toggleComplete', checkbox.dataset.id);
      await loadMilestones(selectedProjectId);
      renderRoadmapSummary();
    };
  });

  // Todo milestone checkboxes
  document.querySelectorAll('.todo-milestone-checkbox').forEach(checkbox => {
    checkbox.onchange = async () => {
      await invoke('todos.toggleComplete', checkbox.dataset.id);
      await loadTodos();
      renderRoadmapSummary();
      // Notify other components that todos changed
      window.dispatchEvent(new CustomEvent('todos-changed'));
    };
  });

  // Edit buttons
  document.querySelectorAll('.edit-milestone-btn').forEach(btn => {
    btn.onclick = () => editMilestone(btn.dataset.id);
  });

  // Delete buttons
  document.querySelectorAll('.delete-milestone-btn').forEach(btn => {
    btn.onclick = () => deleteMilestone(btn.dataset.id);
  });
}

function showMilestoneForm(projectId, milestone = null) {
  const container = document.getElementById('milestone-form-container');
  if (!container) return;

  const project = projects.find(p => p.id === projectId);
  const isEdit = milestone !== null;

  container.style.display = '';
  container.innerHTML = `
    <div class="milestone-form">
      <h4>${isEdit ? 'Edit' : 'Add'} Milestone for ${project?.name || 'Project'}</h4>
      <form id="milestone-form">
        <input type="hidden" name="projectId" value="${projectId}" />
        ${isEdit ? `<input type="hidden" name="id" value="${milestone.id}" />` : ''}
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" value="${milestone?.title || ''}" required maxlength="200" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3" maxlength="1000">${milestone?.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Deadline</label>
          <input type="date" name="deadline" value="${milestone?.deadline ? milestone.deadline.split('T')[0] : ''}" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'}</button>
          <button type="button" class="btn-secondary" id="cancel-milestone-form">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('cancel-milestone-form').onclick = () => {
    container.style.display = 'none';
  };

  document.getElementById('milestone-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      projectId: fd.get('projectId'),
      title: fd.get('title'),
      description: fd.get('description'),
      deadline: new Date(fd.get('deadline')).toISOString(),
    };

    if (isEdit) {
      await invoke('milestones.update', { id: fd.get('id'), updates: data });
    } else {
      await invoke('milestones.create', data);
    }

    container.style.display = 'none';
    await loadMilestones(selectedProjectId);
    renderRoadmapSummary();
  };
}

async function editMilestone(id) {
  const milestone = milestones.find(m => m.id === id);
  if (milestone) {
    showMilestoneForm(milestone.projectId, milestone);
  }
}

async function deleteMilestone(id) {
  if (!confirm('Delete this milestone?')) return;
  await invoke('milestones.delete', id);
  await loadMilestones(selectedProjectId);
  renderRoadmapSummary();
}
