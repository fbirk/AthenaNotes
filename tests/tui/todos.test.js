/**
 * TUI Integration Tests — Todos
 * Tests todo CRUD operations, filtering, and priority management.
 *
 * Tests share a single temp storage. Non-destructive tests first,
 * destructive test (delete) last.
 */
import path from 'node:path';
import { test, expect, Key } from '@microsoft/tui-test';
import { createTestStorageSync, cleanupTestStorage } from './helpers/fixtures.js';

const tempDir = createTestStorageSync();
const cliEntry = path.resolve('src/cli/index.js');
const mockEditor = path.resolve('tests/tui/helpers/mock-editor.js');

process.on('exit', () => cleanupTestStorage(tempDir));

test.use({
  program: { file: 'node', args: [cliEntry, '--storage', tempDir] },
  rows: 30,
  columns: 120,
  env: {
    ...process.env,
    EDITOR: `node ${mockEditor}`,
    MOCK_EDITOR_CONTENT: 'Todo description content',
    NODE_NO_WARNINGS: '1',
  },
});

/**
 * Switch to Todos tab and wait until it's fully interactive.
 * Waits for todos-specific content (Fix login bug) which confirms
 * the tab has loaded its data and rendered.
 */
async function switchToTodos(terminal) {
  await expect(terminal.getByText('1:Notes', { strict: false })).toBeVisible();
  terminal.keyPress('2');
  // Wait for todos-specific content AND status bar shortcuts
  await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Space:Toggle', { strict: false })).toBeVisible();
  // Brief delay for useInput handlers to register after React render
  await new Promise(resolve => setTimeout(resolve, 300));
}

test('should display existing todos', async ({ terminal }) => {
  await switchToTodos(terminal);
  await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Write documentation', { strict: false })).toBeVisible();
});

test('should filter todos by status', async ({ terminal }) => {
  await switchToTodos(terminal);

  terminal.keyPress('f');
  // In 'active' filter, Fix login bug shown (active), Write documentation hidden
  await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();

  terminal.keyPress('f');
  // In 'completed' filter, Write documentation shown
  await expect(terminal.getByText('Write documentation', { strict: false })).toBeVisible();

  terminal.keyPress('f');
  // Back to all
  await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();
});

test('should toggle todo completion', async ({ terminal }) => {
  await switchToTodos(terminal);

  terminal.keyPress(Key.Space);
  await expect(terminal.getByText('Todo completed', { strict: false })).toBeVisible();

  terminal.keyPress(Key.Space);
  await expect(terminal.getByText('Todo reopened', { strict: false })).toBeVisible();
});

test('should create a new todo with priority and project', async ({ terminal }) => {
  await switchToTodos(terminal);

  // Step 1: n → title input
  terminal.write('n');
  await expect(terminal.getByText('New Todo', { strict: false })).toBeVisible();

  // Step 2: type title and submit
  terminal.write('Implement feature X');
  await expect(terminal.getByText('Implement feature X', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  // Step 3: Priority selector
  await expect(terminal.getByText('low', { strict: false })).toBeVisible();
  await expect(terminal.getByText('medium', { strict: false })).toBeVisible();
  await expect(terminal.getByText('high', { strict: false })).toBeVisible();
  terminal.keyRight();
  terminal.keyPress(Key.Enter);

  // Step 4: Project selector
  await expect(terminal.getByText('None', { strict: false })).toBeVisible();
  await expect(terminal.getByText('TestProject', { strict: false })).toBeVisible();
  terminal.keyDown();
  terminal.keyPress(Key.Enter);

  // Step 5: Editor runs, todo is created
  await expect(terminal.getByText('Todo created', { strict: false })).toBeVisible({ timeout: 15000 });
});

test('should edit a todo', async ({ terminal }) => {
  await switchToTodos(terminal);

  // Step 1: e → title input
  terminal.write('e');
  await expect(terminal.getByText('Edit Todo', { strict: false })).toBeVisible();

  // Step 2: Keep title
  terminal.keyPress(Key.Enter);

  // Step 3: Priority selector
  await expect(terminal.getByText('low', { strict: false })).toBeVisible();
  await expect(terminal.getByText('medium', { strict: false })).toBeVisible();
  terminal.keyLeft();
  terminal.keyPress(Key.Enter);

  // Step 4: Project selector
  await expect(terminal.getByText('None', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  // Step 5: Editor runs
  await expect(terminal.getByText('Todo updated', { strict: false })).toBeVisible({ timeout: 15000 });
});

test('should delete a todo', async ({ terminal }) => {
  await switchToTodos(terminal);

  terminal.write('d');
  await expect(terminal.getByText('Confirm', { strict: false })).toBeVisible();

  terminal.keyPress('y');
  await expect(terminal.getByText('Todo deleted', { strict: false })).toBeVisible({ timeout: 10000 });
});
