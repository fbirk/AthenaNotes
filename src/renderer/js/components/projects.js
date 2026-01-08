/**
 * Projects Component
 * Manages project organization with CRUD operations
 */

export class ProjectsComponent {
  constructor() {
    this.projects = [];
    this.selectedProject = null;
    this.view = 'list'; // 'list' or 'detail'
  }

  /**
   * Render the projects component
   */
  async render() {
    await this.loadProjects();

    return `
      <div class="projects-container">
        <div class="projects-sidebar">
          <div class="projects-header">
            <h2>Projects</h2>
            <button class="btn-icon" id="btn-create-project" title="Create Project">
              <span>+</span>
            </button>
          </div>
          <div class="projects-list" id="projects-list">
            ${this.renderProjectsList()}
          </div>
        </div>
        <div class="projects-main">
          ${this.view === 'list' ? this.renderWelcome() : this.renderProjectDetail()}
        </div>
      </div>
    `;
  }

  /**
   * Render projects list
   */
  renderProjectsList() {
    if (this.projects.length === 0) {
      return '<p class="empty-state">No projects yet. Create one to get started!</p>';
    }

    return this.projects
      .map(
        project => `
      <div class="project-item ${this.selectedProject?.id === project.id ? 'selected' : ''}" 
           data-project-id="${project.id}">
        <div class="project-info">
          <div class="project-name">${this.escapeHtml(project.name)}</div>
          <div class="project-description">${this.escapeHtml(project.description || '')}</div>
        </div>
        <button class="btn-icon btn-delete-project" data-project-id="${project.id}" title="Delete Project">
          <span>×</span>
        </button>
      </div>
    `
      )
      .join('');
  }

  /**
   * Render welcome/empty state
   */
  renderWelcome() {
    return `
      <div class="projects-welcome">
        <h3>Organize Your Knowledge</h3>
        <p>Create projects to organize your notes, todos, and roadmaps by topic or initiative.</p>
        <button class="btn-primary" id="btn-create-project-main">Create Your First Project</button>
      </div>
    `;
  }

  /**
   * Render project detail view
   */
  renderProjectDetail() {
    if (!this.selectedProject) {
      return this.renderWelcome();
    }

    const project = this.selectedProject;
    const notes = project.notes || [];

    return `
      <div class="project-detail">
        <div class="project-detail-header">
          <div>
            <h2>${this.escapeHtml(project.name)}</h2>
            <p class="project-detail-description">${this.escapeHtml(project.description || '')}</p>
          </div>
          <div class="project-actions">
            <button class="btn-secondary" id="btn-edit-project">Edit</button>
            <button class="btn-danger" id="btn-delete-project-detail">Delete</button>
          </div>
        </div>
        
        <div class="project-notes">
          <div class="project-notes-header">
            <h3>Notes (${notes.length})</h3>
            <button class="btn-primary" id="btn-create-note-in-project">+ New Note</button>
          </div>
          <div class="notes-list" id="project-notes-list">
            ${this.renderProjectNotes(notes)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render notes list for a project
   */
  renderProjectNotes(notes) {
    if (notes.length === 0) {
      return '<p class="empty-state">No notes in this project yet.</p>';
    }

    return notes
      .map(
        note => `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-info">
          <div class="note-title">${this.escapeHtml(note.title)}</div>
          <div class="note-meta">Modified ${this.formatDate(note.modifiedAt)}</div>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Create project buttons
    const btnCreate = document.getElementById('btn-create-project');
    const btnCreateMain = document.getElementById('btn-create-project-main');
    
    if (btnCreate) {
      btnCreate.addEventListener('click', () => this.showCreateProjectDialog());
    }
    
    if (btnCreateMain) {
      btnCreateMain.addEventListener('click', () => this.showCreateProjectDialog());
    }

    // Project list items
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      item.addEventListener('click', e => {
        if (!e.target.closest('.btn-delete-project')) {
          const projectId = item.dataset.projectId;
          this.selectProject(projectId);
        }
      });
    });

    // Delete project buttons (list view)
    const btnDeletes = document.querySelectorAll('.btn-delete-project');
    btnDeletes.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const projectId = btn.dataset.projectId;
        this.deleteProject(projectId);
      });
    });

    // Edit project button
    const btnEdit = document.getElementById('btn-edit-project');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => this.showEditProjectDialog());
    }

    // Delete project button (detail view)
    const btnDeleteDetail = document.getElementById('btn-delete-project-detail');
    if (btnDeleteDetail) {
      btnDeleteDetail.addEventListener('click', () => {
        if (this.selectedProject) {
          this.deleteProject(this.selectedProject.id);
        }
      });
    }

    // Create note in project button
    const btnCreateNote = document.getElementById('btn-create-note-in-project');
    if (btnCreateNote) {
      btnCreateNote.addEventListener('click', () => {
        if (this.selectedProject) {
          // Navigate to notes view with project filter
          window.location.hash = `#/notes?project=${this.selectedProject.id}`;
        }
      });
    }

    // Note items (navigate to note)
    const noteItems = document.querySelectorAll('.note-item');
    noteItems.forEach(item => {
      item.addEventListener('click', () => {
        const noteId = item.dataset.noteId;
        window.location.hash = `#/notes?note=${noteId}`;
      });
    });
  }

  /**
   * Load all projects
   */
  async loadProjects() {
    try {
      const result = await window.knowledgeBase.invoke('projects.list');
      if (result.success) {
        this.projects = result.data;
      } else {
        console.error('Failed to load projects:', result.error);
        this.showError('Failed to load projects');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      this.showError('Error loading projects');
    }
  }

  /**
   * Select and load a project
   */
  async selectProject(projectId) {
    try {
      const result = await window.knowledgeBase.invoke('projects.get', projectId);
      if (result.success) {
        this.selectedProject = result.data;
        this.view = 'detail';
        await this.refresh();
      } else {
        console.error('Failed to load project:', result.error);
        this.showError('Failed to load project');
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      this.showError('Error loading project');
    }
  }

  /**
   * Show create project dialog
   */
  showCreateProjectDialog() {
    const modal = this.createProjectModal();
    document.body.appendChild(modal);

    const form = modal.querySelector('#project-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#project-name').value.trim();
      const description = form.querySelector('#project-description').value.trim();
      
      if (name) {
        this.createProject(name, description);
        modal.remove();
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Create a new project
   */
  async createProject(name, description) {
    try {
      const result = await window.knowledgeBase.invoke('projects.create', {
        name,
        description,
      });

      if (result.success) {
        await this.loadProjects();
        this.showSuccess('Project created successfully');
        await this.refresh();
      } else {
        console.error('Failed to create project:', result.error);
        this.showError('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      this.showError('Error creating project');
    }
  }

  /**
   * Show edit project dialog
   */
  showEditProjectDialog() {
    if (!this.selectedProject) return;

    const modal = this.createProjectModal(this.selectedProject);
    document.body.appendChild(modal);

    const form = modal.querySelector('#project-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#project-name').value.trim();
      const description = form.querySelector('#project-description').value.trim();
      
      if (name) {
        this.updateProject(this.selectedProject.id, { name, description });
        modal.remove();
      }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Update a project
   */
  async updateProject(id, updates) {
    try {
      const result = await window.knowledgeBase.invoke('projects.update', {
        id,
        updates,
      });

      if (result.success) {
        await this.loadProjects();
        this.showSuccess('Project updated successfully');
        
        // Refresh detail view if this was the selected project
        if (this.selectedProject?.id === id) {
          await this.selectProject(id);
        } else {
          await this.refresh();
        }
      } else {
        console.error('Failed to update project:', result.error);
        this.showError('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      this.showError('Error updating project');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;

    const deleteNotes = confirm(
      `Delete project "${project.name}"?\n\n` +
        'Choose:\n' +
        'OK - Delete project and all its notes\n' +
        'Cancel - Keep notes and unlink from project'
    );

    // If user pressed Cancel, ask if they want to unlink instead
    if (deleteNotes === false) {
      const unlink = confirm('Unlink notes from this project (notes will be moved to root)?');
      if (!unlink) return; // User cancelled entirely
    }

    try {
      const result = await window.knowledgeBase.invoke('projects.delete', {
        id,
        deleteNotes,
      });

      if (result.success) {
        await this.loadProjects();
        this.showSuccess('Project deleted successfully');
        
        // If we deleted the selected project, go back to list view
        if (this.selectedProject?.id === id) {
          this.selectedProject = null;
          this.view = 'list';
        }
        
        await this.refresh();
      } else {
        console.error('Failed to delete project:', result.error);
        this.showError('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      this.showError('Error deleting project');
    }
  }

  /**
   * Refresh the component
   */
  async refresh() {
    const container = document.getElementById('app-content');
    if (container) {
      container.innerHTML = await this.render();
      this.setupEventListeners();
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // TODO: Implement proper notification system
    console.log('Success:', message);
  }

  /**
   * Show error message
   */
  showError(message) {
    // TODO: Implement proper notification system
    console.error('Error:', message);
    alert(message);
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Create project modal dialog
   */
  createProjectModal(project = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${project ? 'Edit Project' : 'Create Project'}</h3>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <form id="project-form" class="modal-body">
          <div class="form-group">
            <label for="project-name">Project Name *</label>
            <input type="text" id="project-name" required maxlength="100" 
                   value="${project ? this.escapeHtml(project.name) : ''}" />
          </div>
          <div class="form-group">
            <label for="project-description">Description</label>
            <textarea id="project-description" rows="4" maxlength="500">${project ? this.escapeHtml(project.description) : ''}</textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary modal-close">Cancel</button>
            <button type="submit" class="btn-primary">${project ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    `;
    return modal;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
