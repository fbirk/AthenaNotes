# Quickstart Guide: CLI Interface for KnowledgeBase

**Branch**: `003-cli-interface` | **Date**: 2026-03-19

## Prerequisites

- Node.js 18+ (same as Electron app)
- PowerShell 7+ (pwsh) for best terminal rendering
- Existing KnowledgeBase storage folder (optional — setup wizard handles first run)

## Quick Start

```bash
# From project root
npm install
npm run cli

# Or with explicit storage path
npm run cli -- --storage "C:\Users\YourName\KnowledgeBase"
```

## Project Structure

```
src/
├── main/                         # Existing Electron main process
│   └── services/                 # ← Reused by CLI (no changes)
│       ├── file-service.js
│       ├── config-service.js
│       └── daily-todos-service.js
├── shared/                       # ← Reused by CLI (no changes)
│   ├── constants.js
│   └── validators.js
├── renderer/                     # Existing Electron renderer (untouched)
└── cli/                          # ← NEW: CLI application
    ├── index.js                  # Entry point, arg parsing, bootstrap
    ├── app.js                    # Root Ink component
    ├── services/
    │   ├── kb-service.js         # Adapter wrapping existing services
    │   └── editor-service.js     # External editor launch ($EDITOR)
    ├── components/
    │   ├── tab-bar.js            # Top navigation tabs
    │   ├── status-bar.js         # Bottom status/shortcuts bar
    │   ├── list-detail.js        # Reusable list-detail split layout
    │   ├── markdown-preview.js   # Terminal markdown renderer
    │   ├── confirm-dialog.js     # Confirmation overlay
    │   ├── help-overlay.js       # Keyboard shortcuts help (?)
    │   ├── notes-tab.js          # Notes list + detail
    │   ├── todos-tab.js          # Todos list + detail
    │   ├── daily-todos-tab.js    # Daily todos view
    │   ├── projects-tab.js       # Projects list + detail
    │   ├── snippets-tab.js       # Snippets list + detail
    │   ├── roadmaps-tab.js       # Milestones timeline
    │   ├── tools-tab.js          # Tools launcher grid
    │   └── setup-wizard.js       # First-run setup
    ├── hooks/
    │   ├── use-keyboard.js       # Keyboard input handling
    │   ├── use-data.js           # Data loading/caching hook
    │   └── use-focus.js          # Focus management between panels
    └── lib/
        ├── terminal-markdown.js  # marked + marked-terminal config
        ├── syntax-highlight.js   # cli-highlight wrapper
        └── clipboard.js          # clipboardy wrapper

tests/
├── unit/
│   └── cli/                      # ← NEW: CLI unit tests
│       ├── services/
│       │   └── kb-service.test.js
│       ├── components/
│       │   ├── tab-bar.test.js
│       │   ├── notes-tab.test.js
│       │   └── ...
│       └── lib/
│           └── terminal-markdown.test.js
└── e2e/                          # Existing Electron E2E tests (untouched)
```

## New Dependencies

```json
{
  "dependencies": {
    "ink": "^5.x",
    "react": "^18.x",
    "ink-text-input": "^6.x",
    "ink-select-input": "^6.x",
    "ink-spinner": "^5.x",
    "marked-terminal": "^7.x",
    "cli-highlight": "^2.x",
    "clipboardy": "^4.x",
    "open": "^10.x",
    "meow": "^13.x"
  }
}
```

**Note**: `marked` and `uuid` are already project dependencies.

## Package.json Changes

```json
{
  "scripts": {
    "cli": "node src/cli/index.js",
    "cli:dev": "node --watch src/cli/index.js"
  },
  "bin": {
    "knowledgebase": "src/cli/index.js"
  }
}
```

## Implementation Order (by user story priority)

### Phase 1: Foundation (P1 stories)

1. **CLI bootstrap** (`index.js`, `kb-service.js`)
   - Argument parsing, storage detection, service initialization
   - Setup wizard for first run

2. **App shell** (`app.js`, `tab-bar.js`, `status-bar.js`)
   - Full-screen Ink layout with tab bar and status bar
   - Number key (1-7) tab switching
   - Help overlay (?)

3. **List-detail layout** (`list-detail.js`, `use-keyboard.js`, `use-focus.js`)
   - Reusable split panel with arrow key navigation
   - Enter to select, Escape to go back
   - Focus management between list and detail

4. **Notes tab** (`notes-tab.js`, `markdown-preview.js`, `terminal-markdown.js`)
   - Notes list with project filter and sort
   - Markdown preview mode (rendered)
   - Edit mode (launch $EDITOR)
   - Create, save, delete with keyboard shortcuts

5. **Todos tab** (`todos-tab.js`)
   - Todo list with checkbox toggle (Space)
   - Filter: All/Active/Completed
   - Detail panel with all fields
   - Edit/preview toggle for description

6. **Daily Todos tab** (`daily-todos-tab.js`)
   - Quick-add input bar
   - Checkbox toggle, priority display
   - Overdue indicators, rollover on load

### Phase 2: Secondary Features (P2 stories)

7. **Snippets tab** (`snippets-tab.js`, `syntax-highlight.js`, `clipboard.js`)
   - Search and tag filtering
   - Syntax-highlighted code display
   - Copy to clipboard shortcut

8. **Projects tab** (`projects-tab.js`)
   - Project list + detail
   - Create/edit/delete

9. **Roadmaps tab** (`roadmaps-tab.js`)
   - Milestone timeline with box-drawing characters
   - Progress bars, completion toggle
   - Project filter

### Phase 3: Polish (P3 stories)

10. **Tools tab** (`tools-tab.js`)
    - Category-grouped grid
    - Launch via `open` / `child_process`

11. **Terminal resize handling**
    - Re-render on SIGWINCH / terminal resize events
    - Minimum width detection

## Key Design Patterns

### Keyboard Context Stack

```
Global shortcuts (always active):
  1-7    → Switch tab
  ?      → Help overlay
  Ctrl+Q → Quit

Tab-level shortcuts (when tab is focused):
  n      → Create new item
  /      → Focus search (if available)
  f      → Cycle filter

Item-level shortcuts (when item selected):
  Enter  → Open/select
  Space  → Toggle completion (todos/milestones)
  e      → Edit mode
  p      → Preview mode
  Ctrl+S → Save
  d      → Delete (with confirmation)
  Esc    → Back to list
  c      → Copy (snippets only)
```

### Component Communication

```
App (state manager)
 ├── TabBar (active tab)
 ├── ActiveTab (data + selection state)
 │    ├── List panel (items, selected index)
 │    └── Detail panel (selected item, edit/preview mode)
 └── StatusBar (context shortcuts, item count)
```

State flows down from App. Tab components call `kb-service` methods directly and update their local state. The App component manages only the active tab index.
