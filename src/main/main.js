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
}
