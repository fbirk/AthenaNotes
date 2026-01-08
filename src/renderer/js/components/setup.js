/**
 * Setup Component
 * Handles first-time setup wizard for storage location configuration
 */

export class SetupComponent {
  constructor() {
    this.container = null;
    this.selectedPath = null;
  }

  /**
   * Render the setup wizard UI
   * @param {HTMLElement} container - Parent element to render into
   */
  render(container) {
    this.container = container;
    container.innerHTML = '';

    const setupView = document.createElement('div');
    setupView.className = 'setup-wizard';
    setupView.innerHTML = `
      <div class="setup-container">
        <div class="setup-header">
          <h1>Welcome to Knowledge Base</h1>
          <p>Let's set up your personal knowledge base</p>
        </div>

        <div class="setup-content">
          <div class="setup-step">
            <h2>Choose Storage Location</h2>
            <p>Select a folder where your notes, snippets, and projects will be stored.</p>
            
            <div class="storage-selection">
              <div class="selected-path" id="selected-path">
                <span class="path-label">No folder selected</span>
              </div>
              <button type="button" class="btn-primary" id="select-folder-btn">
                Select Folder
              </button>
            </div>

            <div class="setup-info">
              <h3>What will be created?</h3>
              <ul>
                <li><strong>notes/</strong> - Your markdown notes</li>
                <li><strong>snippets/</strong> - Code snippets</li>
                <li><strong>.knowledgebase/</strong> - Configuration and data files</li>
              </ul>
            </div>
          </div>

          <div class="setup-actions">
            <button type="button" class="btn-primary btn-large" id="complete-setup-btn" disabled>
              Complete Setup
            </button>
          </div>

          <div class="setup-error" id="setup-error" style="display: none;"></div>
        </div>
      </div>
    `;

    container.appendChild(setupView);
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to setup wizard controls
   */
  attachEventListeners() {
    const selectFolderBtn = document.getElementById('select-folder-btn');
    const completeSetupBtn = document.getElementById('complete-setup-btn');

    selectFolderBtn.addEventListener('click', () => this.selectFolder());
    completeSetupBtn.addEventListener('click', () => this.completeSetup());
  }

  /**
   * Open folder selection dialog
   */
  async selectFolder() {
    try {
      // Check if API is available
      if (!window.knowledgeBase || typeof window.knowledgeBase.invoke !== 'function') {
        this.showError('Application API is not available. Please reload the application.');
        console.error('window.knowledgeBase is not defined or invoke is not a function');
        return;
      }

      const result = await window.knowledgeBase.invoke('fs.selectFolder');

      if (result.success && result.data.path) {
        this.selectedPath = result.data.path;
        this.updateSelectedPath(this.selectedPath);

        // Validate the selected path
        await this.validatePath(this.selectedPath);
      }
    } catch (error) {
      console.error('Error in selectFolder:', error);
      this.showError('Failed to select folder: ' + error.message);
    }
  }

  /**
   * Validate the selected path
   * @param {string} path - Path to validate
   */
  async validatePath(path) {
    try {
      const result = await window.knowledgeBase.invoke('fs.validatePath', path);

      if (result.success && result.data.valid) {
        this.enableCompleteButton();
        this.hideError();
      } else {
        this.showError('Selected path is not valid or not writable');
        this.disableCompleteButton();
      }
    } catch (error) {
      this.showError('Path validation failed: ' + error.message);
      this.disableCompleteButton();
    }
  }

  /**
   * Update the displayed selected path
   * @param {string} path - Selected path
   */
  updateSelectedPath(path) {
    const pathLabel = document.querySelector('#selected-path .path-label');
    if (pathLabel) {
      pathLabel.textContent = path;
      pathLabel.classList.add('path-selected');
    }
  }

  /**
   * Enable the complete setup button
   */
  enableCompleteButton() {
    const btn = document.getElementById('complete-setup-btn');
    if (btn) {
      btn.disabled = false;
    }
  }

  /**
   * Disable the complete setup button
   */
  disableCompleteButton() {
    const btn = document.getElementById('complete-setup-btn');
    if (btn) {
      btn.disabled = true;
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDiv = document.getElementById('setup-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    const errorDiv = document.getElementById('setup-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  /**
   * Complete the setup process
   */
  async completeSetup() {
    if (!this.selectedPath) {
      this.showError('Please select a storage location');
      return;
    }

    const completeBtn = document.getElementById('complete-setup-btn');
    completeBtn.disabled = true;
    completeBtn.textContent = 'Setting up...';

    try {
      // Set storage location and initialize
      const result = await window.knowledgeBase.invoke(
        'config.setStorageLocation',
        this.selectedPath
      );

      if (result.success) {
        // Setup complete, redirect to main app
        window.location.hash = '#/notes';
        
        // Dispatch custom event to notify app
        window.dispatchEvent(new CustomEvent('setup-complete'));
      } else {
        throw new Error(result.error || 'Setup failed');
      }
    } catch (error) {
      this.showError('Setup failed: ' + error.message);
      completeBtn.disabled = false;
      completeBtn.textContent = 'Complete Setup';
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
