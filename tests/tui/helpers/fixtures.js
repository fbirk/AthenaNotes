/**
 * Test fixture helpers for TUI integration tests.
 * Creates and manages temporary storage directories with seed data.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Get today's date formatted as YYYY-MM-DD.
 * Used for daily todos lastRolloverDate to prevent rollover on test run.
 */
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Seed data definitions */
const SEED_DATA = {
  projects: [
    { id: 'proj-001', name: 'TestProject', description: 'A test project', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'proj-002', name: 'SecondProject', description: 'Another project', status: 'active', createdAt: '2026-01-02T00:00:00.000Z' },
  ],
  todos: [
    { id: 'todo-001', title: 'Fix login bug', description: '', completed: false, priority: 'high', projectId: 'proj-001', deadline: null, createdAt: '2026-01-10T00:00:00.000Z', modifiedAt: '2026-01-10T00:00:00.000Z' },
    { id: 'todo-002', title: 'Write documentation', description: '', completed: true, priority: 'low', projectId: null, deadline: null, createdAt: '2026-01-11T00:00:00.000Z', modifiedAt: '2026-01-11T00:00:00.000Z' },
  ],
  dailyTodos: {
    dailyTodos: [
      { id: 'dt-001', text: 'Review pull requests', completed: false, priority: 'medium', createdAt: '2026-03-20T08:00:00.000Z' },
      { id: 'dt-002', text: 'Update changelog', completed: false, priority: 'low', createdAt: '2026-03-20T09:00:00.000Z' },
    ],
    lastRolloverDate: getTodayString(),
  },
  dailyTodosArchive: { archivedTodos: [] },
  config: { theme: 'dark', createdAt: '2026-01-01T00:00:00.000Z' },
  milestones: [],
  tools: [],
  shortcuts: [
    { id: 'sc-001', program: 'VSCode', shortcut: 'Ctrl+P', description: 'Quick open file' },
    { id: 'sc-002', program: 'VSCode', shortcut: 'Ctrl+Shift+P', description: 'Command palette' },
  ],
};

const NOTE_ONE = `---
id: "note-001"
title: "Test Note One"
createdAt: "2026-01-15T00:00:00.000Z"
modifiedAt: "2026-01-15T00:00:00.000Z"
tags: []
---

# Test Note One

This is the first test note content.
`;

const PROJECT_NOTE = `---
id: "note-002"
title: "Project Note"
createdAt: "2026-01-16T00:00:00.000Z"
modifiedAt: "2026-01-16T00:00:00.000Z"
projectId: "proj-001"
tags: []
---

# Project Note

This note belongs to TestProject.
`;

/**
 * Write all seed data files into the given storage directory.
 * @param {string} storagePath - Absolute path to the storage directory
 */
function writeSeedData(storagePath) {
  const kbDir = path.join(storagePath, '.knowledgebase');
  const notesDir = path.join(storagePath, 'notes');
  const projectNotesDir = path.join(notesDir, 'TestProject');
  const snippetsDir = path.join(storagePath, 'snippets');

  // Create directories
  fs.mkdirSync(kbDir, { recursive: true });
  fs.mkdirSync(projectNotesDir, { recursive: true });
  fs.mkdirSync(snippetsDir, { recursive: true });

  // Write JSON data files
  fs.writeFileSync(path.join(kbDir, 'projects.json'), JSON.stringify({ projects: SEED_DATA.projects }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(kbDir, 'todos.json'), JSON.stringify({ todos: SEED_DATA.todos }, null, 2), 'utf-8');

  // Dynamic lastRolloverDate to prevent rollover
  const dailyTodos = { ...SEED_DATA.dailyTodos, lastRolloverDate: getTodayString() };
  fs.writeFileSync(path.join(kbDir, 'daily-todos.json'), JSON.stringify(dailyTodos, null, 2), 'utf-8');

  fs.writeFileSync(path.join(kbDir, 'daily-todos-archive.json'), JSON.stringify(SEED_DATA.dailyTodosArchive, null, 2), 'utf-8');
  fs.writeFileSync(path.join(kbDir, 'config.json'), JSON.stringify(SEED_DATA.config, null, 2), 'utf-8');
  fs.writeFileSync(path.join(kbDir, 'milestones.json'), JSON.stringify({ milestones: SEED_DATA.milestones }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(kbDir, 'tools.json'), JSON.stringify({ tools: SEED_DATA.tools }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(kbDir, 'shortcuts.json'), JSON.stringify({ shortcuts: SEED_DATA.shortcuts }, null, 2), 'utf-8');

  // Write note files
  fs.writeFileSync(path.join(notesDir, 'test-note-one.md'), NOTE_ONE, 'utf-8');
  fs.writeFileSync(path.join(projectNotesDir, 'project-note.md'), PROJECT_NOTE, 'utf-8');
}

/**
 * Create a temporary storage directory with seed data (synchronous).
 * @returns {string} Absolute path to the created temp storage directory
 */
export function createTestStorageSync() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-tui-test-'));
  writeSeedData(tempDir);
  return tempDir;
}

/**
 * Reset the test storage to its initial seed data state.
 * Removes all files and re-writes seed data.
 * @param {string} storagePath - Path to reset
 */
export function resetTestStorage(storagePath) {
  // Remove and recreate
  fs.rmSync(storagePath, { recursive: true, force: true });
  fs.mkdirSync(storagePath, { recursive: true });
  writeSeedData(storagePath);
}

/**
 * Clean up the test storage directory.
 * @param {string} storagePath - Path to remove
 */
export function cleanupTestStorage(storagePath) {
  try {
    fs.rmSync(storagePath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
