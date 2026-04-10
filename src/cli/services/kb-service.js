/**
 * KnowledgeBase Service Adapter
 * Wraps existing file-service, config-service, and daily-todos-service
 * for direct use by CLI components (no IPC layer).
 * All methods return { success: boolean, data?: any, error?: string }.
 */
import { fileService } from '../../main/services/file-service.js';
import { configService } from '../../main/services/config-service.js';
import { dailyTodosService } from '../../main/services/daily-todos-service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize all services with the given storage path
 */
export async function initializeServices(storagePath) {
  await fileService.initialize(storagePath);
  await configService.setStorageLocation(storagePath);
  await dailyTodosService.initialize(storagePath);
}

function wrapResult(data) {
  return { success: true, data };
}

function wrapError(error) {
  return { success: false, error: error.message || String(error) };
}

// ==================== Config ====================

export async function getConfig() {
  try {
    const config = await configService.getConfig();
    return wrapResult(config);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateConfig(updates) {
  try {
    const config = await configService.updateConfig(updates);
    return wrapResult(config);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Notes ====================

export async function listNotes({ projectId, sortBy = 'modifiedAt', sortOrder = 'desc' } = {}) {
  try {
    let projectFolder = null;
    if (projectId) {
      const projects = await _readProjects();
      const project = projects.find(p => p.id === projectId);
      if (project) projectFolder = project.name;
    }
    const notes = await fileService.listNotes(projectFolder || undefined);

    // Sort
    notes.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'title') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return wrapResult(notes);
  } catch (error) {
    return wrapError(error);
  }
}

export async function getNote(noteId) {
  try {
    const allNotes = await fileService.listNotes();
    const noteMeta = allNotes.find(n => n.id === noteId);
    if (!noteMeta) return { success: false, error: 'Note not found' };
    const note = await fileService.readNote(noteMeta.filePath);
    return wrapResult(note);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createNote({ title, content = '', projectId = null }) {
  try {
    const note = await fileService.createNote({ title, content, projectId });
    return wrapResult(note);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateNote({ id, updates }) {
  try {
    const allNotes = await fileService.listNotes();
    const noteMeta = allNotes.find(n => n.id === id);
    if (!noteMeta) return { success: false, error: 'Note not found' };
    const note = await fileService.readNote(noteMeta.filePath);
    const updated = { ...note, ...updates, modifiedAt: new Date().toISOString() };
    await fileService.writeNote(noteMeta.filePath, updated);
    return wrapResult(updated);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteNote(noteId) {
  try {
    const allNotes = await fileService.listNotes();
    const noteMeta = allNotes.find(n => n.id === noteId);
    if (!noteMeta) return { success: false, error: 'Note not found' };
    await fileService.deleteNote(noteMeta.filePath);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Todos ====================

async function _readTodos() {
  const data = await fileService.readJSON('todos.json');
  return data.todos || [];
}

async function _writeTodos(todos) {
  await fileService.writeJSON('todos.json', { todos });
}

export async function listTodos() {
  try {
    const todos = await _readTodos();
    return wrapResult(todos);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createTodo({ title, description = '', priority = 'medium', projectId = null, deadline = null }) {
  try {
    const todos = await _readTodos();
    const now = new Date().toISOString();
    const todo = {
      id: uuidv4(),
      title,
      description,
      completed: false,
      priority,
      projectId,
      deadline,
      createdAt: now,
      modifiedAt: now,
    };
    todos.push(todo);
    await _writeTodos(todos);
    return wrapResult(todo);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateTodo({ id, updates }) {
  try {
    const todos = await _readTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) return { success: false, error: 'Todo not found' };
    todos[index] = { ...todos[index], ...updates, modifiedAt: new Date().toISOString() };
    await _writeTodos(todos);
    return wrapResult(todos[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function toggleTodoComplete(todoId) {
  try {
    const todos = await _readTodos();
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return { success: false, error: 'Todo not found' };
    todo.completed = !todo.completed;
    todo.modifiedAt = new Date().toISOString();
    await _writeTodos(todos);
    return wrapResult(todo);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteTodo(todoId) {
  try {
    const todos = await _readTodos();
    const filtered = todos.filter(t => t.id !== todoId);
    if (filtered.length === todos.length) return { success: false, error: 'Todo not found' };
    await _writeTodos(filtered);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Projects ====================

async function _readProjects() {
  const data = await fileService.readJSON('projects.json');
  return data.projects || [];
}

async function _writeProjects(projects) {
  await fileService.writeJSON('projects.json', { projects });
}

export async function listProjects() {
  try {
    const projects = await _readProjects();
    return wrapResult(projects);
  } catch (error) {
    return wrapError(error);
  }
}

export async function getProject(projectId) {
  try {
    const projects = await _readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };
    return wrapResult(project);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createProject({ name, description = '' }) {
  try {
    const projects = await _readProjects();
    const now = new Date().toISOString();
    const project = {
      id: uuidv4(),
      name,
      description,
      status: 'active',
      createdAt: now,
    };
    projects.push(project);
    await _writeProjects(projects);
    await fileService.createProjectFolder(name);
    return wrapResult(project);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateProject({ id, updates }) {
  try {
    const projects = await _readProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Project not found' };
    const oldName = projects[index].name;
    projects[index] = { ...projects[index], ...updates };
    await _writeProjects(projects);
    if (updates.name && updates.name !== oldName) {
      await fileService.renameProjectFolder(oldName, updates.name);
    }
    return wrapResult(projects[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteProject({ projectId, deleteNotes = false }) {
  try {
    const projects = await _readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Project not found' };
    const filtered = projects.filter(p => p.id !== projectId);
    await _writeProjects(filtered);
    if (deleteNotes) {
      await fileService.deleteProjectFolder(project.name);
    }
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Snippets ====================

export async function listSnippets() {
  try {
    const snippets = await fileService.listSnippets();
    return wrapResult(snippets);
  } catch (error) {
    return wrapError(error);
  }
}

export async function getSnippet(snippetId) {
  try {
    const snippet = await fileService.getSnippet(snippetId);
    return wrapResult(snippet);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createSnippet(data) {
  try {
    const snippet = await fileService.createSnippet(data);
    return wrapResult(snippet);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateSnippet({ id, updates }) {
  try {
    const snippet = await fileService.updateSnippet(id, updates);
    return wrapResult(snippet);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteSnippet(snippetId) {
  try {
    await fileService.deleteSnippet(snippetId);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

export async function searchSnippets(query = '', tagFilters = {}) {
  try {
    const results = await fileService.searchSnippets(query, tagFilters);
    return wrapResult(results);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Milestones ====================

async function _readMilestones() {
  const data = await fileService.readJSON('milestones.json');
  return data.milestones || [];
}

async function _writeMilestones(milestones) {
  await fileService.writeJSON('milestones.json', { milestones });
}

export async function listMilestones(projectId = null) {
  try {
    let milestones = await _readMilestones();
    if (projectId) {
      milestones = milestones.filter(m => m.projectId === projectId);
    }
    return wrapResult(milestones);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createMilestone({ title, projectId, deadline, description = '' }) {
  try {
    const milestones = await _readMilestones();
    const now = new Date().toISOString();
    const milestone = {
      id: uuidv4(),
      title,
      description,
      projectId,
      deadline,
      completed: false,
      createdAt: now,
    };
    milestones.push(milestone);
    await _writeMilestones(milestones);
    return wrapResult(milestone);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateMilestone({ id, updates }) {
  try {
    const milestones = await _readMilestones();
    const index = milestones.findIndex(m => m.id === id);
    if (index === -1) return { success: false, error: 'Milestone not found' };
    milestones[index] = { ...milestones[index], ...updates };
    await _writeMilestones(milestones);
    return wrapResult(milestones[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function toggleMilestoneComplete(milestoneId) {
  try {
    const milestones = await _readMilestones();
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return { success: false, error: 'Milestone not found' };
    milestone.completed = !milestone.completed;
    await _writeMilestones(milestones);
    return wrapResult(milestone);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteMilestone(milestoneId) {
  try {
    const milestones = await _readMilestones();
    const filtered = milestones.filter(m => m.id !== milestoneId);
    if (filtered.length === milestones.length) return { success: false, error: 'Milestone not found' };
    await _writeMilestones(filtered);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Tools ====================

async function _readTools() {
  const data = await fileService.readJSON('tools.json');
  return data.tools || [];
}

async function _writeTools(tools) {
  await fileService.writeJSON('tools.json', { tools });
}

export async function listTools() {
  try {
    const tools = await _readTools();
    return wrapResult(tools);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createTool({ name, launchType, launchPath, category = '', description = '' }) {
  try {
    const tools = await _readTools();
    const now = new Date().toISOString();
    const tool = {
      id: uuidv4(),
      name,
      description,
      launchType,
      launchPath,
      category,
      createdAt: now,
    };
    tools.push(tool);
    await _writeTools(tools);
    return wrapResult(tool);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateTool({ id, updates }) {
  try {
    const tools = await _readTools();
    const index = tools.findIndex(t => t.id === id);
    if (index === -1) return { success: false, error: 'Tool not found' };
    tools[index] = { ...tools[index], ...updates };
    await _writeTools(tools);
    return wrapResult(tools[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteTool(toolId) {
  try {
    const tools = await _readTools();
    const filtered = tools.filter(t => t.id !== toolId);
    if (filtered.length === tools.length) return { success: false, error: 'Tool not found' };
    await _writeTools(filtered);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

export async function launchTool(toolId) {
  try {
    const tools = await _readTools();
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return { success: false, error: 'Tool not found' };

    const openModule = await import('open');
    if (tool.launchType === 'url') {
      await openModule.default(tool.launchPath);
    } else {
      const { exec } = await import('node:child_process');
      exec(`"${tool.launchPath}"`);
    }
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Shortcuts ====================

async function _readShortcuts() {
  const data = await fileService.readJSON('shortcuts.json');
  return data?.shortcuts || [];
}

async function _writeShortcuts(shortcuts) {
  await fileService.writeJSON('shortcuts.json', { shortcuts });
}

export async function listShortcuts() {
  try {
    const shortcuts = await _readShortcuts();
    shortcuts.sort((a, b) => {
      if (a.program !== b.program) return a.program.localeCompare(b.program);
      return a.description.localeCompare(b.description);
    });
    return wrapResult(shortcuts);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createShortcut({ program, shortcut, description }) {
  try {
    const shortcuts = await _readShortcuts();
    const now = new Date().toISOString();
    const entry = {
      id: uuidv4(),
      program: program.trim(),
      shortcut: shortcut.trim(),
      description: description.trim(),
      createdAt: now,
      modifiedAt: now,
    };
    shortcuts.push(entry);
    await _writeShortcuts(shortcuts);
    return wrapResult(entry);
  } catch (error) {
    return wrapError(error);
  }
}

export async function updateShortcut({ id, updates }) {
  try {
    const shortcuts = await _readShortcuts();
    const index = shortcuts.findIndex(s => s.id === id);
    if (index === -1) return { success: false, error: 'Shortcut not found' };
    shortcuts[index] = { ...shortcuts[index], ...updates, modifiedAt: new Date().toISOString() };
    await _writeShortcuts(shortcuts);
    return wrapResult(shortcuts[index]);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteShortcut(shortcutId) {
  try {
    const shortcuts = await _readShortcuts();
    const filtered = shortcuts.filter(s => s.id !== shortcutId);
    if (filtered.length === shortcuts.length) return { success: false, error: 'Shortcut not found' };
    await _writeShortcuts(filtered);
    return wrapResult(null);
  } catch (error) {
    return wrapError(error);
  }
}

// ==================== Daily Todos ====================

export async function listDailyTodos() {
  try {
    const result = await dailyTodosService.list();
    return wrapResult(result);
  } catch (error) {
    return wrapError(error);
  }
}

export async function createDailyTodo(data) {
  try {
    const result = await dailyTodosService.create(data);
    return wrapResult(result);
  } catch (error) {
    return wrapError(error);
  }
}

export async function toggleDailyTodoComplete(todoId) {
  try {
    const result = await dailyTodosService.toggleComplete(todoId);
    return wrapResult(result);
  } catch (error) {
    return wrapError(error);
  }
}

export async function deleteDailyTodo(todoId) {
  try {
    const result = await dailyTodosService.delete(todoId);
    return wrapResult(result);
  } catch (error) {
    return wrapError(error);
  }
}

export async function getDailyTodosArchive(options = {}) {
  try {
    const result = await dailyTodosService.getArchive(options);
    return wrapResult(result);
  } catch (error) {
    return wrapError(error);
  }
}
