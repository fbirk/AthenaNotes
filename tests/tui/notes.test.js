/**
 * TUI Integration Tests — Notes
 * Tests notes CRUD operations and project filtering.
 *
 * Tests share a single temp storage directory. Non-destructive tests first,
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
    MOCK_EDITOR_CONTENT: '# Edited Content\n\nThis is mock editor content.',
    NODE_NO_WARNINGS: '1',
  },
});

/**
 * Helper: wait for the Notes tab to be fully ready
 * (shortcuts registered in status bar).
 */
async function waitForNotesReady(terminal) {
  await expect(terminal.getByText('n:New note', { strict: false })).toBeVisible();
}

test('should display existing notes on load', async ({ terminal }) => {
  await waitForNotesReady(terminal);
  await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Project Note', { strict: false })).toBeVisible();
});

test('should filter notes by project', async ({ terminal }) => {
  await waitForNotesReady(terminal);
  await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

  terminal.keyPress('f');
  await expect(terminal.getByText('Filter: TestProject', { strict: false })).toBeVisible();

  terminal.keyPress('f');
  await expect(terminal.getByText('Filter: SecondProject', { strict: false })).toBeVisible();

  terminal.keyPress('f');
  await expect(terminal.getByText('Filter: All projects', { strict: false })).toBeVisible();
});

test('should create a new note without project', async ({ terminal }) => {
  await waitForNotesReady(terminal);

  // Step 1: n → title input
  terminal.write('n');
  await expect(terminal.getByText('New Note', { strict: false })).toBeVisible();

  // Step 2: Type title and submit
  terminal.write('My New Note');
  await expect(terminal.getByText('My New Note', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  // Step 3: Project selector — select None (already selected)
  await expect(terminal.getByText('None', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  // Step 4: Editor opens, mock writes content
  await expect(terminal.getByText('Created note', { strict: false })).toBeVisible({ timeout: 15000 });
});

test('should create a new note with project', async ({ terminal }) => {
  await waitForNotesReady(terminal);

  terminal.write('n');
  // Wait for the create dialog's "Title:" prompt (specific to create mode)
  await expect(terminal.getByText('Title:', { strict: false })).toBeVisible();

  terminal.write('Project-Linked Note');
  await expect(terminal.getByText('Project-Linked Note', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  // Move down to TestProject
  await expect(terminal.getByText('None', { strict: false })).toBeVisible();
  terminal.keyDown();
  terminal.keyPress(Key.Enter);

  await expect(terminal.getByText('Created note', { strict: false })).toBeVisible({ timeout: 15000 });
});

test('should edit an existing note', async ({ terminal }) => {
  await waitForNotesReady(terminal);
  await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

  terminal.write('e');
  await expect(terminal.getByText('Edit Note', { strict: false })).toBeVisible();

  // Keep title
  terminal.keyPress(Key.Enter);

  // Wait for project selector
  await expect(terminal.getByText('None', { strict: false })).toBeVisible();
  terminal.keyPress(Key.Enter);

  await expect(terminal.getByText('Note saved', { strict: false })).toBeVisible({ timeout: 15000 });
});

test('should delete an existing note', async ({ terminal }) => {
  await waitForNotesReady(terminal);
  await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

  terminal.write('d');
  await expect(terminal.getByText('Confirm', { strict: false })).toBeVisible();

  terminal.keyPress('y');
  await expect(terminal.getByText('Deleted', { strict: false })).toBeVisible({ timeout: 10000 });
});
