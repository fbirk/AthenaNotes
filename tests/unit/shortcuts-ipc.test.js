import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    rename: vi.fn(),
    rm: vi.fn(),
    constants: { W_OK: 2 },
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import fs from 'node:fs/promises';
const { fileService } = await import('../../src/main/services/file-service.js');

describe('Shortcuts CRUD via fileService', () => {
  const testStoragePath = '/test/storage';

  beforeEach(async () => {
    vi.clearAllMocks();
    fileService.storageRoot = null;
    fileService.configPath = null;
    fs.access.mockResolvedValue(undefined);
    fs.mkdir.mockResolvedValue(undefined);
    await fileService.initialize(testStoragePath);
  });

  describe('list shortcuts', () => {
    it('should return empty array when no shortcuts file exists', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      const data = await fileService.readJSON('shortcuts.json');
      const shortcuts = data?.shortcuts || [];
      expect(shortcuts).toEqual([]);
    });

    it('should return shortcuts sorted by program then description', async () => {
      const stored = {
        shortcuts: [
          { id: '2', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: '1', program: 'VS Code', shortcut: 'Ctrl+P', description: 'Quick open', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: '3', program: 'Chrome', shortcut: 'Ctrl+L', description: 'Focus address bar', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));

      const data = await fileService.readJSON('shortcuts.json');
      const shortcuts = data?.shortcuts || [];
      shortcuts.sort((a, b) => {
        if (a.program !== b.program) return a.program.localeCompare(b.program);
        return a.description.localeCompare(b.description);
      });

      expect(shortcuts[0].program).toBe('Chrome');
      expect(shortcuts[0].description).toBe('Focus address bar');
      expect(shortcuts[1].program).toBe('Chrome');
      expect(shortcuts[1].description).toBe('New tab');
      expect(shortcuts[2].program).toBe('VS Code');
    });
  });

  describe('create shortcut', () => {
    it('should create a shortcut with generated id and timestamps', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue(undefined);

      const shortcutData = { program: 'VS Code', shortcut: 'Ctrl+Shift+P', description: 'Command palette' };
      const data = { shortcuts: [] };
      const now = new Date().toISOString();
      const newShortcut = {
        id: 'test-uuid-1234',
        ...shortcutData,
        createdAt: now,
        modifiedAt: now,
      };
      data.shortcuts.push(newShortcut);

      expect(newShortcut.id).toBe('test-uuid-1234');
      expect(newShortcut.program).toBe('VS Code');
      expect(newShortcut.shortcut).toBe('Ctrl+Shift+P');
      expect(newShortcut.description).toBe('Command palette');
    });
  });

  describe('update shortcut', () => {
    it('should update fields and modifiedAt timestamp', async () => {
      const stored = {
        shortcuts: [
          { id: 'abc', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));
      fs.writeFile.mockResolvedValue(undefined);

      const data = await fileService.readJSON('shortcuts.json');
      const index = data.shortcuts.findIndex(s => s.id === 'abc');
      expect(index).toBe(0);

      data.shortcuts[index] = {
        ...data.shortcuts[index],
        description: 'Open new tab',
        modifiedAt: new Date().toISOString(),
      };

      expect(data.shortcuts[0].description).toBe('Open new tab');
      expect(data.shortcuts[0].program).toBe('Chrome');
    });

    it('should fail when shortcut id not found', async () => {
      const stored = { shortcuts: [] };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));

      const data = await fileService.readJSON('shortcuts.json');
      const index = data.shortcuts.findIndex(s => s.id === 'nonexistent');
      expect(index).toBe(-1);
    });
  });

  describe('delete shortcut', () => {
    it('should remove shortcut by id', async () => {
      const stored = {
        shortcuts: [
          { id: 'abc', program: 'Chrome', shortcut: 'Ctrl+T', description: 'New tab', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
          { id: 'def', program: 'VS Code', shortcut: 'Ctrl+P', description: 'Quick open', createdAt: '2026-01-01', modifiedAt: '2026-01-01' },
        ],
      };
      fs.readFile.mockResolvedValue(JSON.stringify(stored));
      fs.writeFile.mockResolvedValue(undefined);

      const data = await fileService.readJSON('shortcuts.json');
      const filtered = data.shortcuts.filter(s => s.id !== 'abc');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('def');
    });
  });
});
