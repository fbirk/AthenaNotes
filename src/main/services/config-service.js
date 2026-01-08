import { fileService } from './file-service.js';

/**
 * Configuration Service
 * Manages application configuration and storage initialization.
 */

class ConfigService {
  constructor() {
    this.config = null;
  }

  /**
   * Get current configuration
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      this.config = await fileService.readConfig();
      return this.config;
    } catch (error) {
      if (error.message === 'CONFIG_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update configuration preferences
   * @param {Object} updates - Preference updates
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(updates) {
    const config = await this.getConfig();
    
    if (!config) {
      throw new Error('CONFIG_NOT_FOUND');
    }

    // Validate updates
    if (updates.preferences) {
      if (updates.preferences.theme && !['light', 'dark'].includes(updates.preferences.theme)) {
        throw new Error('VALIDATION_ERROR: Invalid theme');
      }

      if (updates.preferences.defaultView && 
          !['notes', 'projects', 'snippets', 'tools'].includes(updates.preferences.defaultView)) {
        throw new Error('VALIDATION_ERROR: Invalid defaultView');
      }

      if (updates.preferences.editorFontSize !== undefined) {
        const fontSize = Number(updates.preferences.editorFontSize);
        if (isNaN(fontSize) || fontSize < 10 || fontSize > 24) {
          throw new Error('VALIDATION_ERROR: editorFontSize must be between 10 and 24');
        }
      }
    }

    // Merge updates
    config.preferences = {
      ...config.preferences,
      ...updates.preferences,
    };

    config.lastModified = new Date().toISOString();

    await fileService.writeConfig(config);
    this.config = config;

    return config;
  }

  /**
   * Set storage location and initialize storage structure
   * @param {string} storagePath - Absolute path to storage folder
   * @returns {Promise<Object>} Initialization result
   */
  async setStorageLocation(storagePath) {
    // Validate path
    const isValid = await fileService.validatePath(storagePath);
    if (!isValid) {
      throw new Error('INVALID_PATH');
    }

    try {
      // Initialize file service with new storage path
      await fileService.initialize(storagePath);

      // Check if config already exists
      let config;
      try {
        config = await fileService.readConfig();
        // Config exists, update storage location
        config.storageLocation = storagePath;
        config.lastModified = new Date().toISOString();
        await fileService.writeConfig(config);
      } catch (error) {
        if (error.message === 'CONFIG_NOT_FOUND') {
          // First-time setup, create new config
          config = await fileService.createInitialConfig(storagePath);
        } else {
          throw error;
        }
      }

      // Initialize storage structure
      await this.initializeStorage(storagePath);

      this.config = config;

      return {
        storageLocation: storagePath,
        initialized: true,
      };
    } catch (error) {
      if (error.message === 'INVALID_PATH' || error.message === 'WRITE_ERROR') {
        throw error;
      }
      throw new Error('INITIALIZATION_ERROR');
    }
  }

  /**
   * Initialize storage directory structure
   * @param {string} storagePath - Storage root path
   */
  async initializeStorage(storagePath) {
    // Create required directories
    const directories = [
      '.knowledgebase',
      'notes',
      'snippets',
    ];

    for (const dir of directories) {
      await fileService.ensureDirectoryExists(`${storagePath}/${dir}`);
    }

    // Initialize empty JSON files if they don't exist
    const jsonFiles = ['projects.json', 'todos.json', 'milestones.json', 'tools.json'];

    for (const filename of jsonFiles) {
      const data = await fileService.readJSON(filename);
      if (data === null) {
        // File doesn't exist, create with empty structure
        const emptyStructure = this.getEmptyStructure(filename);
        await fileService.writeJSON(filename, emptyStructure);
      }
    }
  }

  /**
   * Get empty structure for a JSON file
   * @param {string} filename - JSON filename
   * @returns {Object} Empty structure
   */
  getEmptyStructure(filename) {
    const structures = {
      'projects.json': { projects: [] },
      'todos.json': { todos: [] },
      'milestones.json': { milestones: [] },
      'tools.json': { tools: [] },
    };

    return structures[filename] || {};
  }

  /**
   * Check if the application is initialized (has configuration)
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    const config = await this.getConfig();
    return config !== null;
  }

  /**
   * Get storage location
   * @returns {Promise<string|null>} Storage path or null if not initialized
   */
  async getStorageLocation() {
    const config = await this.getConfig();
    return config ? config.storageLocation : null;
  }
}

// Export singleton instance
export const configService = new ConfigService();
