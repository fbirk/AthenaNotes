# Implementation Plan: CLI Interface for KnowledgeBase

**Branch**: `003-cli-interface` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-cli-interface/spec.md`

## Summary

Build a full-screen Terminal User Interface (TUI) for the KnowledgeBase app that runs in PowerShell 7+ and provides keyboard-only navigation across all content types (Notes, Todos, Daily Todos, Projects, Snippets, Roadmaps, Tools). The CLI reuses the existing pure-Node.js services directly and renders via Ink (React for CLI), with a Claude Code-inspired tab/register navigation model. Edit mode for long content launches the user's `$EDITOR`; short fields use inline terminal inputs.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**: Ink 5.x (React-based TUI), marked-terminal (markdown), cli-highlight (syntax), clipboardy (clipboard)
**Storage**: Existing file-based storage (JSON + markdown with YAML frontmatter) — shared with Electron app
**Testing**: Vitest (existing test framework), ink-testing-library for component tests
**Target Platform**: Windows 11, PowerShell 7+ (pwsh) with ANSI/Unicode support
**Project Type**: Single project — CLI added as new entry point alongside existing Electron app
**Performance Goals**: Tab switch < 200ms, list rendering < 100ms for 500+ items
**Constraints**: Terminal width >= 80 columns, must not modify existing services, full data interoperability with Electron app
**Scale/Scope**: 7 tab views, ~15 components, ~3 service adapters, ~5 utility modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is a template (not configured for this project). No gates to enforce. Proceeding.

**Post-Phase 1 re-check**: No constitution violations. The design follows simplicity principles:
- Reuses existing services (no duplication)
- Single entry point added to existing project
- No new data formats or storage mechanisms
- Minimal new dependencies (all focused on terminal rendering)

## Project Structure

### Documentation (this feature)

```text
specs/003-cli-interface/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technology decisions and rationale
├── data-model.md        # Entity definitions (shared with Electron)
├── quickstart.md        # Implementation guide and project structure
├── contracts/
│   └── service-api.md   # Service method contracts for CLI
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main/                              # Existing Electron main process (UNCHANGED)
│   ├── main.js
│   ├── preload.js
│   └── services/
│       ├── file-service.js            # ← Reused by CLI directly
│       ├── config-service.js          # ← Reused by CLI directly
│       └── daily-todos-service.js     # ← Reused by CLI directly
├── shared/                            # Existing shared modules (UNCHANGED)
│   ├── constants.js                   # ← Reused by CLI
│   └── validators.js                  # ← Reused by CLI
├── renderer/                          # Existing Electron renderer (UNCHANGED)
└── cli/                               # NEW: CLI application
    ├── index.js                       # Entry point: arg parsing, bootstrap, Ink render
    ├── app.js                         # Root component: tab state, keyboard context
    ├── services/
    │   ├── kb-service.js              # Adapter wrapping file/config/dailyTodos services
    │   └── editor-service.js          # $EDITOR launch for long-form editing
    ├── components/
    │   ├── tab-bar.js                 # Top navigation (7 tabs, number key switching)
    │   ├── status-bar.js              # Bottom bar: shortcuts, item count, context
    │   ├── list-detail.js             # Reusable split-panel layout
    │   ├── markdown-preview.js        # Terminal markdown renderer component
    │   ├── confirm-dialog.js          # Destructive action confirmation overlay
    │   ├── help-overlay.js            # ? key: contextual keyboard shortcuts
    │   ├── notes-tab.js               # Notes: list, preview, edit, CRUD
    │   ├── todos-tab.js               # Todos: list, detail, toggle, filter
    │   ├── daily-todos-tab.js         # Daily Todos: quick-add, toggle, overdue
    │   ├── projects-tab.js            # Projects: list, detail, CRUD
    │   ├── snippets-tab.js            # Snippets: search, syntax display, copy
    │   ├── roadmaps-tab.js            # Roadmaps: timeline, milestones, progress
    │   ├── tools-tab.js               # Tools: category grid, launch
    │   └── setup-wizard.js            # First-run storage path selection
    ├── hooks/
    │   ├── use-keyboard.js            # Keyboard input: global + contextual shortcuts
    │   ├── use-data.js                # Data loading with caching and refresh
    │   └── use-focus.js               # Focus management: list ↔ detail panels
    └── lib/
        ├── terminal-markdown.js       # marked + marked-terminal configuration
        ├── syntax-highlight.js        # cli-highlight wrapper
        └── clipboard.js              # clipboardy wrapper

tests/unit/cli/                        # NEW: CLI unit tests
├── services/
│   └── kb-service.test.js
├── components/
│   ├── tab-bar.test.js
│   ├── list-detail.test.js
│   ├── notes-tab.test.js
│   ├── todos-tab.test.js
│   └── daily-todos-tab.test.js
└── lib/
    └── terminal-markdown.test.js
```

**Structure Decision**: CLI is added as a new `src/cli/` directory within the existing monorepo. This enables direct imports of `src/main/services/*` and `src/shared/*` without any package boundary. No workspace configuration needed. The CLI entry point is registered in `package.json` as both an npm script (`npm run cli`) and a bin entry (`knowledgebase`).

## Implementation Phases

### Phase 1: Foundation (P1 — User Stories 1-3)

**Goal**: Working CLI with tab navigation, notes (edit/preview), and todos (toggle/create).

| Step | Component | Description | Dependencies |
| --- | --- | --- | --- |
| 1.1 | `index.js`, `kb-service.js` | CLI entry point: arg parsing (meow), storage detection (bootstrap config chain), service initialization | None |
| 1.2 | `setup-wizard.js` | First-run interactive path selection using Ink text input | 1.1 |
| 1.3 | `app.js`, `tab-bar.js`, `status-bar.js` | App shell: full-screen layout, tab bar with 1-7 switching, status bar | 1.1 |
| 1.4 | `use-keyboard.js`, `use-focus.js` | Keyboard context stack (global → tab → item), focus management | 1.3 |
| 1.5 | `list-detail.js` | Reusable split layout: scrollable list (arrow keys), detail panel, Enter/Escape | 1.4 |
| 1.6 | `terminal-markdown.js`, `markdown-preview.js` | Terminal markdown rendering with marked + marked-terminal | None |
| 1.7 | `help-overlay.js`, `confirm-dialog.js` | Overlay components for ? help and delete confirmations | 1.4 |
| 1.8 | `editor-service.js` | Launch $EDITOR for long-form editing, handle temp file round-trip | None |
| 1.9 | `notes-tab.js` | Notes: list with project filter/sort, preview mode, edit via $EDITOR, CRUD | 1.5, 1.6, 1.8 |
| 1.10 | `todos-tab.js` | Todos: list with filter, Space toggle, detail with edit/preview, CRUD | 1.5, 1.6 |
| 1.11 | `daily-todos-tab.js` | Daily Todos: quick-add input, checkbox toggle, priority colors, overdue | 1.5 |

### Phase 2: Secondary Features (P2 — User Stories 4-5)

**Goal**: Snippets with syntax highlighting and clipboard, Projects and Roadmaps.

| Step | Component | Description | Dependencies |
| --- | --- | --- | --- |
| 2.1 | `syntax-highlight.js`, `clipboard.js` | Syntax highlighting and clipboard utilities | None |
| 2.2 | `snippets-tab.js` | Snippets: search, tag filter, syntax display, copy to clipboard, CRUD | 1.5, 2.1 |
| 2.3 | `projects-tab.js` | Projects: list, detail with notes count, CRUD | 1.5 |
| 2.4 | `roadmaps-tab.js` | Roadmaps: timeline with box-drawing, progress bars, milestone CRUD | 1.5, 2.3 |

### Phase 3: Polish (P3 — User Stories 6-7)

**Goal**: Tools launcher, terminal resize, edge case handling.

| Step | Component | Description | Dependencies |
| --- | --- | --- | --- |
| 3.1 | `tools-tab.js` | Tools: category-grouped list, launch via open/child_process | 1.5 |
| 3.2 | Terminal resize | Handle SIGWINCH, re-render layout, minimum width warning | 1.3 |
| 3.3 | Edge cases | Narrow terminal graceful degradation, long content scrolling, error states | All |

## Key Technical Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| TUI framework | Ink 5.x | React component model maps to existing architecture; flexbox layout; active ecosystem |
| Markdown rendering | marked + marked-terminal | Reuses existing `marked` dependency; consistent parsing between Electron and CLI |
| Syntax highlighting | cli-highlight | highlight.js-based; 190+ languages; ANSI terminal output |
| Long-form editing | External $EDITOR | Terminal text areas have fundamental limitations; matches Claude Code pattern |
| Service reuse | Direct import | All services are pure Node.js; zero Electron dependencies; no adapter needed for core I/O |
| Clipboard | clipboardy | Cross-platform; no native compilation; works on PowerShell |
| Bootstrap config | Shared with Electron | Zero-friction for existing users; fallback chain for CLI-only users |

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Ink rendering on Windows Terminal vs legacy conhost | Layout/color glitches | Test on both; detect terminal capabilities; fall back to basic ANSI |
| $EDITOR not set on Windows | Cannot edit notes | Default to `notepad` on Windows; detect common editors (code, vim) |
| Large notes list (500+) causing slow rendering | UI lag | Virtual scrolling in list component; render only visible items |
| Concurrent Electron + CLI writes | Data corruption | Document limitation; read-on-demand pattern minimizes window; no locking needed for single-user |

## Complexity Tracking

No constitution violations to justify. The design follows simplicity:
- Reuses 3 existing services with zero modifications
- Single new directory (`src/cli/`) with flat component structure
- No new data formats, storage mechanisms, or abstractions
- Dependencies are focused and minimal (Ink + 5 small utility packages)
