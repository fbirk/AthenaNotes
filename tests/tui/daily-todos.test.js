/**
 * TUI Integration Tests — Daily Todos
 * Tests daily todo add, toggle, and delete functionality.
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
    NODE_NO_WARNINGS: '1',
  },
});

/**
 * Switch to Daily Todos tab and wait for it to be fully ready.
 */
async function switchToDailyTodos(terminal) {
  await expect(terminal.getByText('1:Notes', { strict: false })).toBeVisible();
  terminal.keyPress('3');
  await expect(terminal.getByText('What do you need to do today', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Review pull requests', { strict: false })).toBeVisible();
}

/**
 * Move focus from input to list and wait for the focus to transfer.
 * The navigation hint changes from "Type and Enter" to "Navigate" when list is focused.
 */
async function focusList(terminal) {
  terminal.keyDown();
  // Wait for the list-focused navigation hint to appear
  await expect(terminal.getByText('Esc to focus input', { strict: false })).toBeVisible();
}

test('should display existing daily todos', async ({ terminal }) => {
  await switchToDailyTodos(terminal);
  await expect(terminal.getByText('Update changelog', { strict: false })).toBeVisible();
});

test('should add a daily todo', async ({ terminal }) => {
  await switchToDailyTodos(terminal);

  // Input is focused by default — type the todo text
  terminal.write('Buy groceries');
  // Wait for React to process the text before pressing Enter
  await expect(terminal.getByText('Buy groceries', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  await expect(terminal.getByText('Daily todo added', { strict: false })).toBeVisible();
});

test('should toggle a daily todo', async ({ terminal }) => {
  await switchToDailyTodos(terminal);
  await focusList(terminal);

  // Space to toggle first item to completed
  terminal.keyPress(Key.Space);
  await expect(terminal.getByText('Todo completed', { strict: false })).toBeVisible();
});

test('should delete a daily todo', async ({ terminal }) => {
  await switchToDailyTodos(terminal);
  await focusList(terminal);

  // d to delete (no confirm dialog for daily todos)
  terminal.keyPress('d');
  await expect(terminal.getByText('Daily todo deleted', { strict: false })).toBeVisible();
});
