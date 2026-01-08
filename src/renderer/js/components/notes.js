import { markdownService } from '../services/markdown.js';
import { isValidTitle } from '../../../shared/validators.js';

/**
 * Notes Component
 * Handles note creation, editing, viewing, and management
 */

export class NotesComponent {
  constructor() {
    this.container = null;
    this.notes = [];
    this.projects = [];
    this.currentNote = null;
    this.selectedProjectId = null;
    this.isEditing = false;
    this.autoSaveTimer = null;
    this.hasUnsavedChanges = false;
    this.sortBy = 'modifiedAt';
    this.sortOrder = 'desc';
    this.preloadCache = new Map(); // Cache for preloaded notes
  }

  /**
   * Render the notes component
   * @param {HTMLElement} container - Parent element to render into
   */
  async render(container) {
    this.container = container;
    container.innerHTML = '';

    const notesView = document.createElement('div');
    notesView.className = 'notes-container';
    notesView.innerHTML = `
      <div class="notes-sidebar">
        <div class="notes-header">
          <h2>Notes</h2>
          <button type="button" class="btn-icon" id="new-note-btn" title="Create new note">
            <span>+</span>
          </button>
        </div>
        
        <div class="notes-controls">
          <select id="project-filter" class="project-filter">
            <option value="">All Projects</option>
          </select>
          <select id="sort-select" class="sort-select">
            <option value="modifiedAt-desc">Recent</option>
            <option value="modifiedAt-asc">Oldest</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest Created</option>
          </select>
        </div>

        <div class="notes-list" id="notes-list">
          <div class="loading">Loading notes...</div>
        </div>
      </div>

      <div class="notes-main">
        <div class="notes-editor-container" id="editor-container" style="display: none;">
          <div class="editor-toolbar">
            <input 
              type="text" 
              id="note-title" 
              class="note-title-input" 
              placeholder="Note title"
              maxlength="200"
            />
            <div class="editor-metadata">
              <select id="note-project" class="note-project-select">
                <option value="">No Project</option>
              </select>
            </div>
            <div class="editor-actions">
              <button type="button" class="btn-secondary" id="toggle-preview-btn">
                Preview
              </button>
              <button type="button" class="btn-secondary" id="save-note-btn" disabled>
                Save
              </button>
              <button type="button" class="btn-danger" id="delete-note-btn">
                Delete
              </button>
            </div>
          </div>

          <div class="editor-content">
            <textarea 
              id="note-content" 
              class="note-editor" 
              placeholder="Write your note in Markdown..."
            ></textarea>
            <div id="note-preview" class="note-preview" style="display: none;"></div>
          </div>

          <div class="editor-status" id="editor-status"></div>
        </div>

        <div class="notes-empty" id="empty-state">
          <div class="empty-state-content">
            <h3>No note selected</h3>
            <p>Select a note from the list or create a new one</p>
          </div>
        </div>
      </div>

      <div class="feedback-message" id="feedback-message"></div>
    `;

    container.appendChild(notesView);
    await this.loadProjects();
    await this.loadNotes();
    this.attachEventListeners();
  }

  /**
   * Load all notes from the backend
   */
  async loadNotes() {
    try {
      const result = await window.knowledgeBase.invoke('notes.list', {
        projectId: this.selectedProjectId,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      });

      if (result.success) {
        this.notes = result.data;
        this.renderNotesList();
      } else {
        this.showError('Failed to load notes: ' + result.error);
      }
    } catch (error) {
      this.showError('Error loading notes: ' + error.message);
    }
  }

  /**
   * Load available projects for filtering
   */
  async loadProjects() {
    try {
      const result = await window.knowledgeBase.invoke('projects.list');
      if (result.success) {
        this.projects = result.data;
        this.renderProjectDropdowns();
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  /**
   * Render project dropdowns
   */
  renderProjectDropdowns() {
    // Filter dropdown
    const filterSelect = document.getElementById('project-filter');
    if (filterSelect) {
      const currentValue = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Projects</option>' +
        this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
      filterSelect.value = currentValue;
    }

    // Note project dropdown
    const noteProjectSelect = document.getElementById('note-project');
    if (noteProjectSelect) {
      const currentValue = noteProjectSelect.value;
      noteProjectSelect.innerHTML = '<option value="">No Project</option>' +
        this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
      noteProjectSelect.value = currentValue;
    }
  }

  /**
   * Render the notes list in the sidebar
   */
  renderNotesList() {
    const listContainer = document.getElementById('notes-list');
    
    if (!listContainer) return;

    if (this.notes.length === 0) {
      listContainer.innerHTML = '<div class="notes-list-empty">No notes yet. Create your first note!</div>';
      return;
    }

    listContainer.innerHTML = this.notes.map(note => `
      <div class="note-item ${this.currentNote?.id === note.id ? 'active' : ''}" data-note-id="${note.id}">
        <div class="note-item-title">${this.escapeHtml(note.title)}</div>
        <div class="note-item-meta">
          ${new Date(note.modifiedAt).toLocaleDateString()}
        </div>
      </div>
    `).join('');

    // Attach click handlers to note items
    listContainer.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => {
        const noteId = item.dataset.noteId;
        this.loadNote(noteId);
      });
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const newNoteBtn = document.getElementById('new-note-btn');
    const sortSelect = document.getElementById('sort-select');
    const titleInput = document.getElementById('note-title');
    const contentTextarea = document.getElementById('note-content');
    const saveBtn = document.getElementById('save-note-btn');
    const deleteBtn = document.getElementById('delete-note-btn');
    const togglePreviewBtn = document.getElementById('toggle-preview-btn');
    const projectFilter = document.getElementById('project-filter');
    const noteProjectSelect = document.getElementById('note-project');

    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', () => this.createNewNote());
    }

    if (projectFilter) {
      projectFilter.addEventListener('change', (e) => {
        this.selectedProjectId = e.target.value || null;
        this.loadNotes();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.loadNotes();
      });
    }

    if (noteProjectSelect) {
      noteProjectSelect.addEventListener('change', () => this.onContentChange());
    }

    if (titleInput) {
      titleInput.addEventListener('input', () => this.onContentChange());
    }

    if (contentTextarea) {
      contentTextarea.addEventListener('input', () => this.onContentChange());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveNote());
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteNote());
    }

    if (togglePreviewBtn) {
      togglePreviewBtn.addEventListener('click', () => this.togglePreview());
    }
  }

  /**
   * Create a new note
   */
  async createNewNote() {
    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Create new note anyway?');
      if (!confirm) return;
    }

    this.currentNote = null;
    this.hasUnsavedChanges = false;
    this.isEditing = false;

    // Show editor
    this.showEditor();

    // Clear inputs
    const titleInput = document.getElementById('note-title');
    const contentTextarea = document.getElementById('note-content');

    if (titleInput) titleInput.value = '';
    if (contentTextarea) contentTextarea.value = '';

    // Focus title input
    if (titleInput) titleInput.focus();

    this.updateSaveButton();
  }

  /**
   * Load a note by ID
   * @param {string} noteId - Note ID
   */
  async loadNote(noteId) {
    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Load note anyway?');
      if (!confirm) return;
    }

    try {
      // Check if note is in preload cache
      let result;
      if (this.preloadCache.has(noteId)) {
        result = { success: true, data: this.preloadCache.get(noteId) };
        this.preloadCache.delete(noteId); // Remove from cache after use
      } else {
        result = await window.knowledgeBase.invoke('notes.get', noteId);
      }

      if (result.success) {
        this.currentNote = result.data;
        this.hasUnsavedChanges = false;
        this.isEditing = false;

        // Show editor
        this.showEditor();

        // Populate inputs
        const titleInput = document.getElementById('note-title');
        const contentTextarea = document.getElementById('note-content');
        const noteProjectSelect = document.getElementById('note-project');

        if (titleInput) titleInput.value = this.currentNote.title;
        if (contentTextarea) contentTextarea.value = this.currentNote.content;
        if (noteProjectSelect) noteProjectSelect.value = this.currentNote.projectId || '';

        this.updateSaveButton();
        this.renderNotesList(); // Update active state

        // Preload linked notes for instant navigation
        this.preloadLinkedNotes(this.currentNote.content);
      } else {
        this.showError('Failed to load note: ' + result.error);
      }
    } catch (error) {
      this.showError('Error loading note: ' + error.message);
    }
  }

  /**
   * Preload notes referenced in the current note for instant navigation
   * @param {string} content - Note content
   */
  async preloadLinkedNotes(content) {
    const linkedTitles = markdownService.extractInternalLinks(content);
    
    // Find notes with matching titles
    const linkedNotes = this.notes.filter(n => linkedTitles.includes(n.title));
    
    // Preload up to 5 linked notes
    const toPreload = linkedNotes.slice(0, 5);
    
    for (const noteMetadata of toPreload) {
      try {
        const result = await window.knowledgeBase.invoke('notes.get', noteMetadata.id);
        if (result.success) {
          this.preloadCache.set(noteMetadata.id, result.data);
        }
      } catch (error) {
        // Silently fail preloading
        console.debug('Failed to preload note:', noteMetadata.id);
      }
    }
  }

  /**
   * Handle content changes
   */
  onContentChange() {
    this.hasUnsavedChanges = true;
    this.updateSaveButton();

    // Auto-save with 500ms debounce
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      if (this.hasUnsavedChanges && this.currentNote) {
        this.saveNote(true); // true = auto-save
      }
    }, 500);
  }

  /**
   * Save the current note
   * @param {boolean} isAutoSave - Whether this is an auto-save
   */
  async saveNote(isAutoSave = false) {
    const titleInput = document.getElementById('note-title');
    const contentTextarea = document.getElementById('note-content');
    const noteProjectSelect = document.getElementById('note-project');

    if (!titleInput || !contentTextarea) return;

    const title = titleInput.value.trim();
    const content = contentTextarea.value;
    const projectId = noteProjectSelect?.value || null;

    // Validate title
    if (!title) {
      this.showError('Note title cannot be empty');
      titleInput.focus();
      return;
    }

    if (!isValidTitle(title)) {
      this.showError('Note title contains invalid characters: / \\ : * ? " < > |');
      titleInput.focus();
      return;
    }

    try {
      let result;

      if (this.currentNote) {
        // Update existing note
        result = await window.knowledgeBase.invoke('notes.update', {
          id: this.currentNote.id,
          updates: { title, content, projectId },
        });
      } else {
        // Create new note
        result = await window.knowledgeBase.invoke('notes.create', {
          title,
          content,
          projectId,
        });
      }

      if (result.success) {
        this.currentNote = result.data;
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
        
        if (!isAutoSave) {
          this.showSuccess('Note saved successfully');
        }

        // Reload notes list
        await this.loadNotes();
      } else {
        this.showError('Failed to save note: ' + result.error);
      }
    } catch (error) {
      this.showError('Error saving note: ' + error.message);
    }
  }

  /**
   * Delete the current note
   */
  async deleteNote() {
    if (!this.currentNote) return;

    const confirm = window.confirm(`Delete note "${this.currentNote.title}"?`);
    if (!confirm) return;

    try {
      const result = await window.knowledgeBase.invoke('notes.delete', this.currentNote.id);

      if (result.success) {
        this.showSuccess('Note deleted successfully');

        // Clear editor
        this.currentNote = null;
        this.hasUnsavedChanges = false;
        this.hideEditor();

        // Reload notes list
        await this.loadNotes();
      } else {
        this.showError('Failed to delete note: ' + result.error);
      }
    } catch (error) {
      this.showError('Error deleting note: ' + error.message);
    }
  }

  /**
   * Toggle between edit and preview mode
   */
  togglePreview() {
    this.isEditing = !this.isEditing;

    const contentTextarea = document.getElementById('note-content');
    const previewDiv = document.getElementById('note-preview');
    const toggleBtn = document.getElementById('toggle-preview-btn');

    if (!contentTextarea || !previewDiv || !toggleBtn) return;

    if (this.isEditing) {
      // Show preview
      const content = contentTextarea.value;
      previewDiv.innerHTML = markdownService.render(content, this.currentNote?.id);
      
      contentTextarea.style.display = 'none';
      previewDiv.style.display = 'block';
      toggleBtn.textContent = 'Edit';

      // Validate internal links and style broken ones
      const { broken } = markdownService.validateInternalLinks(content, this.notes);
      
      // Add click handler for internal links and mark broken ones
      previewDiv.querySelectorAll('a[href^="internal://"]').forEach(link => {
        const title = decodeURIComponent(link.getAttribute('href').replace('internal://', ''));
        
        // Mark broken links
        if (broken.includes(title)) {
          link.classList.add('broken-link');
          link.title = `Note "${title}" not found`;
        } else {
          link.classList.add('internal-link');
        }
        
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigateToNoteByTitle(title);
        });
      });
    } else {
      // Show editor
      contentTextarea.style.display = 'block';
      previewDiv.style.display = 'none';
      toggleBtn.textContent = 'Preview';
    }
  }

  /**
   * Navigate to a note by title
   * @param {string} title - Note title
   */
  async navigateToNoteByTitle(title) {
    const note = this.notes.find(n => n.title === title);
    
    if (note) {
      await this.loadNote(note.id);
    } else {
      this.showError(`Note "${title}" not found`);
    }
  }

  /**
   * Show the editor
   */
  showEditor() {
    const editorContainer = document.getElementById('editor-container');
    const emptyState = document.getElementById('empty-state');

    if (editorContainer) editorContainer.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
  }

  /**
   * Hide the editor
   */
  hideEditor() {
    const editorContainer = document.getElementById('editor-container');
    const emptyState = document.getElementById('empty-state');

    if (editorContainer) editorContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  }

  /**
   * Update save button state
   */
  updateSaveButton() {
    const saveBtn = document.getElementById('save-note-btn');
    if (!saveBtn) return;

    saveBtn.disabled = !this.hasUnsavedChanges;
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showFeedback(message, 'success');
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.showFeedback(message, 'error');
  }

  /**
   * Show feedback message
   * @param {string} message - Message text
   * @param {string} type - Message type ('success' or 'error')
   */
  showFeedback(message, type) {
    const feedbackDiv = document.getElementById('feedback-message');
    if (!feedbackDiv) return;

    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback-message ${type} show`;

    setTimeout(() => {
      feedbackDiv.classList.remove('show');
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
