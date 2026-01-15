import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';

// Mock the fs module with factory function
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

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Import after mocking
import fs from 'node:fs/promises';
const { fileService } = await import('../../src/main/services/file-service.js');

describe('FileService', () => {
  const testStoragePath = '/test/storage';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state
    fileService.storageRoot = null;
    fileService.configPath = null;
  });

  describe('initialize', () => {
    it('should set storage root and config path', async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);

      await fileService.initialize(testStoragePath);

      expect(fileService.storageRoot).toBe(testStoragePath);
      expect(fileService.configPath).toBe(
        path.join(testStoragePath, '.knowledgebase', 'config.json')
      );
    });

    it('should create required directories', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      fs.mkdir.mockResolvedValue(undefined);

      await fileService.initialize(testStoragePath);

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testStoragePath, '.knowledgebase'),
        { recursive: true }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testStoragePath, 'notes'),
        { recursive: true }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testStoragePath, 'snippets'),
        { recursive: true }
      );
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should not create directory if it exists', async () => {
      fs.access.mockResolvedValue(undefined);

      await fileService.ensureDirectoryExists('/existing/dir');

      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue(undefined);

      await fileService.ensureDirectoryExists('/new/dir');

      expect(fs.mkdir).toHaveBeenCalledWith('/new/dir', { recursive: true });
    });
  });

  describe('validatePath', () => {
    it('should return true for valid writable directory', async () => {
      fs.access.mockResolvedValue(undefined);
      fs.stat.mockResolvedValue({ isDirectory: () => true });

      const result = await fileService.validatePath('/valid/path');

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/valid/path', fs.constants.W_OK);
    });

    it('should return false for non-directory', async () => {
      fs.access.mockResolvedValue(undefined);
      fs.stat.mockResolvedValue({ isDirectory: () => false });

      const result = await fileService.validatePath('/file/path');

      expect(result).toBe(false);
    });

    it('should return false for inaccessible path', async () => {
      fs.access.mockRejectedValue(new Error('EACCES'));

      const result = await fileService.validatePath('/no/access');

      expect(result).toBe(false);
    });
  });

  describe('readConfig', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should read and parse config file', async () => {
      const mockConfig = { version: '1.0.0', theme: 'dark' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await fileService.readConfig();

      expect(result).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalledWith(fileService.configPath, 'utf-8');
    });

    it('should throw CONFIG_NOT_FOUND if file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(fileService.readConfig()).rejects.toThrow('CONFIG_NOT_FOUND');
    });

    it('should throw CONFIG_PARSE_ERROR for invalid JSON', async () => {
      fs.readFile.mockResolvedValue('invalid json');

      await expect(fileService.readConfig()).rejects.toThrow('CONFIG_PARSE_ERROR');
    });
  });

  describe('writeConfig', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should write config to file', async () => {
      const config = { version: '1.0.0', theme: 'light' };
      fs.writeFile.mockResolvedValue(undefined);

      await fileService.writeConfig(config);

      expect(fs.writeFile).toHaveBeenCalledWith(
        fileService.configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    });

    it('should throw WRITE_ERROR on failure', async () => {
      fs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(fileService.writeConfig({})).rejects.toThrow('WRITE_ERROR');
    });
  });

  describe('createInitialConfig', () => {
    it('should create config with default values', async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);

      const result = await fileService.createInitialConfig(testStoragePath);

      expect(result).toMatchObject({
        version: '1.0.0',
        storageLocation: testStoragePath,
        preferences: {
          theme: 'light',
          defaultView: 'notes',
          editorFontSize: 14,
          todosPanelCollapsed: false,
        },
      });
      expect(result.createdAt).toBeDefined();
      expect(result.lastModified).toBeDefined();
    });
  });

  describe('readJSON', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should read and parse JSON file', async () => {
      const mockData = { todos: [{ id: '1', title: 'Test' }] };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await fileService.readJSON('todos.json');

      expect(result).toEqual(mockData);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testStoragePath, '.knowledgebase', 'todos.json'),
        'utf-8'
      );
    });

    it('should return null if file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await fileService.readJSON('missing.json');

      expect(result).toBeNull();
    });

    it('should throw JSON_PARSE_ERROR for invalid JSON', async () => {
      fs.readFile.mockResolvedValue('not valid json');

      await expect(fileService.readJSON('bad.json')).rejects.toThrow('JSON_PARSE_ERROR');
    });
  });

  describe('writeJSON', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should write JSON to file', async () => {
      const data = { projects: [] };
      fs.writeFile.mockResolvedValue(undefined);

      await fileService.writeJSON('projects.json', data);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testStoragePath, '.knowledgebase', 'projects.json'),
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    });

    it('should throw WRITE_ERROR on failure', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(fileService.writeJSON('test.json', {})).rejects.toThrow('WRITE_ERROR');
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
id: "note-123"
title: "Test Note"
createdAt: "2024-01-01T00:00:00.000Z"
---

Note content here`;

      const result = fileService.parseFrontmatter(content);

      expect(result.frontmatter).toEqual({
        id: 'note-123',
        title: 'Test Note',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result.body).toBe('\nNote content here');
    });

    it('should parse frontmatter with tags array', () => {
      const content = `---
id: "note-123"
tags: ["tag1", "tag2", "tag3"]
---

Content`;

      const result = fileService.parseFrontmatter(content);

      expect(result.frontmatter.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should return empty frontmatter for content without frontmatter', () => {
      const content = 'Just plain content without frontmatter';

      const result = fileService.parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle single-quoted values', () => {
      const content = `---
title: 'Single quoted'
---

Content`;

      const result = fileService.parseFrontmatter(content);

      expect(result.frontmatter.title).toBe('Single quoted');
    });
  });

  describe('slugify', () => {
    it('should convert title to slug', () => {
      expect(fileService.slugify('Hello World')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      expect(fileService.slugify('Test: A "Special" Note!')).toBe('test-a-special-note');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(fileService.slugify('--Leading and Trailing--')).toBe('leading-and-trailing');
    });

    it('should handle multiple spaces', () => {
      expect(fileService.slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });
  });

  describe('generateId', () => {
    it('should return a UUID', () => {
      const id = fileService.generateId();

      expect(id).toBe('test-uuid-1234');
    });
  });

  describe('createNote', () => {
    beforeEach(async () => {
      fs.access.mockImplementation(async (path) => {
        // Simulate file not existing for the note path
        if (path.endsWith('.md')) {
          throw { code: 'ENOENT' };
        }
        return undefined;
      });
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should create a note with generated ID and timestamps', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test content',
        tags: ['tag1'],
      };

      const result = await fileService.createNote(noteData);

      expect(result.id).toBe('test-uuid-1234');
      expect(result.title).toBe('Test Note');
      expect(result.createdAt).toBeDefined();
      expect(result.modifiedAt).toBeDefined();
      expect(result.tags).toEqual(['tag1']);
    });

    it('should create note in project folder when projectId is provided', async () => {
      const noteData = {
        title: 'Project Note',
        content: 'Content',
        projectId: 'project-123',
      };

      const result = await fileService.createNote(noteData);

      expect(result.projectId).toBe('project-123');
      expect(result.filePath).toContain('project-123');
    });

    it('should throw DUPLICATE_TITLE if note already exists', async () => {
      fs.access.mockResolvedValue(undefined); // File exists

      const noteData = {
        title: 'Existing Note',
        content: 'Content',
      };

      await expect(fileService.createNote(noteData)).rejects.toThrow('DUPLICATE_TITLE');
    });
  });

  describe('readNote', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should read and parse note file', async () => {
      const noteContent = `---
id: "note-123"
title: "Test Note"
createdAt: "2024-01-01T00:00:00.000Z"
modifiedAt: "2024-01-01T00:00:00.000Z"
tags: ["tag1", "tag2"]
---

Note body content`;

      fs.readFile.mockResolvedValue(noteContent);

      const result = await fileService.readNote('/path/to/note.md');

      expect(result.id).toBe('note-123');
      expect(result.title).toBe('Test Note');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.content).toContain('Note body content');
    });

    it('should throw NOTE_NOT_FOUND if file does not exist', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(fileService.readNote('/missing/note.md')).rejects.toThrow('NOTE_NOT_FOUND');
    });

    it('should throw READ_ERROR for other errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Disk error'));

      await expect(fileService.readNote('/path/to/note.md')).rejects.toThrow('READ_ERROR');
    });
  });

  describe('writeNote', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should write note with frontmatter', async () => {
      fs.writeFile.mockResolvedValue(undefined);

      const note = {
        id: 'note-123',
        title: 'Test Note',
        content: 'Content',
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z',
      };

      await fileService.writeNote('/path/to/note.md', note);

      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('---');
      expect(writtenContent).toContain('id: "note-123"');
      expect(writtenContent).toContain('title: "Test Note"');
    });

    it('should include projectId if present', async () => {
      fs.writeFile.mockResolvedValue(undefined);

      const note = {
        id: 'note-123',
        title: 'Test',
        content: '',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        projectId: 'project-456',
      };

      await fileService.writeNote('/path/to/note.md', note);

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('projectId: "project-456"');
    });

    it('should include tags array if present', async () => {
      fs.writeFile.mockResolvedValue(undefined);

      const note = {
        id: 'note-123',
        title: 'Test',
        content: '',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        tags: ['dev', 'javascript'],
      };

      await fileService.writeNote('/path/to/note.md', note);

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('tags: ["dev", "javascript"]');
    });

    it('should throw WRITE_ERROR on failure', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        fileService.writeNote('/path/to/note.md', { id: '1', title: 'T', content: '', createdAt: '', modifiedAt: '' })
      ).rejects.toThrow('WRITE_ERROR');
    });
  });

  describe('deleteNote', () => {
    it('should delete note file', async () => {
      fs.unlink.mockResolvedValue(undefined);

      await fileService.deleteNote('/path/to/note.md');

      expect(fs.unlink).toHaveBeenCalledWith('/path/to/note.md');
    });

    it('should throw NOTE_NOT_FOUND if file does not exist', async () => {
      fs.unlink.mockRejectedValue({ code: 'ENOENT' });

      await expect(fileService.deleteNote('/missing/note.md')).rejects.toThrow('NOTE_NOT_FOUND');
    });

    it('should throw DELETE_ERROR for other errors', async () => {
      fs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(fileService.deleteNote('/path/to/note.md')).rejects.toThrow('DELETE_ERROR');
    });
  });

  describe('Snippet Operations', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    describe('createSnippet', () => {
      it('should create snippet with valid data', async () => {
        fs.writeFile.mockResolvedValue(undefined);

        const snippetData = {
          title: 'Test Snippet',
          language: 'JavaScript',
          code: 'console.log("hello");',
          description: 'A test snippet',
          tags: {
            language: ['js', 'node'],
            usage: ['utility'],
            module: ['console'],
          },
        };

        const result = await fileService.createSnippet(snippetData);

        expect(result.id).toBe('test-uuid-1234');
        expect(result.title).toBe('Test Snippet');
        expect(result.language).toBe('javascript');
        expect(result.code).toBe('console.log("hello");');
        expect(result.tags.language).toEqual(['js', 'node']);
      });

      it('should throw VALIDATION_ERROR for missing title', async () => {
        const snippetData = {
          title: '',
          language: 'js',
          code: 'code',
          tags: {},
        };

        await expect(fileService.createSnippet(snippetData)).rejects.toThrow('VALIDATION_ERROR');
      });

      it('should throw VALIDATION_ERROR for missing language', async () => {
        const snippetData = {
          title: 'Test',
          language: '',
          code: 'code',
          tags: {},
        };

        await expect(fileService.createSnippet(snippetData)).rejects.toThrow('VALIDATION_ERROR');
      });

      it('should throw VALIDATION_ERROR for missing code', async () => {
        const snippetData = {
          title: 'Test',
          language: 'js',
          code: '',
          tags: {},
        };

        await expect(fileService.createSnippet(snippetData)).rejects.toThrow('VALIDATION_ERROR');
      });

      it('should throw VALIDATION_ERROR for invalid tags', async () => {
        const snippetData = {
          title: 'Test',
          language: 'js',
          code: 'code',
          tags: null,
        };

        await expect(fileService.createSnippet(snippetData)).rejects.toThrow('VALIDATION_ERROR');
      });
    });

    describe('getSnippet', () => {
      it('should return snippet by ID', async () => {
        const mockSnippet = {
          id: 'snippet-123',
          title: 'Test',
          language: 'js',
          code: 'code',
        };
        fs.readdir.mockResolvedValue(['snippet-123.json']);
        fs.readFile.mockResolvedValue(JSON.stringify(mockSnippet));

        const result = await fileService.getSnippet('snippet-123');

        expect(result.id).toBe('snippet-123');
      });

      it('should throw SNIPPET_NOT_FOUND if not found', async () => {
        fs.readdir.mockResolvedValue([]);

        await expect(fileService.getSnippet('missing-id')).rejects.toThrow('SNIPPET_NOT_FOUND');
      });
    });

    describe('updateSnippet', () => {
      it('should update snippet fields', async () => {
        const existingSnippet = {
          id: 'snippet-123',
          title: 'Old Title',
          language: 'js',
          code: 'old code',
          description: 'old desc',
          tags: { language: [], usage: [], module: [] },
          createdAt: '2024-01-01',
          modifiedAt: '2024-01-01',
        };
        fs.readdir.mockResolvedValue(['snippet-123.json']);
        fs.readFile.mockResolvedValue(JSON.stringify(existingSnippet));
        fs.writeFile.mockResolvedValue(undefined);

        const updates = {
          title: 'New Title',
          code: 'new code',
        };

        const result = await fileService.updateSnippet('snippet-123', updates);

        expect(result.title).toBe('New Title');
        expect(result.code).toBe('new code');
        expect(result.modifiedAt).not.toBe('2024-01-01');
      });

      it('should not update if no changes', async () => {
        const existingSnippet = {
          id: 'snippet-123',
          title: 'Title',
          language: 'js',
          code: 'code',
          description: '',
          tags: { language: [], usage: [], module: [] },
          createdAt: '2024-01-01',
          modifiedAt: '2024-01-01',
        };
        fs.readdir.mockResolvedValue(['snippet-123.json']);
        fs.readFile.mockResolvedValue(JSON.stringify(existingSnippet));

        const result = await fileService.updateSnippet('snippet-123', {});

        expect(result.modifiedAt).toBe('2024-01-01');
        expect(fs.writeFile).not.toHaveBeenCalled();
      });
    });

    describe('deleteSnippet', () => {
      it('should delete snippet file', async () => {
        fs.unlink.mockResolvedValue(undefined);

        await fileService.deleteSnippet('snippet-123');

        expect(fs.unlink).toHaveBeenCalledWith(
          path.join(testStoragePath, 'snippets', 'snippet-123.json')
        );
      });

      it('should throw SNIPPET_NOT_FOUND if file does not exist', async () => {
        fs.unlink.mockRejectedValue({ code: 'ENOENT' });

        await expect(fileService.deleteSnippet('missing-id')).rejects.toThrow('SNIPPET_NOT_FOUND');
      });

      it('should throw DELETE_ERROR for other errors', async () => {
        fs.unlink.mockRejectedValue(new Error('Permission denied'));

        await expect(fileService.deleteSnippet('id')).rejects.toThrow('DELETE_ERROR');
      });
    });

    describe('listSnippets', () => {
      it('should return all snippets', async () => {
        const snippets = [
          { id: '1', title: 'Snippet 1', code: 'code1', description: '' },
          { id: '2', title: 'Snippet 2', code: 'code2', description: '' },
        ];
        fs.readdir.mockResolvedValue(['1.json', '2.json']);
        fs.readFile
          .mockResolvedValueOnce(JSON.stringify(snippets[0]))
          .mockResolvedValueOnce(JSON.stringify(snippets[1]));

        const result = await fileService.listSnippets();

        expect(result).toHaveLength(2);
      });

      it('should skip invalid JSON files', async () => {
        fs.readdir.mockResolvedValue(['valid.json', 'invalid.json']);
        fs.readFile
          .mockResolvedValueOnce(JSON.stringify({ id: '1', title: 'Valid' }))
          .mockRejectedValueOnce(new Error('Parse error'));

        const result = await fileService.listSnippets();

        expect(result).toHaveLength(1);
      });
    });

    describe('searchSnippets', () => {
      beforeEach(() => {
        const snippets = [
          {
            id: '1',
            title: 'Array Helper',
            description: 'Helper for arrays',
            code: 'const arr = []',
            tags: { language: ['js'], usage: ['utility'], module: ['array'] },
            modifiedAt: '2024-01-02',
            createdAt: '2024-01-01',
          },
          {
            id: '2',
            title: 'String Utils',
            description: 'String utilities',
            code: 'str.trim()',
            tags: { language: ['js'], usage: ['utility'], module: ['string'] },
            modifiedAt: '2024-01-03',
            createdAt: '2024-01-01',
          },
        ];
        fs.readdir.mockResolvedValue(['1.json', '2.json']);
        fs.readFile
          .mockResolvedValueOnce(JSON.stringify(snippets[0]))
          .mockResolvedValueOnce(JSON.stringify(snippets[1]));
      });

      it('should search by query in title', async () => {
        const result = await fileService.searchSnippets('Array');

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Array Helper');
      });

      it('should search by query in description', async () => {
        const result = await fileService.searchSnippets('utilities');

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('String Utils');
      });

      it('should filter by tags', async () => {
        const result = await fileService.searchSnippets('', { module: ['array'] });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });

      it('should sort by modifiedAt descending', async () => {
        const result = await fileService.searchSnippets('');

        expect(result[0].title).toBe('String Utils');
        expect(result[1].title).toBe('Array Helper');
      });
    });
  });

  describe('Project Folder Operations', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    describe('createProjectFolder', () => {
      it('should create project folder', async () => {
        // Simulate directory not existing
        fs.access.mockRejectedValue({ code: 'ENOENT' });
        fs.mkdir.mockResolvedValue(undefined);

        await fileService.createProjectFolder('my-project');

        expect(fs.mkdir).toHaveBeenCalledWith(
          path.join(testStoragePath, 'notes', 'my-project'),
          { recursive: true }
        );
      });

      it('should throw FOLDER_CREATE_ERROR on failure', async () => {
        fs.access.mockRejectedValue({ code: 'ENOENT' });
        fs.mkdir.mockRejectedValue(new Error('Permission denied'));

        await expect(fileService.createProjectFolder('bad-folder')).rejects.toThrow(
          'FOLDER_CREATE_ERROR'
        );
      });
    });

    describe('renameProjectFolder', () => {
      it('should rename project folder', async () => {
        fs.rename.mockResolvedValue(undefined);

        await fileService.renameProjectFolder('old-name', 'new-name');

        expect(fs.rename).toHaveBeenCalledWith(
          path.join(testStoragePath, 'notes', 'old-name'),
          path.join(testStoragePath, 'notes', 'new-name')
        );
      });

      it('should throw FOLDER_NOT_FOUND if folder does not exist', async () => {
        fs.rename.mockRejectedValue({ code: 'ENOENT' });

        await expect(
          fileService.renameProjectFolder('missing', 'new-name')
        ).rejects.toThrow('FOLDER_NOT_FOUND');
      });

      it('should throw FOLDER_RENAME_ERROR for other errors', async () => {
        fs.rename.mockRejectedValue(new Error('Disk error'));

        await expect(
          fileService.renameProjectFolder('old', 'new')
        ).rejects.toThrow('FOLDER_RENAME_ERROR');
      });
    });

    describe('deleteProjectFolder', () => {
      it('should delete project folder recursively', async () => {
        fs.rm.mockResolvedValue(undefined);

        await fileService.deleteProjectFolder('my-project');

        expect(fs.rm).toHaveBeenCalledWith(
          path.join(testStoragePath, 'notes', 'my-project'),
          { recursive: true, force: true }
        );
      });

      it('should throw FOLDER_DELETE_ERROR on failure', async () => {
        fs.rm.mockRejectedValue(new Error('Permission denied'));

        await expect(fileService.deleteProjectFolder('folder')).rejects.toThrow(
          'FOLDER_DELETE_ERROR'
        );
      });
    });
  });

  describe('listNotes', () => {
    beforeEach(async () => {
      fs.access.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      await fileService.initialize(testStoragePath);
    });

    it('should return empty array if directory read fails', async () => {
      fs.readdir.mockRejectedValue(new Error('Read error'));

      const result = await fileService.listNotes();

      expect(result).toEqual([]);
    });

    it('should skip non-markdown files', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'note.md', isDirectory: () => false },
        { name: 'readme.txt', isDirectory: () => false },
      ]);
      fs.readFile.mockResolvedValue(`---
id: "1"
title: "Note"
createdAt: "2024-01-01"
modifiedAt: "2024-01-01"
---

Content`);

      const result = await fileService.listNotes();

      expect(result).toHaveLength(1);
    });
  });
});
