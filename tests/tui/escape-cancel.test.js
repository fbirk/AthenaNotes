/**
 * TUI Integration Tests — Escape cancels forms (cross-tab regression)
 *
 * The tabs driven through the shared `useKeyboard` context (Projects,
 * Snippets, Roadmaps, Tools, Shortcuts) previously trapped the user inside a
 * create form: the global keyboard hook swallowed Escape and the tab never
 * exited its form mode, so every subsequent key appeared to do nothing.
 * Each tab must now return to its list when Escape is pressed in a form.
 */
import path from 'node:path';
import { test, expect } from '@microsoft/tui-test';
import { createTestStorageSync, cleanupTestStorage } from './helpers/fixtures.js';

const tempDir = createTestStorageSync();
const cliEntry = path.resolve('src/cli/index.js');

process.on('exit', () => cleanupTestStorage(tempDir));

test.use({
  program: { file: 'node', args: [cliEntry, '--storage', tempDir] },
  rows: 30,
  columns: 120,
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
});

/**
 * Switch to a tab via its number key, open the create form with `n`, then
 * cancel with Escape and assert the form heading is gone.
 * @param {import('@microsoft/tui-test').Terminal} terminal
 * @param {string} numberKey - tab number key ('4'..'7')
 * @param {string} formHeading - unique text shown by the create form
 */
async function assertEscapeCancelsCreate(terminal, numberKey, formHeading) {
  await expect(terminal.getByText('1:Notes', { strict: false })).toBeVisible();
  terminal.keyPress(numberKey);
  // Let the tab mount and register its keyboard handlers.
  await new Promise(resolve => setTimeout(resolve, 400));

  terminal.write('n');
  await expect(terminal.getByText(formHeading, { strict: false })).toBeVisible({ timeout: 8000 });

  terminal.keyEscape();
  await expect(terminal.getByText(formHeading, { strict: false })).not.toBeVisible();
}

test('Projects: Escape cancels the create form', async ({ terminal }) => {
  await assertEscapeCancelsCreate(terminal, '4', 'New Project');
});

test('Snippets: Escape cancels the create form', async ({ terminal }) => {
  await assertEscapeCancelsCreate(terminal, '5', 'New Snippet');
});

test('Roadmaps: Escape cancels the create form', async ({ terminal }) => {
  await assertEscapeCancelsCreate(terminal, '6', 'New Milestone');
});

test('Tools: Escape cancels the create form', async ({ terminal }) => {
  await assertEscapeCancelsCreate(terminal, '7', 'New Tool');
});
