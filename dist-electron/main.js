import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { randomFillSync, randomUUID } from "node:crypto";
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID };
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
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
    this.configPath = path.join(storagePath, ".knowledgebase", "config.json");
    await this.ensureDirectoryExists(path.join(storagePath, ".knowledgebase"));
    await this.ensureDirectoryExists(path.join(storagePath, "notes"));
    await this.ensureDirectoryExists(path.join(storagePath, "snippets"));
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
      const data = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("CONFIG_NOT_FOUND");
      }
      throw new Error("CONFIG_PARSE_ERROR");
    }
  }
  /**
   * Write configuration file
   * @param {Object} config - Configuration object
   */
  async writeConfig(config) {
    try {
      await this.ensureDirectoryExists(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      throw new Error("WRITE_ERROR");
    }
  }
  /**
   * Create initial configuration
   * @param {string} storagePath - Storage location path
   * @returns {Promise<Object>} Initial configuration
   */
  async createInitialConfig(storagePath) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const config = {
      version: "1.0.0",
      storageLocation: storagePath,
      createdAt: now,
      lastModified: now,
      preferences: {
        theme: "light",
        defaultView: "notes",
        editorFontSize: 14,
        todosPanelCollapsed: false
      }
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
  async listNotes(projectFolder = "") {
    const notesDir = path.join(this.storageRoot, "notes", projectFolder);
    try {
      await this.ensureDirectoryExists(notesDir);
      const files = await this.readDirectoryRecursive(notesDir);
      const notes = [];
      for (const file of files) {
        if (path.extname(file) === ".md") {
          try {
            const note = await this.readNote(file);
            notes.push({
              id: note.id,
              title: note.title,
              createdAt: note.createdAt,
              modifiedAt: note.modifiedAt,
              projectId: note.projectId || null,
              tags: note.tags || [],
              filePath: file
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
      const content = await fs.readFile(filePath, "utf-8");
      const { frontmatter, body } = this.parseFrontmatter(content);
      return {
        id: frontmatter.id,
        title: frontmatter.title,
        createdAt: frontmatter.createdAt,
        modifiedAt: frontmatter.modifiedAt,
        projectId: frontmatter.projectId || null,
        tags: frontmatter.tags || [],
        content: body,
        filePath
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("NOTE_NOT_FOUND");
      }
      throw new Error("READ_ERROR");
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
    const frontmatter = {};
    const lines = frontmatterYaml.split("\n");
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1).split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
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
        modifiedAt: note.modifiedAt
      };
      if (note.projectId) {
        frontmatter.projectId = note.projectId;
      }
      if (note.tags && note.tags.length > 0) {
        frontmatter.tags = note.tags;
      }
      const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map((v) => `"${v}"`).join(", ")}]`;
        }
        return `${key}: "${value}"`;
      });
      const content = `---
${yamlLines.join("\n")}
---

${note.content}`;
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new Error("WRITE_ERROR");
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
      if (error.code === "ENOENT") {
        throw new Error("NOTE_NOT_FOUND");
      }
      throw new Error("DELETE_ERROR");
    }
  }
  /**
   * Generate a safe filename from a title
   * @param {string} title - Note title
   * @returns {string} Safe filename (slugified)
   */
  slugify(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note
   */
  async createNote(noteData) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = v4();
    const slug = this.slugify(noteData.title);
    const folderPath = noteData.projectId ? path.join(this.storageRoot, "notes", noteData.projectId) : path.join(this.storageRoot, "notes");
    const filePath = path.join(folderPath, `${slug}.md`);
    try {
      await fs.access(filePath);
      throw new Error("DUPLICATE_TITLE");
    } catch (error) {
      if (error.message === "DUPLICATE_TITLE") {
        throw error;
      }
    }
    const note = {
      id,
      title: noteData.title,
      content: noteData.content || "",
      createdAt: now,
      modifiedAt: now,
      projectId: noteData.projectId || null,
      tags: noteData.tags || []
    };
    await this.writeNote(filePath, note);
    return {
      id,
      title: note.title,
      createdAt: note.createdAt,
      modifiedAt: note.modifiedAt,
      projectId: note.projectId,
      tags: note.tags,
      filePath
    };
  }
  // ==================== JSON Storage Operations ====================
  /**
   * Read a JSON file
   * @param {string} filename - Filename (e.g., 'projects.json')
   * @returns {Promise<Object>} Parsed JSON data
   */
  async readJSON(filename) {
    const filePath = path.join(this.storageRoot, ".knowledgebase", filename);
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw new Error("JSON_PARSE_ERROR");
    }
  }
  /**
   * Write a JSON file
   * @param {string} filename - Filename (e.g., 'projects.json')
   * @param {Object} data - Data to write
   */
  async writeJSON(filename, data) {
    const filePath = path.join(this.storageRoot, ".knowledgebase", filename);
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      throw new Error("WRITE_ERROR");
    }
  }
}
const fileService = new FileService();
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
      if (error.message === "CONFIG_NOT_FOUND") {
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
      throw new Error("CONFIG_NOT_FOUND");
    }
    if (updates.preferences) {
      if (updates.preferences.theme && !["light", "dark"].includes(updates.preferences.theme)) {
        throw new Error("VALIDATION_ERROR: Invalid theme");
      }
      if (updates.preferences.defaultView && !["notes", "projects", "snippets", "tools"].includes(updates.preferences.defaultView)) {
        throw new Error("VALIDATION_ERROR: Invalid defaultView");
      }
      if (updates.preferences.editorFontSize !== void 0) {
        const fontSize = Number(updates.preferences.editorFontSize);
        if (isNaN(fontSize) || fontSize < 10 || fontSize > 24) {
          throw new Error("VALIDATION_ERROR: editorFontSize must be between 10 and 24");
        }
      }
    }
    config.preferences = {
      ...config.preferences,
      ...updates.preferences
    };
    config.lastModified = (/* @__PURE__ */ new Date()).toISOString();
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
    const isValid = await fileService.validatePath(storagePath);
    if (!isValid) {
      throw new Error("INVALID_PATH");
    }
    try {
      await fileService.initialize(storagePath);
      let config;
      try {
        config = await fileService.readConfig();
        config.storageLocation = storagePath;
        config.lastModified = (/* @__PURE__ */ new Date()).toISOString();
        await fileService.writeConfig(config);
      } catch (error) {
        if (error.message === "CONFIG_NOT_FOUND") {
          config = await fileService.createInitialConfig(storagePath);
        } else {
          throw error;
        }
      }
      await this.initializeStorage(storagePath);
      this.config = config;
      return {
        storageLocation: storagePath,
        initialized: true
      };
    } catch (error) {
      if (error.message === "INVALID_PATH" || error.message === "WRITE_ERROR") {
        throw error;
      }
      throw new Error("INITIALIZATION_ERROR");
    }
  }
  /**
   * Initialize storage directory structure
   * @param {string} storagePath - Storage root path
   */
  async initializeStorage(storagePath) {
    const directories = [
      ".knowledgebase",
      "notes",
      "snippets"
    ];
    for (const dir of directories) {
      await fileService.ensureDirectoryExists(`${storagePath}/${dir}`);
    }
    const jsonFiles = ["projects.json", "todos.json", "milestones.json", "tools.json"];
    for (const filename of jsonFiles) {
      const data = await fileService.readJSON(filename);
      if (data === null) {
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
      "projects.json": { projects: [] },
      "todos.json": { todos: [] },
      "milestones.json": { milestones: [] },
      "tools.json": { tools: [] }
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
const configService = new ConfigService();
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
function setupIpcHandlers() {
  ipcMain.handle("config.get", async () => {
    try {
      const config = await configService.getConfig();
      if (!config) {
        return { success: false, error: "CONFIG_NOT_FOUND" };
      }
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("config.update", async (_event, updates) => {
    try {
      const config = await configService.updateConfig(updates);
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("config.setStorageLocation", async (_event, storagePath) => {
    try {
      const result = await configService.setStorageLocation(storagePath);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("fs.selectFolder", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        title: "Select Knowledge Base Storage Location"
      });
      if (result.canceled) {
        return { success: false, error: "CANCELLED" };
      }
      return { success: true, data: { path: result.filePaths[0] } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("fs.validatePath", async (_event, targetPath) => {
    try {
      const isValid = await fileService.validatePath(targetPath);
      return { success: true, data: { valid: isValid } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.list", async (_event, options = {}) => {
    try {
      const projectFolder = options.projectId || "";
      let notes = await fileService.listNotes(projectFolder);
      const sortBy = options.sortBy || "modifiedAt";
      const sortOrder = options.sortOrder || "desc";
      notes.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      return { success: true, data: notes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.get", async (_event, id) => {
    try {
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find((n) => n.id === id);
      if (!noteMetadata) {
        return { success: false, error: "NOTE_NOT_FOUND" };
      }
      const note = await fileService.readNote(noteMetadata.filePath);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.create", async (_event, noteData) => {
    try {
      if (!noteData.title || noteData.title.trim() === "") {
        return { success: false, error: "VALIDATION_ERROR: Title cannot be empty" };
      }
      if (/[/\\:*?"<>|]/.test(noteData.title)) {
        return { success: false, error: "VALIDATION_ERROR: Title contains invalid characters" };
      }
      const note = await fileService.createNote(noteData);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.update", async (_event, { id, updates }) => {
    try {
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find((n) => n.id === id);
      if (!noteMetadata) {
        return { success: false, error: "NOTE_NOT_FOUND" };
      }
      const note = await fileService.readNote(noteMetadata.filePath);
      const updatedNote = {
        ...note,
        ...updates,
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      let newFilePath = noteMetadata.filePath;
      if (updates.title && updates.title !== note.title) {
        const newSlug = fileService.slugify(updates.title);
        const dir = path.dirname(noteMetadata.filePath);
        newFilePath = path.join(dir, `${newSlug}.md`);
        await fileService.deleteNote(noteMetadata.filePath);
      }
      await fileService.writeNote(newFilePath, updatedNote);
      return {
        success: true,
        data: {
          ...updatedNote,
          filePath: newFilePath
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.delete", async (_event, id) => {
    try {
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find((n) => n.id === id);
      if (!noteMetadata) {
        return { success: false, error: "NOTE_NOT_FOUND" };
      }
      const referencingNotes = [];
      for (const otherNote of notes) {
        if (otherNote.id === id) continue;
        const fullNote = await fileService.readNote(otherNote.filePath);
        if (fullNote.content.includes(`[[${noteMetadata.title}]]`)) {
          referencingNotes.push(otherNote.id);
        }
      }
      await fileService.deleteNote(noteMetadata.filePath);
      return {
        success: true,
        data: {
          deleted: true,
          referencingNotes
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("notes.search", async (_event, { query, projectId }) => {
    try {
      const notes = await fileService.listNotes(projectId || "");
      const results = [];
      for (const noteMetadata of notes) {
        const note = await fileService.readNote(noteMetadata.filePath);
        const searchText = `${note.title} ${note.content}`.toLowerCase();
        const queryLower = query.toLowerCase();
        if (searchText.includes(queryLower)) {
          const contentLower = note.content.toLowerCase();
          const index = contentLower.indexOf(queryLower);
          let snippet = "";
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(note.content.length, index + query.length + 50);
            snippet = "..." + note.content.substring(start, end) + "...";
          } else {
            snippet = note.content.substring(0, 100) + "...";
          }
          results.push({
            id: note.id,
            title: note.title,
            snippet,
            relevance: searchText.split(queryLower).length - 1
          });
        }
      }
      results.sort((a, b) => b.relevance - a.relevance);
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
