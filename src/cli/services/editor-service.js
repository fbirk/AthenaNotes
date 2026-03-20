import { writeFile, readFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Determines the external editor command to use.
 * Checks $VISUAL, then $EDITOR, then falls back to platform default.
 * @returns {string} The editor command.
 */
function getEditorCommand() {
  if (process.env.VISUAL) {
    return process.env.VISUAL;
  }
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }
  if (process.platform === 'win32') {
    return 'notepad';
  }
  return 'vi';
}

/**
 * Opens content in an external editor for editing.
 * Creates a temporary file, launches the editor, waits for it to close,
 * then reads back the result and cleans up.
 *
 * @param {string} content - The initial content to edit.
 * @param {string} [fileExtension='.md'] - File extension for the temp file.
 * @returns {Promise<{changed: boolean, content: string}>} The editing result.
 */
export async function editInExternalEditor(content = '', fileExtension = '.md') {
  const tempDir = await mkdtemp(join(tmpdir(), 'knowledgebase-'));
  const tempFile = join(tempDir, `edit${fileExtension}`);

  await writeFile(tempFile, content, 'utf-8');

  const editor = getEditorCommand();
  const parts = editor.split(/\s+/);
  const command = parts[0];
  const args = [...parts.slice(1), tempFile];

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });

      child.on('exit', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to launch editor "${editor}": ${err.message}`));
      });
    });

    const updatedContent = await readFile(tempFile, 'utf-8');
    const changed = updatedContent !== content;

    return { changed, content: updatedContent };
  } finally {
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
    try {
      const { rmdir } = await import('node:fs/promises');
      await rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}
