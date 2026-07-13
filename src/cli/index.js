#!/usr/bin/env node
import meow from 'meow';
import React from 'react';
import { render } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { App } from './app.js';
import { SetupWizard } from './components/setup-wizard.js';
import { initializeServices } from './services/kb-service.js';
import { setInkInstance, cleanExit } from './lib/exit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cli = meow(`
  Usage
    $ knowledgebase [options]

  Options
    --storage, -s  Path to storage folder
    --help         Show this help
    --version      Show version

  Keybindings
    1-8            Switch between tabs
    Tab/Shift+Tab  Cycle tabs
    ?              Toggle help overlay
    q / Ctrl+C     Quit the application

  Examples
    $ knowledgebase
    $ knowledgebase --storage ~/my-knowledge-base
`, {
  importMeta: import.meta,
  version: process.env.KB_VERSION || '0.0.0-dev',
  flags: {
    storage: {
      type: 'string',
      shortFlag: 's',
    },
  },
});

/**
 * Resolve storage path from multiple sources in priority order:
 * 1. CLI argument (--storage)
 * 2. KNOWLEDGEBASE_STORAGE environment variable
 * 3. Electron bootstrap config (.dev-storage.json or storage-location.json)
 * 4. CLI-specific config (~/.knowledgebase-cli.json)
 * 5. null (trigger setup wizard)
 */
function resolveStoragePath() {
  // 1. CLI argument
  if (cli.flags.storage) {
    return cli.flags.storage;
  }

  // 2. Environment variable
  if (process.env.KNOWLEDGEBASE_STORAGE) {
    return process.env.KNOWLEDGEBASE_STORAGE;
  }

  // 3. Electron bootstrap config
  const electronPaths = [
    path.resolve(process.cwd(), '.dev-storage.json'),
    path.join(__dirname, '../../.dev-storage.json'),
  ];

  for (const configPath of electronPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const storagePath = parsed.storagePath || parsed.devStoragePath;
        if (storagePath && fs.existsSync(storagePath)) {
          return storagePath;
        }
      }
    } catch {
      // Silently continue to next source
    }
  }

  // 4. CLI-specific config
  const cliConfigPath = path.join(homedir(), '.knowledgebase-cli.json');
  try {
    if (fs.existsSync(cliConfigPath)) {
      const raw = fs.readFileSync(cliConfigPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.storagePath && fs.existsSync(parsed.storagePath)) {
        return parsed.storagePath;
      }
    }
  } catch {
    // Silently continue
  }

  // 5. No config found
  return null;
}

/**
 * Save storage path to CLI-specific config
 */
export function saveCliConfig(storagePath) {
  const cliConfigPath = path.join(homedir(), '.knowledgebase-cli.json');
  const data = { storagePath, savedAt: new Date().toISOString() };
  fs.writeFileSync(cliConfigPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Handle Ctrl+C at the process level (SIGINT)
process.on('SIGINT', () => cleanExit(0));

async function main() {
  const storagePath = resolveStoragePath();

  if (storagePath) {
    // Initialize services and launch main app
    try {
      await initializeServices(storagePath);
      setInkInstance(render(React.createElement(App), { exitOnCtrlC: false }));
    } catch (error) {
      console.error('Failed to initialize:', error.message);
      process.exit(1);
    }
  } else {
    // Launch setup wizard
    setInkInstance(render(React.createElement(SetupWizard, {
      onComplete: async (selectedPath) => {
        try {
          saveCliConfig(selectedPath);
          await initializeServices(selectedPath);
          // Re-render with main app
          setInkInstance(render(React.createElement(App), { exitOnCtrlC: false }));
        } catch (error) {
          console.error('Failed to initialize:', error.message);
          process.exit(1);
        }
      },
    }), { exitOnCtrlC: false }));
  }
}

main();
