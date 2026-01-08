# Quickstart Guide: Developer Knowledge Base

**Feature**: 001-developer-knowledge-base  
**Date**: 2026-01-08  
**Target Audience**: Developers implementing this feature

## Overview

This guide helps you get started building the Developer Knowledge Base application. Follow these steps to set up your development environment, understand the architecture, and begin implementation.

---

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: For version control
- **Windows 10/11**: Target platform (cross-platform code, but targeting Windows)
- **Code Editor**: VS Code recommended (Electron debugging support)

---

## Project Setup

### 1. Initialize Project

```bash
# Create project directory (if not already exists)
cd C:\Users\BirkF\source\repos\KnowledgeBase

# Initialize npm project
npm init -y

# Update package.json with project details
```

**package.json** starter:
```json
{
  "name": "developer-knowledge-base",
  "version": "1.0.0",
  "description": "Personal knowledge base for developers",
  "main": "src/main/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src/",
    "package": "electron-builder"
  },
  "keywords": ["knowledge-base", "electron", "notes"],
  "author": "",
  "license": "MIT"
}
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install electron@latest marked

# Development dependencies
npm install -D vite vite-plugin-electron electron-builder
npm install -D vitest @vitest/ui happy-dom
npm install -D @playwright/test
npm install -D eslint @eslint/js

# Optional: TypeScript definitions for better IDE support
npm install -D @types/node @types/marked
```

### 3. Project Structure

Create the following directory structure:

```bash
# Create source directories
mkdir -p src/main/services
mkdir -p src/renderer/styles
mkdir -p src/renderer/js/components
mkdir -p src/renderer/js/services
mkdir -p src/renderer/assets
mkdir -p src/shared

# Create test directories
mkdir -p tests/unit/services
mkdir -p tests/unit/components
mkdir -p tests/integration
mkdir -p tests/e2e
```

### 4. Configuration Files

**vite.config.js**:
```javascript
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'src/main/main.js',
      },
      {
        entry: 'src/main/preload.js',
        onstart(options) {
          options.reload();
        },
      },
    ]),
  ],
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
});
```

**vitest.config.js**:
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

**playwright.config.js**:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**.eslintrc.json**:
```json
{
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off"
  }
}
```

---

## Architecture Overview

### Main Process (Node.js)
- **Entry**: `src/main/main.js`
- **Role**: Window management, file system operations, native OS integration
- **Security**: Full Node.js access, no direct web content interaction

### Preload Script
- **Entry**: `src/main/preload.js`
- **Role**: Secure bridge between main and renderer via `contextBridge`
- **Security**: Exposes only specific, validated APIs to renderer

### Renderer Process (Web)
- **Entry**: `src/renderer/index.html`
- **Role**: UI rendering, user interactions, application logic
- **Security**: No Node.js access, communicates via IPC only

### IPC Communication Flow
```
User Action (Renderer) 
  → window.knowledgeBase.notes.create() 
  → IPC channel 
  → Main process validates & processes 
  → File system operation 
  → Response via IPC 
  → Renderer updates UI
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Set up Electron app skeleton and file system services.

**Tasks**:
1. Create `src/main/main.js` with basic Electron app
2. Create `src/main/preload.js` with IPC bridge
3. Create `src/renderer/index.html` with basic layout
4. Implement `src/main/services/file-service.js` for file operations
5. Implement `src/main/services/config-service.js` for configuration
6. Wire up IPC handlers for config API
7. Create first-run setup wizard UI

**Acceptance**:
- App launches and displays window
- First-run setup allows folder selection
- Config is saved and persisted

**Reference**: See `contracts/ipc-api.md` for Configuration API

---

### Phase 2: Notes Management (Week 2)

**Goal**: Implement note creation, editing, viewing, and navigation.

**Tasks**:
1. Implement notes IPC handlers in main process
2. Create `src/renderer/js/services/markdown.js` for rendering
3. Create `src/renderer/js/components/notes.js` for UI
4. Implement note list view
5. Implement note editor (preview/edit toggle)
6. Implement note saving (with debounce)
7. Add markdown preview rendering

**Acceptance**:
- User can create, edit, save, and view notes
- Markdown renders correctly
- Notes persist to file system
- Meets SC-001 (create/save/view in <30s)

**Reference**: See `data-model.md` for Note entity, `contracts/ipc-api.md` for Notes API

---

### Phase 3: Projects & Organization (Week 3)

**Goal**: Project creation and note-project association.

**Tasks**:
1. Implement projects IPC handlers
2. Create `src/renderer/js/components/projects.js` for UI
3. Implement project list view
4. Add note-to-project association UI
5. Implement folder-based organization
6. Add project filtering in notes view

**Acceptance**:
- User can create projects
- User can associate notes with projects
- Notes appear in project context
- Folder structure reflects projects

**Reference**: See `data-model.md` for Project entity, `contracts/ipc-api.md` for Projects API

---

### Phase 4: Todos (Pinned Section) (Week 4)

**Goal**: Todo management with persistent pinned panel.

**Tasks**:
1. Implement todos IPC handlers
2. Create `src/renderer/js/components/todos.js` for UI
3. Implement pinned panel (fixed position)
4. Add todo CRUD operations
5. Implement priority and deadline sorting
6. Add project-todo linking
7. Implement collapse/expand functionality

**Acceptance**:
- Todo panel always visible (pinned)
- Todos sorted correctly (priority → deadline)
- User can create, complete, delete todos
- Panel is collapsible
- Meets FR-015 through FR-020

**Reference**: See `data-model.md` for Todo entity, `contracts/ipc-api.md` for Todos API

---

### Phase 5: Code Snippets & Search (Week 5)

**Goal**: Snippet storage and tag-based search.

**Tasks**:
1. Implement snippets IPC handlers
2. Create `src/renderer/js/components/snippets.js` for UI
3. Implement snippet editor with syntax highlighting
4. Build search index in main process
5. Implement search functionality
6. Add tag filtering UI
7. Optimize for 1000+ snippets

**Acceptance**:
- User can create, edit, delete snippets
- Code displays with syntax highlighting
- Search returns results in <2s for 1000+ snippets (SC-006)
- Tag filtering works correctly

**Reference**: See `data-model.md` for Snippet entity, `contracts/ipc-api.md` for Snippets API

---

### Phase 6: Roadmaps & Milestones (Week 6)

**Goal**: Project roadmap visualization.

**Tasks**:
1. Implement milestones IPC handlers
2. Create `src/renderer/js/components/roadmaps.js` for UI
3. Implement milestone CRUD
4. Create roadmap timeline view
5. Add project-milestone association
6. Implement summary view for all roadmaps

**Acceptance**:
- User can add milestones to projects
- Milestones display in chronological order
- Summary view shows all projects
- Meets FR-021 through FR-024

**Reference**: See `data-model.md` for Milestone entity, `contracts/ipc-api.md` for Milestones API

---

### Phase 7: Software Tools (Week 7)

**Goal**: Quick-launch tool entries.

**Tasks**:
1. Implement tools IPC handlers
2. Implement `src/main/services/shell-service.js` for launching
3. Create `src/renderer/js/components/tools.js` for UI
4. Add tool CRUD operations
5. Implement launch functionality
6. Add category organization

**Acceptance**:
- User can add tool entries
- Clicking tool launches app/URL
- Tools organized by category
- Meets FR-030 through FR-032

**Reference**: See `data-model.md` for Tool entity, `contracts/ipc-api.md` for Tools API

---

### Phase 8: Cross-Referencing & Navigation (Week 8)

**Goal**: Note-to-note links and navigation.

**Tasks**:
1. Implement `[[Title]]` link parsing in markdown renderer
2. Add link validation (check if target exists)
3. Implement click handler for internal links
4. Add broken link detection
5. Implement note preloading for instant navigation

**Acceptance**:
- User can create links with `[[Title]]` syntax
- Clicking link navigates to target note (<1s, SC-005)
- Broken links are clearly indicated
- Meets FR-006, FR-007

**Reference**: See `data-model.md` Note relationships section

---

### Phase 9: Polish & Performance (Week 9)

**Goal**: Optimize performance and user experience.

**Tasks**:
1. Implement caching strategy (markdown, rendered HTML)
2. Add lazy loading for large data sets
3. Optimize app launch time (<3s, SC-007)
4. Add keyboard shortcuts
5. Implement autosave for notes
6. Add loading indicators
7. Polish UI/UX transitions

**Acceptance**:
- All success criteria met (SC-001 through SC-009)
- App feels responsive
- No performance regressions

---

### Phase 10: Testing & Documentation (Week 10)

**Goal**: Comprehensive testing and user documentation.

**Tasks**:
1. Write unit tests for all services
2. Write integration tests for file operations
3. Write E2E tests for all user stories (P1-P8)
4. Add contract tests for IPC API
5. Create user documentation
6. Perform accessibility audit (WCAG 2.1 AA)
7. Test on different Windows versions

**Acceptance**:
- Test coverage >80%
- All P1-P3 user stories pass E2E tests
- No critical bugs
- Ready for release

---

## Development Workflow

### Daily Development
```bash
# Start development server
npm run dev

# In another terminal, run tests in watch mode
npm run test -- --watch

# Run linter
npm run lint
```

### Before Committing
```bash
# Run all tests
npm run test

# Run E2E tests
npm run test:e2e

# Fix linting issues
npm run lint -- --fix
```

### Building for Production
```bash
# Build application
npm run build

# Package for Windows
npm run package
```

---

## Key Files to Create First

1. **src/main/main.js**: Electron entry point
2. **src/main/preload.js**: IPC bridge
3. **src/renderer/index.html**: Main UI
4. **src/renderer/js/app.js**: Application initialization
5. **src/main/services/file-service.js**: File operations
6. **src/main/services/config-service.js**: Configuration management

**Starter Template for main.js**:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

---

## Debugging Tips

### Electron Main Process
- Use `console.log()` → output appears in terminal
- Use VS Code debugger with Electron launch config
- Check main process crashes in terminal

### Renderer Process
- Use browser DevTools (F12)
- Check Console tab for errors
- Use Network tab for IPC communication debugging

### Common Issues
- **White screen**: Check renderer errors in DevTools
- **IPC not working**: Verify preload script is loaded
- **File not found**: Check paths are absolute

---

## Resources

- **Electron Docs**: https://www.electronjs.org/docs/latest
- **Vite Docs**: https://vitejs.dev/
- **marked.js Docs**: https://marked.js.org/
- **Vitest Docs**: https://vitest.dev/
- **Playwright Docs**: https://playwright.dev/

---

## Next Steps

1. ✅ Read this quickstart guide
2. ⬜ Set up development environment
3. ⬜ Review `data-model.md` and `contracts/ipc-api.md`
4. ⬜ Start Phase 1 implementation
5. ⬜ Commit early and often

**Ready to build!** Start with Phase 1 and follow the implementation plan sequentially.
