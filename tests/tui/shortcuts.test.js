/**
 * TUI Integration Tests — Shortcuts
 * Tests shortcut CRUD operations plus the keyboard regressions:
 *  - Number key `8` switches to the Shortcuts tab (there are 8 tabs, not 7).
 *  - Escape cancels an open create/edit/search form instead of trapping the
 *    user in it (the tab is driven through the shared `useKeyboard` context).
 *
 * Tests share a single temp storage. Non-destructive tests first,
 * destructive test (delete) last.
 */
import path from 'node:path';
import { test, expect, Key } from '@microsoft/tui-test';
import { createTestStorageSync, cleanupTestStorage } from './helpers/fixtures.js';

const tempDir = createTestStorageSync();
const cliEntry = path.resolve('src/cli/index.js');

process.on('exit', () => cleanupTestStorage(tempDir));

test.use({
  program: { file: 'node', args: [cliEntry, '--storage', tempDir] },
  rows: 30,
  columns: 120,
  env: {
    ...process.env,
    NODE_NO_WARNINGS: '1',
  },
});

/**
 * Switch to the Shortcuts tab via the number key `8` and wait until it's
 * interactive. Using `8` also exercises the tab-switch regression.
 */
async function switchToShortcuts(terminal) {
  await expect(terminal.getByText('1:Notes', { strict: false })).toBeVisible();
  terminal.keyPress('8');
  await expect(terminal.getByText('Keyboard Shortcuts', { strict: false })).toBeVisible();
  await expect(terminal.getByText('n:New', { strict: false })).toBeVisible();
  // Brief delay for useInput/context handlers to register after React render
  await new Promise(resolve => setTimeout(resolve, 300));
}

test('should switch to Shortcuts tab with number key 8', async ({ terminal }) => {
  await switchToShortcuts(terminal);
  await expect(terminal.getByText('Ctrl+P', { strict: false })).toBeVisible();
});

test('should display existing shortcuts', async ({ terminal }) => {
  await switchToShortcuts(terminal);
  await expect(terminal.getByText('VSCode', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Quick open file', { strict: false })).toBeVisible();
  await expect(terminal.getByText('Command palette', { strict: false })).toBeVisible();
});

test('should open the New Shortcut form with n', async ({ terminal }) => {
  await switchToShortcuts(terminal);
  terminal.write('n');
  await expect(terminal.getByText('New Shortcut', { strict: false })).toBeVisible();
});

test('should cancel the New Shortcut form with Escape (regression)', async ({ terminal }) => {
  await switchToShortcuts(terminal);

  terminal.write('n');
  await expect(terminal.getByText('New Shortcut', { strict: false })).toBeVisible();

  // Escape must return to the list, not leave the form on screen.
  terminal.keyEscape();
  await expect(terminal.getByText('New Shortcut', { strict: false })).not.toBeVisible();
  await expect(terminal.getByText('Keyboard Shortcuts', { strict: false })).toBeVisible();

  // The list must still be interactive: n reopens the form afterwards.
  terminal.write('n');
  await expect(terminal.getByText('New Shortcut', { strict: false })).toBeVisible();
});

test('should open and cancel the Edit Shortcut form with Escape (regression)', async ({ terminal }) => {
  await switchToShortcuts(terminal);

  terminal.write('e');
  await expect(terminal.getByText('Edit Shortcut', { strict: false })).toBeVisible();

  terminal.keyEscape();
  await expect(terminal.getByText('Edit Shortcut', { strict: false })).not.toBeVisible();
  await expect(terminal.getByText('Keyboard Shortcuts', { strict: false })).toBeVisible();
});

test('should cancel the Search form with Escape (regression)', async ({ terminal }) => {
  await switchToShortcuts(terminal);

  terminal.write('/');
  await expect(terminal.getByText('Search Shortcuts', { strict: false })).toBeVisible();

  terminal.keyEscape();
  await expect(terminal.getByText('Search Shortcuts', { strict: false })).not.toBeVisible();
  await expect(terminal.getByText('Keyboard Shortcuts', { strict: false })).toBeVisible();
});

test('should create a new shortcut', async ({ terminal }) => {
  await switchToShortcuts(terminal);

  terminal.write('n');
  await expect(terminal.getByText('New Shortcut', { strict: false })).toBeVisible();

  // Walk the three create steps, letting each render before advancing.
  const step = async (value) => {
    terminal.write(value);
    await new Promise(resolve => setTimeout(resolve, 400));
    terminal.keyPress(Key.Enter);
    await new Promise(resolve => setTimeout(resolve, 400));
  };
  await step('Firefox');   // program
  await step('Ctrl+T');    // shortcut
  await step('New tab');   // description

  // The new shortcut must appear in the list (persistent, unlike the feedback).
  await expect(terminal.getByText('Ctrl+T', { strict: false })).toBeVisible({ timeout: 10000 });
  await expect(terminal.getByText('New tab', { strict: false })).toBeVisible();
});

test('should delete a shortcut', async ({ terminal }) => {
  await switchToShortcuts(terminal);

  terminal.write('d');
  await expect(terminal.getByText('Confirm', { strict: false })).toBeVisible();

  terminal.keyPress('y');
  await expect(terminal.getByText('Deleted shortcut', { strict: false })).toBeVisible({ timeout: 10000 });
});
