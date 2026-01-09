import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configService } from './services/config-service.js';
import { fileService } from './services/file-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC Handlers ====================

function setupIpcHandlers() {
  // Configuration API
  ipcMain.handle('config.get', async () => {
  // ==================== Snippet API ====================
  ipcMain.handle('snippets.list', async () => {
    try {
      const snippets = await fileService.listSnippets();
      return { success: true, data: snippets };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('snippets.get', async (_event, id) => {
    try {
      const snippet = await fileService.getSnippet(id);
      return { success: true, data: snippet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('snippets.create', async (_event, snippetData) => {
    try {
      const snippet = await fileService.createSnippet(snippetData);
      return { success: true, data: snippet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('snippets.update', async (_event, id, updates) => {
    try {
      const snippet = await fileService.updateSnippet(id, updates);
      return { success: true, data: snippet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('snippets.delete', async (_event, id) => {
    try {
      await fileService.deleteSnippet(id);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('snippets.search', async (_event, query, tagFilters) => {
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
        return { success: false, error: 'CONFIG_NOT_FOUND' };
      }
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config.update', async (_event, updates) => {
    try {
      const config = await configService.updateConfig(updates);
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config.setStorageLocation', async (_event, storagePath) => {
    try {
      const result = await configService.setStorageLocation(storagePath);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // File System API
  ipcMain.handle('fs.selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Knowledge Base Storage Location',
      });

      if (result.canceled) {
        return { success: false, error: 'CANCELLED' };
      }

      return { success: true, data: { path: result.filePaths[0] } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs.validatePath', async (_event, targetPath) => {
    try {
      const isValid = await fileService.validatePath(targetPath);
      return { success: true, data: { valid: isValid } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Notes API
  ipcMain.handle('notes.list', async (_event, options = {}) => {
    try {
      const projectFolder = options.projectId || '';
      let notes = await fileService.listNotes(projectFolder);

      // Apply sorting
      const sortBy = options.sortBy || 'modifiedAt';
      const sortOrder = options.sortOrder || 'desc';

      notes.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (sortOrder === 'asc') {
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

  ipcMain.handle('notes.get', async (_event, id) => {
    try {
      // Find note by ID
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find(n => n.id === id);

      if (!noteMetadata) {
        return { success: false, error: 'NOTE_NOT_FOUND' };
      }

      const note = await fileService.readNote(noteMetadata.filePath);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notes.create', async (_event, noteData) => {
    try {
      // Validate title
      if (!noteData.title || noteData.title.trim() === '') {
        return { success: false, error: 'VALIDATION_ERROR: Title cannot be empty' };
      }

      if (/[/\\:*?"<>|]/.test(noteData.title)) {
        return { success: false, error: 'VALIDATION_ERROR: Title contains invalid characters' };
      }

      const note = await fileService.createNote(noteData);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notes.update', async (_event, { id, updates }) => {
    try {
      // Find note by ID
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find(n => n.id === id);

      if (!noteMetadata) {
        return { success: false, error: 'NOTE_NOT_FOUND' };
      }

      // Read current note
      const note = await fileService.readNote(noteMetadata.filePath);

      // Apply updates
      const updatedNote = {
        ...note,
        ...updates,
        modifiedAt: new Date().toISOString(),
      };

      // If title changed, may need to rename file
      let newFilePath = noteMetadata.filePath;
      if (updates.title && updates.title !== note.title) {
        const newSlug = fileService.slugify(updates.title);
        const dir = path.dirname(noteMetadata.filePath);
        newFilePath = path.join(dir, `${newSlug}.md`);

        // Delete old file
        await fileService.deleteNote(noteMetadata.filePath);
      }

      // Write updated note
      await fileService.writeNote(newFilePath, updatedNote);

      return {
        success: true,
        data: {
          ...updatedNote,
          filePath: newFilePath,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notes.delete', async (_event, id) => {
    try {
      // Find note by ID
      const notes = await fileService.listNotes();
      const noteMetadata = notes.find(n => n.id === id);

      if (!noteMetadata) {
        return { success: false, error: 'NOTE_NOT_FOUND' };
      }

      // Find referencing notes (containing [[Title]])
      const referencingNotes = [];
      for (const otherNote of notes) {
        if (otherNote.id === id) continue;

        const fullNote = await fileService.readNote(otherNote.filePath);
        if (fullNote.content.includes(`[[${noteMetadata.title}]]`)) {
          referencingNotes.push(otherNote.id);
        }
      }

      // Delete the note
      await fileService.deleteNote(noteMetadata.filePath);

      return {
        success: true,
        data: {
          deleted: true,
          referencingNotes,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notes.search', async (_event, { query, projectId }) => {
    try {
      const notes = await fileService.listNotes(projectId || '');
      const results = [];

      for (const noteMetadata of notes) {
        const note = await fileService.readNote(noteMetadata.filePath);
        const searchText = `${note.title} ${note.content}`.toLowerCase();
        const queryLower = query.toLowerCase();

        if (searchText.includes(queryLower)) {
          // Find snippet context
          const contentLower = note.content.toLowerCase();
          const index = contentLower.indexOf(queryLower);
          let snippet = '';

          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(note.content.length, index + query.length + 50);
            snippet = '...' + note.content.substring(start, end) + '...';
          } else {
            snippet = note.content.substring(0, 100) + '...';
          }

          results.push({
            id: note.id,
            title: note.title,
            snippet,
            relevance: searchText.split(queryLower).length - 1,
          });
        }
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Todos API
  ipcMain.handle('todos.list', async () => {
    try {
      const data = await fileService.readJSON('todos.json');
      const todos = data?.todos || [];

      // Sort by priority (high, medium, low) then by deadline
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

  ipcMain.handle('todos.create', async (_event, todoData) => {
    try {
      const data = await fileService.readJSON('todos.json') || { todos: [] };
      const now = new Date().toISOString();

      const newTodo = {
        id: fileService.generateId(),
        title: todoData.title,
        description: todoData.description || '',
        priority: todoData.priority || 'medium',
        deadline: todoData.deadline || null,
        completed: false,
        completedAt: null,
        projectId: todoData.projectId || null,
        createdAt: now,
        modifiedAt: now,
      };

      data.todos.push(newTodo);
      await fileService.writeJSON('todos.json', data);

      return { success: true, data: newTodo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('todos.update', async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON('todos.json');
      if (!data || !data.todos) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      const todoIndex = data.todos.findIndex(t => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      data.todos[todoIndex] = {
        ...data.todos[todoIndex],
        ...updates,
        modifiedAt: new Date().toISOString(),
      };

      await fileService.writeJSON('todos.json', data);

      return { success: true, data: data.todos[todoIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('todos.toggleComplete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('todos.json');
      if (!data || !data.todos) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      const todoIndex = data.todos.findIndex(t => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      const todo = data.todos[todoIndex];
      todo.completed = !todo.completed;
      todo.completedAt = todo.completed ? new Date().toISOString() : null;
      todo.modifiedAt = new Date().toISOString();

      await fileService.writeJSON('todos.json', data);

      return { success: true, data: todo };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('todos.delete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('todos.json');
      if (!data || !data.todos) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      const todoIndex = data.todos.findIndex(t => t.id === id);
      if (todoIndex === -1) {
        return { success: false, error: 'TODO_NOT_FOUND' };
      }

      data.todos.splice(todoIndex, 1);
      await fileService.writeJSON('todos.json', data);

      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Projects API
  ipcMain.handle('projects.list', async () => {
    try {
      const data = await fileService.readJSON('projects.json');
      const projects = data?.projects || [];

      // Sort by name
      projects.sort((a, b) => a.name.localeCompare(b.name));

      return { success: true, data: projects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('projects.get', async (_event, id) => {
    try {
      const data = await fileService.readJSON('projects.json');
      if (!data || !data.projects) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      const project = data.projects.find(p => p.id === id);
      if (!project) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      // Get associated notes
      const notes = await fileService.listNotes(project.folder);

      return {
        success: true,
        data: {
          ...project,
          notes,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('projects.create', async (_event, projectData) => {
    try {
      const data = await fileService.readJSON('projects.json');
      if (!data.projects) {
        data.projects = [];
      }

      const now = new Date().toISOString();
      const folder = fileService.slugify(projectData.name);

      const newProject = {
        id: fileService.generateId(),
        name: projectData.name,
        description: projectData.description || '',
        folder,
        createdAt: now,
        modifiedAt: now,
      };

      // Create project folder
      await fileService.createProjectFolder(folder);

      data.projects.push(newProject);
      await fileService.writeJSON('projects.json', data);

      return { success: true, data: newProject };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('projects.update', async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON('projects.json');
      if (!data || !data.projects) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      const projectIndex = data.projects.findIndex(p => p.id === id);
      if (projectIndex === -1) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      // If name changed, update folder
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
        modifiedAt: new Date().toISOString(),
      };

      await fileService.writeJSON('projects.json', data);

      return { success: true, data: data.projects[projectIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('projects.delete', async (_event, { id, deleteNotes = false }) => {
    try {
      const data = await fileService.readJSON('projects.json');
      if (!data || !data.projects) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      const projectIndex = data.projects.findIndex(p => p.id === id);
      if (projectIndex === -1) {
        return { success: false, error: 'PROJECT_NOT_FOUND' };
      }

      const project = data.projects[projectIndex];

      if (deleteNotes) {
        // Delete all notes in the project folder
        await fileService.deleteProjectFolder(project.folder);
      } else {
        // Move notes to root (unlink from project)
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
        // Delete empty project folder
        await fileService.deleteProjectFolder(project.folder);
      }

      // Unlink todos from this project
      const todosData = await fileService.readJSON('todos.json');
      if (todosData && todosData.todos) {
        todosData.todos.forEach(todo => {
          if (todo.projectId === id) {
            todo.projectId = null;
          }
        });
        await fileService.writeJSON('todos.json', todosData);
      }

      data.projects.splice(projectIndex, 1);
      await fileService.writeJSON('projects.json', data);

      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Milestones API ====================
  ipcMain.handle('milestones.list', async (_event, projectId) => {
    try {
      const data = await fileService.readJSON('milestones.json');
      let milestones = data?.milestones || [];

      // Filter by project if provided
      if (projectId) {
        milestones = milestones.filter(m => m.projectId === projectId);
      }

      // Sort by deadline (chronological)
      milestones.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      return { success: true, data: milestones };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('milestones.create', async (_event, milestoneData) => {
    try {
      const data = await fileService.readJSON('milestones.json') || { milestones: [] };
      const now = new Date().toISOString();

      const newMilestone = {
        id: fileService.generateId(),
        projectId: milestoneData.projectId,
        title: milestoneData.title,
        description: milestoneData.description || '',
        deadline: milestoneData.deadline,
        completed: false,
        completedAt: null,
        createdAt: now,
        modifiedAt: now,
      };

      data.milestones.push(newMilestone);
      await fileService.writeJSON('milestones.json', data);

      return { success: true, data: newMilestone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('milestones.update', async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON('milestones.json');
      if (!data || !data.milestones) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      const milestoneIndex = data.milestones.findIndex(m => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      data.milestones[milestoneIndex] = {
        ...data.milestones[milestoneIndex],
        ...updates,
        modifiedAt: new Date().toISOString(),
      };

      await fileService.writeJSON('milestones.json', data);

      return { success: true, data: data.milestones[milestoneIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('milestones.toggleComplete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('milestones.json');
      if (!data || !data.milestones) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      const milestoneIndex = data.milestones.findIndex(m => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      const milestone = data.milestones[milestoneIndex];
      milestone.completed = !milestone.completed;
      milestone.completedAt = milestone.completed ? new Date().toISOString() : null;
      milestone.modifiedAt = new Date().toISOString();

      await fileService.writeJSON('milestones.json', data);

      return { success: true, data: milestone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('milestones.delete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('milestones.json');
      if (!data || !data.milestones) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      const milestoneIndex = data.milestones.findIndex(m => m.id === id);
      if (milestoneIndex === -1) {
        return { success: false, error: 'MILESTONE_NOT_FOUND' };
      }

      data.milestones.splice(milestoneIndex, 1);
      await fileService.writeJSON('milestones.json', data);

      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== Tools API ====================
  ipcMain.handle('tools.list', async () => {
    try {
      const data = await fileService.readJSON('tools.json');
      const tools = data?.tools || [];

      // Sort by category, then by name
      tools.sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.name.localeCompare(b.name);
      });

      return { success: true, data: tools };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tools.create', async (_event, toolData) => {
    try {
      const data = await fileService.readJSON('tools.json') || { tools: [] };
      const now = new Date().toISOString();

      const newTool = {
        id: fileService.generateId(),
        name: toolData.name,
        description: toolData.description || '',
        launchPath: toolData.launchPath,
        launchType: toolData.launchType || 'application',
        category: toolData.category || 'General',
        createdAt: now,
        modifiedAt: now,
      };

      data.tools.push(newTool);
      await fileService.writeJSON('tools.json', data);

      return { success: true, data: newTool };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tools.update', async (_event, { id, updates }) => {
    try {
      const data = await fileService.readJSON('tools.json');
      if (!data || !data.tools) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      const toolIndex = data.tools.findIndex(t => t.id === id);
      if (toolIndex === -1) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      data.tools[toolIndex] = {
        ...data.tools[toolIndex],
        ...updates,
        modifiedAt: new Date().toISOString(),
      };

      await fileService.writeJSON('tools.json', data);

      return { success: true, data: data.tools[toolIndex] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tools.delete', async (_event, id) => {
    try {
      const data = await fileService.readJSON('tools.json');
      if (!data || !data.tools) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      const toolIndex = data.tools.findIndex(t => t.id === id);
      if (toolIndex === -1) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      data.tools.splice(toolIndex, 1);
      await fileService.writeJSON('tools.json', data);

      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tools.launch', async (_event, id) => {
    try {
      const data = await fileService.readJSON('tools.json');
      if (!data || !data.tools) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      const tool = data.tools.find(t => t.id === id);
      if (!tool) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      const { shell } = await import('electron');

      if (tool.launchType === 'url') {
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
