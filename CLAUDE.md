# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Developer Knowledge Base is an Electron desktop application for managing personal developer knowledge including notes (markdown), projects, todos, code snippets, roadmaps, and software tool links. It uses a local file system for storage with no cloud sync.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server with Electron

# Testing
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run unit tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright)

# Build & Lint
npm run build        # Build for production
npm run lint         # Run ESLint on src/
```

## Architecture

### Process Model (Electron)

```
Main Process (Node.js)          Renderer Process (Browser)
├── main.js                     ├── index.html
├── preload.js ─────────────────┼── js/app.js
└── services/                   └── js/components/
    ├── file-service.js             ├── notes.js
    └── config-service.js           ├── todos.js
                                    ├── projects.js
                                    └── snippets.js
```

**Main Process** (`src/main/`): Handles Electron window management, file system operations, and IPC handlers. All file I/O goes through `file-service.js`.

**Preload Script** (`src/main/preload.js`): Exposes `window.knowledgeBase.invoke(channel, payload)` for secure IPC communication.

**Renderer Process** (`src/renderer/`): UI layer using vanilla JS. Entry point is `js/app.js` which initializes the router and mounts components.

### IPC Communication

All renderer-to-main communication uses `window.knowledgeBase.invoke(channel, payload)`:
- `config.*` - Configuration (get, update, setStorageLocation)
- `notes.*` - Notes CRUD (list, get, create, update, delete, search)
- `todos.*` - Todos CRUD (list, create, update, delete, toggleComplete)
- `projects.*` - Projects CRUD (list, get, create, update, delete)
- `snippets.*` - Snippets CRUD (list, get, create, update, delete, search)
- `fs.*` - File system dialogs (selectFolder, validatePath)

All IPC handlers return `{ success: boolean, data?: any, error?: string }`.

### Routing

Hash-based routing in `router.js`. Routes: `#/notes`, `#/todos`, `#/projects`, `#/snippets`, `#/tools`, `#/setup`.

### Data Storage

User selects a storage folder on first run. Structure:
```
<storage-folder>/
├── .knowledgebase/
│   ├── config.json      # App configuration
│   ├── todos.json       # Todo items
│   └── projects.json    # Project metadata
├── notes/               # Markdown files with YAML frontmatter
│   └── <project-folder>/
└── snippets/            # JSON files per snippet
```

Notes use YAML frontmatter for metadata (id, title, createdAt, modifiedAt, projectId, tags).

### Key Patterns

- **Component Structure**: Each UI component in `js/components/` exports a class with `render()`, `destroy()`, and `setupEventListeners()` methods
- **State Management**: Simple object-based state in `js/state.js`, passed through the router
- **File Service**: Singleton `fileService` handles all file operations; must call `initialize(storagePath)` before use
- **ID Generation**: UUIDs via the `uuid` package
- **Markdown**: Rendered via `marked` library in renderer process

## Test Locations

- Unit tests: `tests/unit/**/*.test.js`
- E2E tests: `tests/e2e/`

## Specifications

Detailed specs are in `specs/001-developer-knowledge-base/`:
- `spec.md` - Feature requirements and user stories
- `contracts/ipc-api.md` - IPC API contracts
- `data-model.md` - Entity definitions
- `quickstart.md` - Implementation guide
