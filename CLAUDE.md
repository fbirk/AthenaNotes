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
Main Process (Node.js)              Renderer Process (Browser)
├── main.js                         ├── index.html
├── preload.js ─────────────────────┼── js/app.js
└── services/                       ├── js/router.js
    ├── file-service.js             ├── js/state.js
    └── config-service.js           ├── js/services/
                                    │   ├── api.js
                                    │   └── markdown.js
                                    ├── js/components/
                                    │   ├── notes.js
                                    │   ├── todos-pinned-header.js  # Header panel (hidden on #/todos)
                                    │   ├── todos-section.js        # Main todos view
                                    │   ├── projects.js
                                    │   ├── snippets.js
                                    │   ├── roadmaps.js
                                    │   ├── tools.js
                                    │   └── setup.js
                                    └── styles/
                                        ├── main.css
                                        ├── themes.css
                                        └── components.css

Shared (src/shared/)
├── constants.js                    # App-wide constants
└── validators.js                   # Validation utilities
```

**Main Process** (`src/main/`): Handles Electron window management, file system operations, and IPC handlers. All file I/O goes through `file-service.js`.

**Preload Script** (`src/main/preload.js`): Exposes `window.knowledgeBase.invoke(channel, payload)` for secure IPC communication.

**Renderer Process** (`src/renderer/`): UI layer using vanilla JS. Entry point is `js/app.js` which initializes the router and mounts components.

**Shared** (`src/shared/`): Common utilities and constants used by both processes.

### IPC Communication

All renderer-to-main communication uses `window.knowledgeBase.invoke(channel, payload)`:
- `config.*` - Configuration (get, update, setStorageLocation)
- `notes.*` - Notes CRUD (list, get, create, update, delete, search)
- `todos.*` - Todos CRUD (list, create, update, delete, toggleComplete)
- `projects.*` - Projects CRUD (list, get, create, update, delete)
- `snippets.*` - Snippets CRUD (list, get, create, update, delete, search)
- `milestones.*` - Milestones CRUD (list, create, update, delete, toggleComplete)
- `tools.*` - Tools CRUD (list, create, update, delete, launch)
- `fs.*` - File system dialogs (selectFolder, validatePath)

All IPC handlers return `{ success: boolean, data?: any, error?: string }`.

### Routing

Hash-based routing in `router.js`. Routes:
- `#/notes` - Notes view (default)
- `#/todos` - Todo list management
- `#/projects` - Project management
- `#/snippets` - Code snippets library
- `#/roadmaps` - Project roadmaps/milestones
- `#/tools` - Developer tools/links launcher
- `#/setup` - Initial storage setup

### Data Storage

User selects a storage folder on first run. Structure:
```
<storage-folder>/
├── .knowledgebase/
│   ├── config.json       # App configuration & preferences
│   ├── todos.json        # Todo items with priority/deadline
│   ├── projects.json     # Project metadata
│   ├── milestones.json   # Project milestones/roadmap items
│   └── tools.json        # Developer tools/links
├── notes/                # Markdown files with YAML frontmatter
│   ├── *.md              # Root-level notes
│   └── <project-folder>/ # Project-specific notes
│       └── *.md
└── snippets/             # Code snippets (one JSON file per snippet)
    └── <uuid>.json
```

**Notes** use YAML frontmatter for metadata:
```yaml
---
id: "uuid"
title: "Note Title"
createdAt: "ISO timestamp"
modifiedAt: "ISO timestamp"
projectId: "project-uuid"  # optional
tags: ["tag1", "tag2"]     # optional
---
```

**Snippets** are stored as individual JSON files with structure:
```json
{
  "id": "uuid",
  "title": "Snippet Title",
  "description": "...",
  "language": "javascript",
  "code": "...",
  "tags": {
    "language": ["js", "node"],
    "usage": ["utility"],
    "module": ["fs"]
  },
  "createdAt": "ISO timestamp",
  "modifiedAt": "ISO timestamp"
}
```

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
