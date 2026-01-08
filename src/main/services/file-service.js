import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * File Service
 * Handles all file system operations for the knowledge base application.
 * Supports notes (markdown files), configuration, and JSON data storage.
 */

class FileService {
  constructor() {
    this.storageRoot = null;
    this.configPath = null;
  }

  /**
   * Initialize the file service with storage location
   * @param {string} storagePath - Absolute path to storage root
   */
  async initialize(storagePath) {
    this.storageRoot = storagePath;
    this.configPath = path.join(storagePath, '.knowledgebase', 'config.json');
    
    // Ensure base directories exist
    await this.ensureDirectoryExists(path.join(storagePath, '.knowledgebase'));
    await this.ensureDirectoryExists(path.join(storagePath, 'notes'));
    await this.ensureDirectoryExists(path.join(storagePath, 'snippets'));
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * @param {string} dirPath - Absolute path to directory
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Validate a path exists and is writable
   * @param {string} targetPath - Path to validate
   * @returns {Promise<boolean>}
   */
  async validatePath(targetPath) {
    try {
      await fs.access(targetPath, fs.constants.W_OK);
      const stats = await fs.stat(targetPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  // ==================== Configuration Operations ====================

  /**
   * Read configuration file
   * @returns {Promise<Object>} Configuration object
   */
  async readConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('CONFIG_NOT_FOUND');
      }
      throw new Error('CONFIG_PARSE_ERROR');
    }
  }

  /**
   * Write configuration file
   * @param {Object} config - Configuration object
   */
  async writeConfig(config) {
    try {
      await this.ensureDirectoryExists(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error('WRITE_ERROR');
    }
  }

  /**
   * Create initial configuration
   * @param {string} storagePath - Storage location path
   * @returns {Promise<Object>} Initial configuration
   */
  async createInitialConfig(storagePath) {
    const now = new Date().toISOString();
    const config = {
      version: '1.0.0',
      storageLocation: storagePath,
      createdAt: now,
      lastModified: now,
      preferences: {
        theme: 'light',
        defaultView: 'notes',
        editorFontSize: 14,
        todosPanelCollapsed: false,
      },
    };

    await this.initialize(storagePath);
    await this.writeConfig(config);
    return config;
  }

  // ==================== Note Operations ====================

  /**
   * List all note files
   * @param {string} [projectFolder] - Optional subfolder path
   * @returns {Promise<Array>} Array of note metadata
   */
  async listNotes(projectFolder = '') {
    const notesDir = path.join(this.storageRoot, 'notes', projectFolder);
    
    try {
      await this.ensureDirectoryExists(notesDir);
      const files = await this.readDirectoryRecursive(notesDir);
      const notes = [];

      for (const file of files) {
        if (path.extname(file) === '.md') {
          try {
            const note = await this.readNote(file);
            notes.push({
              id: note.id,
              title: note.title,
              createdAt: note.createdAt,
              modifiedAt: note.modifiedAt,
              projectId: note.projectId || null,
              tags: note.tags || [],
              filePath: file,
            });
          } catch (error) {
            console.error(`Error reading note ${file}:`, error);
          }
        }
      }

      return notes;
    } catch (error) {
      return [];
    }
  }

  /**
   * Read directory recursively
   * @param {string} dirPath - Directory to read
   * @returns {Promise<Array<string>>} Array of absolute file paths
   */
  async readDirectoryRecursive(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        return entry.isDirectory() ? this.readDirectoryRecursive(fullPath) : fullPath;
      })
    );
    return files.flat();
  }

  /**
   * Read a note file with frontmatter parsing
   * @param {string} filePath - Absolute path to note file
   * @returns {Promise<Object>} Note object
   */
  async readNote(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { frontmatter, body } = this.parseFrontmatter(content);

      return {
        id: frontmatter.id,
        title: frontmatter.title,
        createdAt: frontmatter.createdAt,
        modifiedAt: frontmatter.modifiedAt,
        projectId: frontmatter.projectId || null,
        tags: frontmatter.tags || [],
        content: body,
        filePath,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('NOTE_NOT_FOUND');
      }
      throw new Error('READ_ERROR');
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   * @param {string} content - Full markdown content
   * @returns {Object} { frontmatter: Object, body: string }
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterYaml = match[1];
    const body = match[2];

    // Simple YAML parser for our specific use case
    const frontmatter = {};
    const lines = frontmatterYaml.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^["']|["']$/g, ''));
      }

      frontmatter[key] = value;
    }

    return { frontmatter, body };
  }

  /**
   * Write a note file with frontmatter
   * @param {string} filePath - Absolute path to note file
   * @param {Object} note - Note object
   */
  async writeNote(filePath, note) {
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));

      const frontmatter = {
        id: note.id,
        title: note.title,
        createdAt: note.createdAt,
        modifiedAt: note.modifiedAt,
      };

      if (note.projectId) {
        frontmatter.projectId = note.projectId;
      }

      if (note.tags && note.tags.length > 0) {
        frontmatter.tags = note.tags;
      }

      const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: "${value}"`;
      });

      const content = `---\n${yamlLines.join('\n')}\n---\n\n${note.content}`;
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error('WRITE_ERROR');
    }
  }

  /**
   * Delete a note file
   * @param {string} filePath - Absolute path to note file
   */
  async deleteNote(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('NOTE_NOT_FOUND');
      }
      throw new Error('DELETE_ERROR');
    }
  }

  /**
   * Generate a safe filename from a title
   * @param {string} title - Note title
   * @returns {string} Safe filename (slugified)
   */
  slugify(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate a unique ID
   * @returns {string} UUID
   */
  generateId() {
    return uuidv4();
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note
   */
  async createNote(noteData) {
    const now = new Date().toISOString();
    const id = uuidv4();
    const slug = this.slugify(noteData.title);
    
    const folderPath = noteData.projectId
      ? path.join(this.storageRoot, 'notes', noteData.projectId)
      : path.join(this.storageRoot, 'notes');

    const filePath = path.join(folderPath, `${slug}.md`);

    // Check if file already exists
    try {
      await fs.access(filePath);
      throw new Error('DUPLICATE_TITLE');
    } catch (error) {
      if (error.message === 'DUPLICATE_TITLE') {
        throw error;
      }
      // File doesn't exist, which is what we want
    }

    const note = {
      id,
      title: noteData.title,
      content: noteData.content || '',
      createdAt: now,
      modifiedAt: now,
      projectId: noteData.projectId || null,
      tags: noteData.tags || [],
    };

    await this.writeNote(filePath, note);

    return {
      id,
      title: note.title,
      createdAt: note.createdAt,
      modifiedAt: note.modifiedAt,
      projectId: note.projectId,
      tags: note.tags,
      filePath,
    };
  }

  // ==================== JSON Storage Operations ====================

  /**
   * Read a JSON file
   * @param {string} filename - Filename (e.g., 'projects.json')
   * @returns {Promise<Object>} Parsed JSON data
   */
  async readJSON(filename) {
    const filePath = path.join(this.storageRoot, '.knowledgebase', filename);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error('JSON_PARSE_ERROR');
    }
  }

  /**
   * Write a JSON file
   * @param {string} filename - Filename (e.g., 'projects.json')
   * @param {Object} data - Data to write
   */
  async writeJSON(filename, data) {
    const filePath = path.join(this.storageRoot, '.knowledgebase', filename);
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error('WRITE_ERROR');
    }
  }

  // ==================== Project Folder Operations ====================

  /**
   * Create a project folder
   * @param {string} folderName - Project folder name (slugified)
   */
  async createProjectFolder(folderName) {
    const notesDir = path.join(this.storageRoot, 'notes', folderName);
    try {
      await this.ensureDirectoryExists(notesDir);
    } catch (error) {
      throw new Error('FOLDER_CREATE_ERROR');
    }
  }

  /**
   * Rename a project folder
   * @param {string} oldName - Old folder name
   * @param {string} newName - New folder name
   */
  async renameProjectFolder(oldName, newName) {
    const oldPath = path.join(this.storageRoot, 'notes', oldName);
    const newPath = path.join(this.storageRoot, 'notes', newName);
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('FOLDER_NOT_FOUND');
      }
      throw new Error('FOLDER_RENAME_ERROR');
    }
  }

  /**
   * Delete a project folder and all its contents
   * @param {string} folderName - Project folder name
   */
  async deleteProjectFolder(folderName) {
    const folderPath = path.join(this.storageRoot, 'notes', folderName);
    try {
      await fs.rm(folderPath, { recursive: true, force: true });
    } catch (error) {
      throw new Error('FOLDER_DELETE_ERROR');
    }
  }
}

// Export singleton instance
export const fileService = new FileService();
