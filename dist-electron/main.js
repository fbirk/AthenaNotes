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
  // ==================== Snippet Operations ====================
  /**
   * List all code snippets
   * @returns {Promise<Array>} Array of snippet metadata
   */
  async listSnippets() {
    const snippetsDir = path.join(this.storageRoot, "snippets");
    await this.ensureDirectoryExists(snippetsDir);
    const files = await fs.readdir(snippetsDir);
    const snippets = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const snippet = await this.getSnippetByFile(path.join(snippetsDir, file));
          snippets.push(snippet);
        } catch {
        }
      }
    }
    return snippets;
  }
  /**
   * Get a single snippet by ID
   * @param {string} id - Snippet UUID
   * @returns {Promise<Object>} Snippet object
   */
  async getSnippet(id) {
    const snippetsDir = path.join(this.storageRoot, "snippets");
    await this.ensureDirectoryExists(snippetsDir);
    const files = await fs.readdir(snippetsDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(snippetsDir, file);
        const snippet = await this.getSnippetByFile(filePath);
        if (snippet.id === id) {
          return snippet;
        }
      }
    }
    throw new Error("SNIPPET_NOT_FOUND");
  }
  /**
   * Helper: Read snippet JSON file by path
   */
  async getSnippetByFile(filePath) {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  }
  /**
   * Create a new snippet
   * @param {Object} snippetData
   * @returns {Promise<Object>} Created snippet
   */
  async createSnippet(snippetData) {
    if (!snippetData.title || !snippetData.title.trim()) throw new Error("VALIDATION_ERROR");
    if (!snippetData.language || !snippetData.language.trim()) throw new Error("VALIDATION_ERROR");
    if (!snippetData.code || !snippetData.code.trim()) throw new Error("VALIDATION_ERROR");
    if (!snippetData.tags || typeof snippetData.tags !== "object") throw new Error("VALIDATION_ERROR");
    if (!Object.values(snippetData.tags).flat().length) throw new Error("VALIDATION_ERROR");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = v4();
    const fileName = `${id}.json`;
    const snippetsDir = path.join(this.storageRoot, "snippets");
    await this.ensureDirectoryExists(snippetsDir);
    const snippet = {
      id,
      title: snippetData.title.trim(),
      description: snippetData.description?.trim() || "",
      language: snippetData.language.trim().toLowerCase(),
      code: snippetData.code,
      tags: {
        language: (snippetData.tags.language || []).map((t) => t.toLowerCase()),
        usage: (snippetData.tags.usage || []).map((t) => t.toLowerCase()),
        module: (snippetData.tags.module || []).map((t) => t.toLowerCase())
      },
      createdAt: now,
      modifiedAt: now
    };
    const filePath = path.join(snippetsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(snippet, null, 2), "utf-8");
    return snippet;
  }
  /**
   * Update an existing snippet
   * @param {string} id - Snippet UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated snippet
   */
  async updateSnippet(id, updates) {
    const snippet = await this.getSnippet(id);
    let changed = false;
    if (updates.title && updates.title.trim() && updates.title !== snippet.title) {
      snippet.title = updates.title.trim();
      changed = true;
    }
    if (typeof updates.description === "string" && updates.description !== snippet.description) {
      snippet.description = updates.description.trim();
      changed = true;
    }
    if (updates.language && updates.language.trim() && updates.language !== snippet.language) {
      snippet.language = updates.language.trim().toLowerCase();
      changed = true;
    }
    if (updates.code && updates.code !== snippet.code) {
      snippet.code = updates.code;
      changed = true;
    }
    if (updates.tags && typeof updates.tags === "object") {
      snippet.tags = {
        language: (updates.tags.language || snippet.tags.language || []).map((t) => t.toLowerCase()),
        usage: (updates.tags.usage || snippet.tags.usage || []).map((t) => t.toLowerCase()),
        module: (updates.tags.module || snippet.tags.module || []).map((t) => t.toLowerCase())
      };
      changed = true;
    }
    if (changed) {
      snippet.modifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      const snippetsDir = path.join(this.storageRoot, "snippets");
      const filePath = path.join(snippetsDir, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(snippet, null, 2), "utf-8");
    }
    return snippet;
  }
  /**
   * Delete a snippet by ID
   * @param {string} id - Snippet UUID
   */
  async deleteSnippet(id) {
    const snippetsDir = path.join(this.storageRoot, "snippets");
    const filePath = path.join(snippetsDir, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === "ENOENT") throw new Error("SNIPPET_NOT_FOUND");
      throw new Error("DELETE_ERROR");
    }
  }
  /**
   * Search snippets by keyword and tags
   * @param {string} query - Search term
   * @param {object} tagFilters - { language: [], usage: [], module: [] }
   * @returns {Promise<Array>} Matching snippets
   */
  async searchSnippets(query, tagFilters = {}) {
    const all = await this.listSnippets();
    let results = all;
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        (snippet) => snippet.title.toLowerCase().includes(q) || snippet.description.toLowerCase().includes(q) || snippet.code.toLowerCase().includes(q)
      );
    }
    for (const cat of ["language", "usage", "module"]) {
      if (tagFilters[cat] && tagFilters[cat].length) {
        results = results.filter(
          (snippet) => tagFilters[cat].every((tag) => (snippet.tags[cat] || []).includes(tag.toLowerCase()))
        );
      }
    }
    results.sort((a, b) => (b.modifiedAt || "").localeCompare(a.modifiedAt || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
    return results;
  }
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
    } catch {
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
    } catch {
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
    } catch {
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
   * Generate a unique ID
   * @returns {string} UUID
   */
  generateId() {
    return v4();
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
    } catch {
      throw new Error("WRITE_ERROR");
    }
  }
  // ==================== Project Folder Operations ====================
  /**
   * Create a project folder
   * @param {string} folderName - Project folder name (slugified)
   */
  async createProjectFolder(folderName) {
    const notesDir = path.join(this.storageRoot, "notes", folderName);
    try {
      await this.ensureDirectoryExists(notesDir);
    } catch {
      throw new Error("FOLDER_CREATE_ERROR");
    }
  }
  /**
   * Rename a project folder
   * @param {string} oldName - Old folder name
   * @param {string} newName - New folder name
   */
  async renameProjectFolder(oldName, newName) {
    const oldPath = path.join(this.storageRoot, "notes", oldName);
    const newPath = path.join(this.storageRoot, "notes", newName);
    try {
      await fs.rename(oldPath, newPath);
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new Error("FOLDER_NOT_FOUND");
      }
      throw new Error("FOLDER_RENAME_ERROR");
    }
  }
  /**
   * Delete a project folder and all its contents
   * @param {string} folderName - Project folder name
   */
  async deleteProjectFolder(folderName) {
    const folderPath = path.join(this.storageRoot, "notes", folderName);
    try {
      await fs.rm(folderPath, { recursive: true, force: true });
    } catch {
      throw new Error("FOLDER_DELETE_ERROR");
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
    ipcMain.handle("snippets.list", async () => {
      try {
        const snippets = await fileService.listSnippets();
        return { success: true, data: snippets };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("snippets.get", async (_event, id) => {
      try {
        const snippet = await fileService.getSnippet(id);
        return { success: true, data: snippet };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("snippets.create", async (_event, snippetData) => {
      try {
        const snippet = await fileService.createSnippet(snippetData);
        return { success: true, data: snippet };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("snippets.update", async (_event, id, updates) => {
      try {
        const snippet = await fileService.updateSnippet(id, updates);
        return { success: true, data: snippet };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("snippets.delete", async (_event, id) => {
      try {
        await fileService.deleteSnippet(id);
        return { success: true, data: { deleted: true } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("snippets.search", async (_event, query, tagFilters) => {
      try {
        const results = await fileService.searchSnippets(query, tagFilters);
        return { success: true, data: results };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
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
  ipcMain.handle("todos.list", async () => {
    try {
      const data = await fileService.readJSON("todos.json");
      const todos = data?.todos || [];
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      todos.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.deadline && b.deadline) {
          return new Date(a.deadline) - new Date(b.deadline);
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      });
      return { success: true, data: todos };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("todos.create", async (_event, todoData) => {
    try {
      const data = await fileService.readJSON("todos.json") || { todos: [] };
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const newTodo = {
        id: fileService.generateId(),
        title: todoData.title,
        description: todoData.description || "",
        priority: todoData.priority || "medium",
        deadline: todoData.deadline || null,
        completed: false,
        completedAt: null,
        projectId: todoData.projectId || null,
        createdAt: now,
        modifiedAt: now
      };
      data.todos.push(newTodo);
      await fileService.writeJSON("todos.json", data);
      return { success: true, data: newTodo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("todos.update", async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON("todos.json");
      if (!data || !data.todos) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      const todoIndex = data.todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      data.todos[todoIndex] = {
        ...data.todos[todoIndex],
        ...updates,
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fileService.writeJSON("todos.json", data);
      return { success: true, data: data.todos[todoIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("todos.toggleComplete", async (_event, id) => {
    try {
      const data = await fileService.readJSON("todos.json");
      if (!data || !data.todos) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      const todoIndex = data.todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      const todo = data.todos[todoIndex];
      todo.completed = !todo.completed;
      todo.completedAt = todo.completed ? (/* @__PURE__ */ new Date()).toISOString() : null;
      todo.modifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      await fileService.writeJSON("todos.json", data);
      return { success: true, data: todo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("todos.delete", async (_event, id) => {
    try {
      const data = await fileService.readJSON("todos.json");
      if (!data || !data.todos) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      const todoIndex = data.todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: "TODO_NOT_FOUND" };
      }
      data.todos.splice(todoIndex, 1);
      await fileService.writeJSON("todos.json", data);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("projects.list", async () => {
    try {
      const data = await fileService.readJSON("projects.json");
      const projects = data?.projects || [];
      projects.sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: projects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("projects.get", async (_event, id) => {
    try {
      const data = await fileService.readJSON("projects.json");
      if (!data || !data.projects) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      const project = data.projects.find((p) => p.id === id);
      if (!project) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      const notes = await fileService.listNotes(project.folder);
      return {
        success: true,
        data: {
          ...project,
          notes
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("projects.create", async (_event, projectData) => {
    try {
      const data = await fileService.readJSON("projects.json");
      if (!data.projects) {
        data.projects = [];
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const folder = fileService.slugify(projectData.name);
      const newProject = {
        id: fileService.generateId(),
        name: projectData.name,
        description: projectData.description || "",
        folder,
        createdAt: now,
        modifiedAt: now
      };
      await fileService.createProjectFolder(folder);
      data.projects.push(newProject);
      await fileService.writeJSON("projects.json", data);
      return { success: true, data: newProject };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("projects.update", async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON("projects.json");
      if (!data || !data.projects) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      const projectIndex = data.projects.findIndex((p) => p.id === id);
      if (projectIndex === -1) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      let newFolder = data.projects[projectIndex].folder;
      if (updates.name && updates.name !== data.projects[projectIndex].name) {
        const oldFolder = data.projects[projectIndex].folder;
        newFolder = fileService.slugify(updates.name);
        await fileService.renameProjectFolder(oldFolder, newFolder);
        updates.folder = newFolder;
      }
      data.projects[projectIndex] = {
        ...data.projects[projectIndex],
        ...updates,
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fileService.writeJSON("projects.json", data);
      return { success: true, data: data.projects[projectIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("projects.delete", async (_event, { id, deleteNotes = false }) => {
    try {
      const data = await fileService.readJSON("projects.json");
      if (!data || !data.projects) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      const projectIndex = data.projects.findIndex((p) => p.id === id);
      if (projectIndex === -1) {
        return { success: false, error: "PROJECT_NOT_FOUND" };
      }
      const project = data.projects[projectIndex];
      if (deleteNotes) {
        await fileService.deleteProjectFolder(project.folder);
      } else {
        const notes = await fileService.listNotes(project.folder);
        for (const note of notes) {
          const fullNote = await fileService.readNote(note.filePath);
          const rootPath = path.join(
            path.dirname(path.dirname(note.filePath)),
            path.basename(note.filePath)
          );
          await fileService.deleteNote(note.filePath);
          await fileService.writeNote(rootPath, { ...fullNote, projectId: null });
        }
        await fileService.deleteProjectFolder(project.folder);
      }
      const todosData = await fileService.readJSON("todos.json");
      if (todosData && todosData.todos) {
        todosData.todos.forEach((todo) => {
          if (todo.projectId === id) {
            todo.projectId = null;
          }
        });
        await fileService.writeJSON("todos.json", todosData);
      }
      data.projects.splice(projectIndex, 1);
      await fileService.writeJSON("projects.json", data);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("milestones.list", async (_event, projectId) => {
    try {
      const data = await fileService.readJSON("milestones.json");
      let milestones = data?.milestones || [];
      if (projectId) {
        milestones = milestones.filter((m) => m.projectId === projectId);
      }
      milestones.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      return { success: true, data: milestones };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("milestones.create", async (_event, milestoneData) => {
    try {
      const data = await fileService.readJSON("milestones.json") || { milestones: [] };
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const newMilestone = {
        id: fileService.generateId(),
        projectId: milestoneData.projectId,
        title: milestoneData.title,
        description: milestoneData.description || "",
        deadline: milestoneData.deadline,
        completed: false,
        completedAt: null,
        createdAt: now,
        modifiedAt: now
      };
      data.milestones.push(newMilestone);
      await fileService.writeJSON("milestones.json", data);
      return { success: true, data: newMilestone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("milestones.update", async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON("milestones.json");
      if (!data || !data.milestones) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      const milestoneIndex = data.milestones.findIndex((m) => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      data.milestones[milestoneIndex] = {
        ...data.milestones[milestoneIndex],
        ...updates,
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fileService.writeJSON("milestones.json", data);
      return { success: true, data: data.milestones[milestoneIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("milestones.toggleComplete", async (_event, id) => {
    try {
      const data = await fileService.readJSON("milestones.json");
      if (!data || !data.milestones) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      const milestoneIndex = data.milestones.findIndex((m) => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      const milestone = data.milestones[milestoneIndex];
      milestone.completed = !milestone.completed;
      milestone.completedAt = milestone.completed ? (/* @__PURE__ */ new Date()).toISOString() : null;
      milestone.modifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      await fileService.writeJSON("milestones.json", data);
      return { success: true, data: milestone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("milestones.delete", async (_event, id) => {
    try {
      const data = await fileService.readJSON("milestones.json");
      if (!data || !data.milestones) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      const milestoneIndex = data.milestones.findIndex((m) => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: "MILESTONE_NOT_FOUND" };
      }
      data.milestones.splice(milestoneIndex, 1);
      await fileService.writeJSON("milestones.json", data);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("tools.list", async () => {
    try {
      const data = await fileService.readJSON("tools.json");
      const tools = data?.tools || [];
      tools.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || "").localeCompare(b.category || "");
        }
        return a.name.localeCompare(b.name);
      });
      return { success: true, data: tools };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("tools.create", async (_event, toolData) => {
    try {
      const data = await fileService.readJSON("tools.json") || { tools: [] };
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const newTool = {
        id: fileService.generateId(),
        name: toolData.name,
        description: toolData.description || "",
        launchPath: toolData.launchPath,
        launchType: toolData.launchType || "application",
        category: toolData.category || "General",
        createdAt: now,
        modifiedAt: now
      };
      data.tools.push(newTool);
      await fileService.writeJSON("tools.json", data);
      return { success: true, data: newTool };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("tools.update", async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON("tools.json");
      if (!data || !data.tools) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      const toolIndex = data.tools.findIndex((t) => t.id === id);
      if (toolIndex === -1) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      data.tools[toolIndex] = {
        ...data.tools[toolIndex],
        ...updates,
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await fileService.writeJSON("tools.json", data);
      return { success: true, data: data.tools[toolIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("tools.delete", async (_event, id) => {
    try {
      const data = await fileService.readJSON("tools.json");
      if (!data || !data.tools) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      const toolIndex = data.tools.findIndex((t) => t.id === id);
      if (toolIndex === -1) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      data.tools.splice(toolIndex, 1);
      await fileService.writeJSON("tools.json", data);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("tools.launch", async (_event, id) => {
    try {
      const data = await fileService.readJSON("tools.json");
      if (!data || !data.tools) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      const tool = data.tools.find((t) => t.id === id);
      if (!tool) {
        return { success: false, error: "TOOL_NOT_FOUND" };
      }
      const { shell } = await import("electron");
      if (tool.launchType === "url") {
        await shell.openExternal(tool.launchPath);
      } else {
        await shell.openPath(tool.launchPath);
      }
      return { success: true, data: { launched: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
