import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock for fileService
const mockFileService = {
  readConfig: vi.fn(),
  writeConfig: vi.fn(),
  createInitialConfig: vi.fn(),
  validatePath: vi.fn(),
  initialize: vi.fn(),
  ensureDirectoryExists: vi.fn(),
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
};

// Mock the file-service module
vi.mock('../../src/main/services/file-service.js', () => ({
  fileService: mockFileService,
}));

// Import after mocking
const { configService } = await import('../../src/main/services/config-service.js');

describe('ConfigService', () => {
  const testStoragePath = '/test/storage';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config service state
    configService.config = null;
  });

  describe('getConfig', () => {
    it('should return cached config if available', async () => {
      const cachedConfig = { version: '1.0.0', theme: 'dark' };
      configService.config = cachedConfig;

      const result = await configService.getConfig();

      expect(result).toBe(cachedConfig);
      expect(mockFileService.readConfig).not.toHaveBeenCalled();
    });

    it('should read config from file service if not cached', async () => {
      const fileConfig = { version: '1.0.0', theme: 'light' };
      mockFileService.readConfig.mockResolvedValue(fileConfig);

      const result = await configService.getConfig();

      expect(result).toEqual(fileConfig);
      expect(mockFileService.readConfig).toHaveBeenCalled();
    });

    it('should return null if config not found', async () => {
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));

      const result = await configService.getConfig();

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      mockFileService.readConfig.mockRejectedValue(new Error('DISK_ERROR'));

      await expect(configService.getConfig()).rejects.toThrow('DISK_ERROR');
    });

    it('should cache the config after reading', async () => {
      const fileConfig = { version: '1.0.0' };
      mockFileService.readConfig.mockResolvedValue(fileConfig);

      await configService.getConfig();
      await configService.getConfig();

      expect(mockFileService.readConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateConfig', () => {
    const existingConfig = {
      version: '1.0.0',
      storageLocation: testStoragePath,
      preferences: {
        theme: 'light',
        defaultView: 'notes',
        editorFontSize: 14,
      },
      lastModified: '2024-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      configService.config = { ...existingConfig };
    });

    it('should update preferences', async () => {
      mockFileService.writeConfig.mockResolvedValue(undefined);

      const result = await configService.updateConfig({
        preferences: { theme: 'dark' },
      });

      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.defaultView).toBe('notes'); // Unchanged
      expect(mockFileService.writeConfig).toHaveBeenCalled();
    });

    it('should update lastModified timestamp', async () => {
      mockFileService.writeConfig.mockResolvedValue(undefined);

      const result = await configService.updateConfig({
        preferences: { theme: 'dark' },
      });

      expect(result.lastModified).not.toBe('2024-01-01T00:00:00.000Z');
    });

    it('should throw CONFIG_NOT_FOUND if no config exists', async () => {
      configService.config = null;
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));

      await expect(
        configService.updateConfig({ preferences: { theme: 'dark' } })
      ).rejects.toThrow('CONFIG_NOT_FOUND');
    });

    describe('validation', () => {
      it('should reject invalid theme', async () => {
        await expect(
          configService.updateConfig({ preferences: { theme: 'invalid' } })
        ).rejects.toThrow('VALIDATION_ERROR: Invalid theme');
      });

      it('should accept valid themes', async () => {
        mockFileService.writeConfig.mockResolvedValue(undefined);

        const lightResult = await configService.updateConfig({
          preferences: { theme: 'light' },
        });
        expect(lightResult.preferences.theme).toBe('light');

        configService.config = { ...existingConfig };

        const darkResult = await configService.updateConfig({
          preferences: { theme: 'dark' },
        });
        expect(darkResult.preferences.theme).toBe('dark');
      });

      it('should reject invalid defaultView', async () => {
        await expect(
          configService.updateConfig({ preferences: { defaultView: 'invalid' } })
        ).rejects.toThrow('VALIDATION_ERROR: Invalid defaultView');
      });

      it('should accept valid defaultView values', async () => {
        mockFileService.writeConfig.mockResolvedValue(undefined);

        const validViews = ['notes', 'projects', 'snippets', 'tools'];

        for (const view of validViews) {
          configService.config = { ...existingConfig };
          const result = await configService.updateConfig({
            preferences: { defaultView: view },
          });
          expect(result.preferences.defaultView).toBe(view);
        }
      });

      it('should reject editorFontSize below 10', async () => {
        await expect(
          configService.updateConfig({ preferences: { editorFontSize: 9 } })
        ).rejects.toThrow('VALIDATION_ERROR: editorFontSize must be between 10 and 24');
      });

      it('should reject editorFontSize above 24', async () => {
        await expect(
          configService.updateConfig({ preferences: { editorFontSize: 25 } })
        ).rejects.toThrow('VALIDATION_ERROR: editorFontSize must be between 10 and 24');
      });

      it('should reject non-numeric editorFontSize', async () => {
        await expect(
          configService.updateConfig({ preferences: { editorFontSize: 'large' } })
        ).rejects.toThrow('VALIDATION_ERROR: editorFontSize must be between 10 and 24');
      });

      it('should accept valid editorFontSize', async () => {
        mockFileService.writeConfig.mockResolvedValue(undefined);

        const result = await configService.updateConfig({
          preferences: { editorFontSize: 16 },
        });

        expect(result.preferences.editorFontSize).toBe(16);
      });

      it('should accept boundary editorFontSize values', async () => {
        mockFileService.writeConfig.mockResolvedValue(undefined);

        // Test min value
        let result = await configService.updateConfig({
          preferences: { editorFontSize: 10 },
        });
        expect(result.preferences.editorFontSize).toBe(10);

        // Reset config
        configService.config = { ...existingConfig };

        // Test max value
        result = await configService.updateConfig({
          preferences: { editorFontSize: 24 },
        });
        expect(result.preferences.editorFontSize).toBe(24);
      });
    });

    it('should update cached config', async () => {
      mockFileService.writeConfig.mockResolvedValue(undefined);

      await configService.updateConfig({ preferences: { theme: 'dark' } });

      expect(configService.config.preferences.theme).toBe('dark');
    });
  });

  describe('setStorageLocation', () => {
    it('should validate path before initializing', async () => {
      mockFileService.validatePath.mockResolvedValue(false);

      await expect(configService.setStorageLocation('/invalid/path')).rejects.toThrow(
        'INVALID_PATH'
      );
    });

    it('should initialize file service with new path', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockResolvedValue(undefined);
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));
      mockFileService.createInitialConfig.mockResolvedValue({
        version: '1.0.0',
        storageLocation: testStoragePath,
      });
      mockFileService.ensureDirectoryExists.mockResolvedValue(undefined);
      mockFileService.readJSON.mockResolvedValue(null);
      mockFileService.writeJSON.mockResolvedValue(undefined);

      await configService.setStorageLocation(testStoragePath);

      expect(mockFileService.initialize).toHaveBeenCalledWith(testStoragePath);
    });

    it('should create initial config for first-time setup', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockResolvedValue(undefined);
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));
      mockFileService.createInitialConfig.mockResolvedValue({
        version: '1.0.0',
        storageLocation: testStoragePath,
      });
      mockFileService.ensureDirectoryExists.mockResolvedValue(undefined);
      mockFileService.readJSON.mockResolvedValue(null);
      mockFileService.writeJSON.mockResolvedValue(undefined);

      await configService.setStorageLocation(testStoragePath);

      expect(mockFileService.createInitialConfig).toHaveBeenCalledWith(testStoragePath);
    });

    it('should update existing config when config exists', async () => {
      const existingConfig = {
        version: '1.0.0',
        storageLocation: '/old/path',
        lastModified: '2024-01-01',
      };

      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockResolvedValue(undefined);
      mockFileService.readConfig.mockResolvedValue(existingConfig);
      mockFileService.writeConfig.mockResolvedValue(undefined);
      mockFileService.ensureDirectoryExists.mockResolvedValue(undefined);
      mockFileService.readJSON.mockResolvedValue(null);
      mockFileService.writeJSON.mockResolvedValue(undefined);

      await configService.setStorageLocation(testStoragePath);

      expect(mockFileService.writeConfig).toHaveBeenCalled();
      const writtenConfig = mockFileService.writeConfig.mock.calls[0][0];
      expect(writtenConfig.storageLocation).toBe(testStoragePath);
    });

    it('should return initialization result', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockResolvedValue(undefined);
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));
      mockFileService.createInitialConfig.mockResolvedValue({
        version: '1.0.0',
        storageLocation: testStoragePath,
      });
      mockFileService.ensureDirectoryExists.mockResolvedValue(undefined);
      mockFileService.readJSON.mockResolvedValue(null);
      mockFileService.writeJSON.mockResolvedValue(undefined);

      const result = await configService.setStorageLocation(testStoragePath);

      expect(result).toEqual({
        storageLocation: testStoragePath,
        initialized: true,
      });
    });

    it('should throw INITIALIZATION_ERROR for unexpected errors', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockRejectedValue(new Error('Unexpected error'));

      await expect(configService.setStorageLocation(testStoragePath)).rejects.toThrow(
        'INITIALIZATION_ERROR'
      );
    });

    it('should re-throw INVALID_PATH error', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockRejectedValue(new Error('INVALID_PATH'));

      await expect(configService.setStorageLocation(testStoragePath)).rejects.toThrow(
        'INVALID_PATH'
      );
    });

    it('should re-throw WRITE_ERROR', async () => {
      mockFileService.validatePath.mockResolvedValue(true);
      mockFileService.initialize.mockRejectedValue(new Error('WRITE_ERROR'));

      await expect(configService.setStorageLocation(testStoragePath)).rejects.toThrow(
        'WRITE_ERROR'
      );
    });
  });

  describe('initializeStorage', () => {
    beforeEach(() => {
      mockFileService.ensureDirectoryExists.mockResolvedValue(undefined);
      mockFileService.readJSON.mockResolvedValue(null);
      mockFileService.writeJSON.mockResolvedValue(undefined);
    });

    it('should create required directories', async () => {
      await configService.initializeStorage(testStoragePath);

      expect(mockFileService.ensureDirectoryExists).toHaveBeenCalledWith(
        `${testStoragePath}/.knowledgebase`
      );
      expect(mockFileService.ensureDirectoryExists).toHaveBeenCalledWith(
        `${testStoragePath}/notes`
      );
      expect(mockFileService.ensureDirectoryExists).toHaveBeenCalledWith(
        `${testStoragePath}/snippets`
      );
    });

    it('should create empty JSON files if they do not exist', async () => {
      await configService.initializeStorage(testStoragePath);

      expect(mockFileService.writeJSON).toHaveBeenCalledWith('projects.json', { projects: [] });
      expect(mockFileService.writeJSON).toHaveBeenCalledWith('todos.json', { todos: [] });
      expect(mockFileService.writeJSON).toHaveBeenCalledWith('milestones.json', { milestones: [] });
      expect(mockFileService.writeJSON).toHaveBeenCalledWith('tools.json', { tools: [] });
    });

    it('should not overwrite existing JSON files', async () => {
      mockFileService.readJSON.mockResolvedValue({ projects: [{ id: '1' }] });

      await configService.initializeStorage(testStoragePath);

      expect(mockFileService.writeJSON).not.toHaveBeenCalled();
    });
  });

  describe('getEmptyStructure', () => {
    it('should return empty structure for projects.json', () => {
      expect(configService.getEmptyStructure('projects.json')).toEqual({ projects: [] });
    });

    it('should return empty structure for todos.json', () => {
      expect(configService.getEmptyStructure('todos.json')).toEqual({ todos: [] });
    });

    it('should return empty structure for milestones.json', () => {
      expect(configService.getEmptyStructure('milestones.json')).toEqual({ milestones: [] });
    });

    it('should return empty structure for tools.json', () => {
      expect(configService.getEmptyStructure('tools.json')).toEqual({ tools: [] });
    });

    it('should return empty object for unknown filename', () => {
      expect(configService.getEmptyStructure('unknown.json')).toEqual({});
    });
  });

  describe('isInitialized', () => {
    it('should return true when config exists', async () => {
      configService.config = { version: '1.0.0' };

      const result = await configService.isInitialized();

      expect(result).toBe(true);
    });

    it('should return false when config is null', async () => {
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));

      const result = await configService.isInitialized();

      expect(result).toBe(false);
    });
  });

  describe('getStorageLocation', () => {
    it('should return storage location from config', async () => {
      configService.config = {
        version: '1.0.0',
        storageLocation: testStoragePath,
      };

      const result = await configService.getStorageLocation();

      expect(result).toBe(testStoragePath);
    });

    it('should return null when config is not initialized', async () => {
      mockFileService.readConfig.mockRejectedValue(new Error('CONFIG_NOT_FOUND'));

      const result = await configService.getStorageLocation();

      expect(result).toBeNull();
    });
  });
});
