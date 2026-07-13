/**
 * TUI Integration Tests — Navigation
 * Tests tab switching and quit functionality.
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

/** Helper to poll for process exit. */
function waitForExit(terminal, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Process did not exit')), timeoutMs);
    const check = () => {
      if (terminal.exitResult !== null) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

test.describe('Tab navigation', () => {
  test('should start on Notes tab', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();
    await expect(terminal.getByText('n:New note', { strict: false })).toBeVisible();
  });

  test('should navigate between tabs with Tab key', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

    // Tab -> Todos
    terminal.keyPress(Key.Tab);
    await expect(terminal.getByText('Space:Toggle', { strict: false })).toBeVisible();

    // Tab -> Daily Todos
    terminal.keyPress(Key.Tab);
    await expect(terminal.getByText('What do you need to do today', { strict: false })).toBeVisible();

    // Shift+Tab -> back to Todos
    terminal.keyPress(Key.Tab, { shift: true });
    await expect(terminal.getByText('Space:Toggle', { strict: false })).toBeVisible();
  });

  test('should switch to tab with number keys', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

    // Press 5 -> Snippets (empty, shows "No snippets found")
    terminal.keyPress('5');
    await expect(terminal.getByText('No snippets found', { strict: false })).toBeVisible();

    // Press 2 -> Todos (shows todo data)
    terminal.keyPress('2');
    await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();

    // Press 4 -> Projects (shows project names)
    terminal.keyPress('4');
    await expect(terminal.getByText('TestProject', { strict: false })).toBeVisible();

    // Press 8 -> Shortcuts (there are 8 tabs; the number key must reach the last)
    terminal.keyPress('8');
    await expect(terminal.getByText('Keyboard Shortcuts', { strict: false })).toBeVisible();
  });
});

test.describe('Quit', () => {
  test('should quit with q from Notes tab', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

    terminal.keyPress('q');
    await waitForExit(terminal);
    expect(terminal.exitResult?.exitCode).toBe(0);
  });

  test('should quit with Ctrl+C from Todos tab', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

    terminal.keyPress('2');
    await expect(terminal.getByText('Fix login bug', { strict: false })).toBeVisible();

    terminal.keyCtrlC();
    await waitForExit(terminal);
    expect(terminal.exitResult).not.toBeNull();
  });

  test('should quit with Escape then q from Daily Todos', async ({ terminal }) => {
    await expect(terminal.getByText('Test Note One', { strict: false })).toBeVisible();

    terminal.keyPress('3');
    await expect(terminal.getByText('Daily Todos', { strict: false })).toBeVisible();

    // Escape to unfocus the text input
    terminal.keyEscape();

    terminal.keyPress('q');
    await waitForExit(terminal);
    expect(terminal.exitResult?.exitCode).toBe(0);
  });
});
