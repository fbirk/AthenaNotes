import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';

// Mock the fs module with factory function
vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Import after mocking
import fs from 'node:fs/promises';
const { dailyTodosService } = await import('../../src/main/services/daily-todos-service.js');

describe('DailyTodosService', () => {
  const testStoragePath = '/test/storage';

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // Reset service state
    dailyTodosService.storageRoot = null;
    dailyTodosService.dailyTodosPath = null;
    dailyTodosService.archivePath = null;
    // Initialize for tests
    dailyTodosService.initialize(testStoragePath);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialize', () => {
    it('should set storage paths correctly', () => {
      dailyTodosService.initialize(testStoragePath);

      expect(dailyTodosService.storageRoot).toBe(testStoragePath);
      expect(dailyTodosService.dailyTodosPath).toBe(
        path.join(testStoragePath, '.knowledgebase', 'daily-todos.json')
      );
      expect(dailyTodosService.archivePath).toBe(
        path.join(testStoragePath, '.knowledgebase', 'daily-todos-archive.json')
      );
    });
  });

  describe('create', () => {
    it('should create a new daily todo with default values', async () => {
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.create({ title: 'Test todo' });

      expect(result.id).toBe('test-uuid-1234');
      expect(result.title).toBe('Test todo');
      expect(result.priority).toBe('medium');
      expect(result.completed).toBe(false);
      expect(result.completedAt).toBe(null);
      expect(result.daysOverdue).toBe(0);
    });

    it('should reject empty titles', async () => {
      await expect(dailyTodosService.create({ title: '' }))
        .rejects.toThrow('VALIDATION_ERROR: Title cannot be empty');
    });

    it('should reject whitespace-only titles', async () => {
      await expect(dailyTodosService.create({ title: '   ' }))
        .rejects.toThrow('VALIDATION_ERROR: Title cannot be empty');
    });

    it('should reject titles exceeding max length', async () => {
      const longTitle = 'a'.repeat(501);
      await expect(dailyTodosService.create({ title: longTitle }))
        .rejects.toThrow('VALIDATION_ERROR: Title exceeds 500 characters');
    });

    it('should trim title whitespace', async () => {
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.create({ title: '  Test todo  ' });

      expect(result.title).toBe('Test todo');
    });
  });

  describe('toggleComplete', () => {
    it('should toggle todo from incomplete to complete', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Test',
        priority: 'medium',
        completed: false,
        completedAt: null,
        createdAt: '2026-01-29T10:00:00Z',
        createdDate: '2026-01-29',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.toggleComplete('todo-1');

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeTruthy();
    });

    it('should toggle todo from complete to incomplete', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Test',
        priority: 'medium',
        completed: true,
        completedAt: '2026-01-29T12:00:00Z',
        createdAt: '2026-01-29T10:00:00Z',
        createdDate: '2026-01-29',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.toggleComplete('todo-1');

      expect(result.completed).toBe(false);
      expect(result.completedAt).toBe(null);
    });

    it('should throw error for non-existent todo', async () => {
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      await expect(dailyTodosService.toggleComplete('non-existent'))
        .rejects.toThrow('DAILY_TODO_NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('should delete a todo', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Test',
        priority: 'medium',
        completed: false,
        completedAt: null,
        createdAt: '2026-01-29T10:00:00Z',
        createdDate: '2026-01-29',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.delete('todo-1');

      expect(result.deleted).toBe(true);
    });

    it('should throw error for non-existent todo', async () => {
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      await expect(dailyTodosService.delete('non-existent'))
        .rejects.toThrow('DAILY_TODO_NOT_FOUND');
    });
  });

  describe('sortTodos', () => {
    it('should sort incomplete todos before completed', () => {
      const todos = [
        { id: '1', completed: true, priority: 'high', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
        { id: '2', completed: false, priority: 'low', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
      ];

      const sorted = dailyTodosService.sortTodos(todos);

      expect(sorted[0].id).toBe('2'); // incomplete first
      expect(sorted[1].id).toBe('1'); // completed second
    });

    it('should sort by priority (highest first)', () => {
      const todos = [
        { id: '1', completed: false, priority: 'low', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
        { id: '2', completed: false, priority: 'critical', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
        { id: '3', completed: false, priority: 'medium', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
        { id: '4', completed: false, priority: 'high', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
      ];

      const sorted = dailyTodosService.sortTodos(todos);

      expect(sorted[0].id).toBe('2'); // critical
      expect(sorted[1].id).toBe('4'); // high
      expect(sorted[2].id).toBe('3'); // medium
      expect(sorted[3].id).toBe('1'); // low
    });

    it('should sort by days overdue within same priority', () => {
      const todos = [
        { id: '1', completed: false, priority: 'medium', daysOverdue: 1, createdAt: '2026-01-29T10:00:00Z' },
        { id: '2', completed: false, priority: 'medium', daysOverdue: 5, createdAt: '2026-01-29T10:00:00Z' },
        { id: '3', completed: false, priority: 'medium', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
      ];

      const sorted = dailyTodosService.sortTodos(todos);

      expect(sorted[0].id).toBe('2'); // 5 days overdue
      expect(sorted[1].id).toBe('1'); // 1 day overdue
      expect(sorted[2].id).toBe('3'); // 0 days overdue
    });

    it('should sort by creation date (oldest first) within same priority and days', () => {
      const todos = [
        { id: '1', completed: false, priority: 'medium', daysOverdue: 0, createdAt: '2026-01-29T12:00:00Z' },
        { id: '2', completed: false, priority: 'medium', daysOverdue: 0, createdAt: '2026-01-29T08:00:00Z' },
        { id: '3', completed: false, priority: 'medium', daysOverdue: 0, createdAt: '2026-01-29T10:00:00Z' },
      ];

      const sorted = dailyTodosService.sortTodos(todos);

      expect(sorted[0].id).toBe('2'); // 08:00
      expect(sorted[1].id).toBe('3'); // 10:00
      expect(sorted[2].id).toBe('1'); // 12:00
    });
  });

  describe('rollover - single day', () => {
    it('should archive completed todos', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Completed task',
        priority: 'medium',
        completed: true,
        completedAt: '2026-01-28T15:00:00Z',
        createdAt: '2026-01-28T10:00:00Z',
        createdDate: '2026-01-28',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-28' };
      const mockArchive = { archivedTodos: [], retentionDays: 30 };

      // First call: load daily todos (for list which triggers rollover)
      // Second call: load archive
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockData))
        .mockResolvedValueOnce(JSON.stringify(mockArchive));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      // Mock Date to be Jan 29
      const mockDate = new Date('2026-01-29T10:00:00Z');
      vi.setSystemTime(mockDate);

      const result = await dailyTodosService.list();

      expect(result.todos).toHaveLength(0);
      // Archive should have been written
      expect(fs.writeFile).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should escalate incomplete todos priority', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Incomplete task',
        priority: 'medium',
        completed: false,
        completedAt: null,
        createdAt: '2026-01-28T10:00:00Z',
        createdDate: '2026-01-28',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-28' };
      const mockArchive = { archivedTodos: [], retentionDays: 30 };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockData))
        .mockResolvedValueOnce(JSON.stringify(mockArchive));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      // Mock Date to be Jan 29
      const mockDate = new Date('2026-01-29T10:00:00Z');
      vi.setSystemTime(mockDate);

      const result = await dailyTodosService.list();

      expect(result.todos).toHaveLength(1);
      expect(result.todos[0].priority).toBe('high'); // escalated from medium
      expect(result.todos[0].daysOverdue).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('rollover - multi-day', () => {
    it('should handle multi-day gap correctly', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Incomplete task',
        priority: 'low',
        completed: false,
        completedAt: null,
        createdAt: '2026-01-25T10:00:00Z',
        createdDate: '2026-01-25',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-25' };
      const mockArchive = { archivedTodos: [], retentionDays: 30 };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockData))
        .mockResolvedValueOnce(JSON.stringify(mockArchive));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      // Mock Date to be Jan 29 (4 days later)
      const mockDate = new Date('2026-01-29T10:00:00Z');
      vi.setSystemTime(mockDate);

      const result = await dailyTodosService.list();

      expect(result.todos).toHaveLength(1);
      // low -> medium -> high -> critical (4 escalations but capped at critical)
      expect(result.todos[0].priority).toBe('critical');
      expect(result.todos[0].daysOverdue).toBe(4);

      vi.useRealTimers();
    });
  });

  describe('priority escalation', () => {
    it('should escalate from low to medium', () => {
      const result = dailyTodosService.getNextPriority('low');
      expect(result).toBe('medium');
    });

    it('should escalate from medium to high', () => {
      const result = dailyTodosService.getNextPriority('medium');
      expect(result).toBe('high');
    });

    it('should escalate from high to critical', () => {
      const result = dailyTodosService.getNextPriority('high');
      expect(result).toBe('critical');
    });

    it('should cap at critical (no further escalation)', () => {
      const result = dailyTodosService.getNextPriority('critical');
      expect(result).toBe('critical');
    });
  });

  describe('archive cleanup', () => {
    it('should remove entries older than retention period', async () => {
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      const oldEntry = {
        id: 'old-1',
        title: 'Old task',
        priority: 'medium',
        completedAt: '2025-12-01T10:00:00Z',
        createdAt: '2025-12-01T09:00:00Z',
        createdDate: '2025-12-01',
        archivedDate: '2025-12-02',
        daysToComplete: 1
      };
      const recentEntry = {
        id: 'recent-1',
        title: 'Recent task',
        priority: 'medium',
        completedAt: '2026-01-28T10:00:00Z',
        createdAt: '2026-01-28T09:00:00Z',
        createdDate: '2026-01-28',
        archivedDate: '2026-01-28',
        daysToComplete: 0
      };
      const mockArchive = { archivedTodos: [oldEntry, recentEntry], retentionDays: 30 };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockData))
        .mockResolvedValueOnce(JSON.stringify(mockArchive));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      // Mock Date to be Jan 29
      const mockDate = new Date('2026-01-29T10:00:00Z');
      vi.setSystemTime(mockDate);

      // Trigger rollover which includes cleanup
      await dailyTodosService.list();

      // Archive should have been written with cleanup
      const writeCalls = fs.writeFile.mock.calls;
      // Find the archive write call
      const archiveWrite = writeCalls.find(call =>
        call[0].includes('daily-todos-archive.json.tmp')
      );

      if (archiveWrite) {
        const writtenArchive = JSON.parse(archiveWrite[1]);
        // Old entry should be removed (older than 30 days)
        expect(writtenArchive.archivedTodos).toHaveLength(1);
        expect(writtenArchive.archivedTodos[0].id).toBe('recent-1');
      }

      vi.useRealTimers();
    });
  });

  describe('updatePriority', () => {
    it('should update todo priority', async () => {
      // Reset mocks to clear any leftover state from previous tests
      fs.readFile.mockReset();
      fs.writeFile.mockReset();
      fs.access.mockReset();
      fs.rename.mockReset();

      const mockTodo = {
        id: 'todo-1',
        title: 'Test',
        priority: 'medium',
        completed: false,
        completedAt: null,
        createdAt: '2026-01-29T10:00:00Z',
        createdDate: '2026-01-29',
        daysOverdue: 0
      };
      const mockData = { dailyTodos: [mockTodo], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      fs.access.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.rename.mockResolvedValue(undefined);

      const result = await dailyTodosService.updatePriority('todo-1', 'high');

      expect(result.priority).toBe('high');
    });

    it('should reject invalid priority values', async () => {
      await expect(dailyTodosService.updatePriority('todo-1', 'invalid'))
        .rejects.toThrow('VALIDATION_ERROR: Invalid priority value');
    });

    it('should throw error for non-existent todo', async () => {
      fs.readFile.mockReset();
      const mockData = { dailyTodos: [], lastRolloverDate: '2026-01-29' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));

      await expect(dailyTodosService.updatePriority('non-existent', 'high'))
        .rejects.toThrow('DAILY_TODO_NOT_FOUND');
    });
  });
});
