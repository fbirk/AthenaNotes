#!/usr/bin/env node
/**
 * Mock editor for TUI integration tests.
 * Reads content from $MOCK_EDITOR_CONTENT env var (or a file at
 * $MOCK_EDITOR_CONTENT_FILE) and writes it to the temp file passed
 * as the last argument. If neither is set, leaves the file unchanged.
 */
import fs from 'node:fs';

const filePath = process.argv[process.argv.length - 1];

if (process.env.MOCK_EDITOR_CONTENT_FILE) {
  try {
    const content = fs.readFileSync(process.env.MOCK_EDITOR_CONTENT_FILE, 'utf-8');
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch {
    // If content file doesn't exist, leave the file unchanged
  }
} else if (process.env.MOCK_EDITOR_CONTENT) {
  fs.writeFileSync(filePath, process.env.MOCK_EDITOR_CONTENT, 'utf-8');
}

process.exit(0);
