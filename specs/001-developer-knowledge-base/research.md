# Research: Developer Knowledge Base

**Feature**: 001-developer-knowledge-base  
**Phase**: 0 (Outline & Research)  
**Date**: 2026-01-08

## Overview

This document captures the technical research and decision-making process for the Developer Knowledge Base application. All technical context items from the implementation plan have been evaluated and resolved.

## Technology Stack Decisions

### Decision 1: Frontend Framework - Vanilla JavaScript

**Decision**: Use vanilla HTML, CSS, and JavaScript (ES2022+) without frontend frameworks.

**Rationale**:
- **Simplicity**: No framework overhead, build complexity, or learning curve
- **Control**: Direct DOM manipulation provides full control over UI behavior
- **Performance**: Zero framework runtime cost, minimal bundle size
- **Maintainability**: Standard web APIs are stable and well-documented
- **Constitution Alignment**: Meets the "simplest solution" principle

**Alternatives Considered**:
- **React**: Rejected due to added complexity (JSX, build config, state management libraries)
- **Vue**: Rejected for similar reasons as React, though lighter weight
- **Svelte**: Rejected despite compile-time advantages; vanilla JS is simpler for small-scale app

**Implementation Notes**:
- Use ES6 modules for code organization
- Implement simple component pattern with render functions
- Use custom events for component communication

---

### Decision 2: Desktop Framework - Electron

**Decision**: Electron (latest stable) for Windows desktop deployment.

**Rationale**:
- **Cross-platform potential**: While targeting Windows, Electron allows future macOS/Linux support
- **Web technologies**: Leverages HTML/CSS/JS skills without learning native Windows APIs
- **File system access**: Built-in Node.js provides robust file system operations
- **Mature ecosystem**: Well-established with extensive documentation and community
- **Security model**: Context isolation and preload scripts provide secure IPC

**Alternatives Considered**:
- **Tauri**: Rejected due to requiring Rust knowledge; Electron is more accessible
- **NW.js**: Rejected as Electron has better security model and larger ecosystem
- **Native Windows (WPF/WinForms)**: Rejected as requires .NET knowledge and doesn't leverage web skills

**Implementation Notes**:
- Enable `contextIsolation` for security
- Use preload script for secure IPC bridge
- Follow Electron security best practices

---

### Decision 3: Build Tool - Vite

**Decision**: Vite for development server and build process.

**Rationale**:
- **Fast HMR**: Instant hot module replacement during development
- **Simple config**: Minimal configuration required for Electron setup
- **Modern output**: Native ES modules support, optimal code splitting
- **Plugin ecosystem**: Official Electron plugin available (`vite-plugin-electron`)
- **Development experience**: Superior DX compared to alternatives

**Alternatives Considered**:
- **Webpack**: Rejected due to complex configuration and slower builds
- **Rollup**: Rejected as Vite provides better DX with Rollup under the hood
- **Electron Forge**: Rejected as Vite provides more flexible modern tooling

**Implementation Notes**:
- Use `vite-plugin-electron` for main/preload process bundling
- Configure separate entry points for main and renderer processes
- Enable source maps for debugging

---

### Decision 4: Markdown Rendering - marked.js

**Decision**: Use marked.js for markdown parsing and rendering.

**Rationale**:
- **Lightweight**: ~10KB gzipped, minimal performance impact
- **Fast**: Optimized for performance with large documents
- **Extensible**: Supports custom renderers and extensions if needed
- **Spec compliant**: Implements CommonMark specification
- **Mature**: Stable library with active maintenance

**Alternatives Considered**:
- **markdown-it**: Rejected as marked.js is lighter and faster for our use case
- **remark/unified**: Rejected due to complexity; overkill for straightforward rendering
- **showdown**: Rejected as marked.js has better performance characteristics

**Implementation Notes**:
- Configure security options to sanitize HTML in markdown
- Enable GitHub-flavored markdown extensions (tables, task lists)
- Implement syntax highlighting for code blocks (consider highlight.js integration)

---

### Decision 5: Testing Strategy - Vitest + Playwright

**Decision**: Vitest for unit/integration tests, Playwright for E2E tests.

**Rationale**:
- **Vitest**: Vite-native test runner, fast execution, compatible with Jest API
- **Playwright**: Electron support via `@playwright/test`, reliable cross-browser testing
- **Unified tooling**: Both use modern ESM, work well with TypeScript if needed later
- **Performance**: Vitest's parallelization and Playwright's efficiency meet SC-007 requirements

**Alternatives Considered**:
- **Jest**: Rejected due to complex ESM configuration with Vite
- **Mocha/Chai**: Rejected as Vitest provides better Vite integration
- **Spectron**: Rejected as deprecated in favor of Playwright for Electron

**Implementation Notes**:
- Configure Vitest for `jsdom` environment for renderer tests
- Use Playwright's `_electron` API for E2E testing
- Implement test fixtures for common setup (storage location, sample data)

---

### Decision 6: Storage Architecture - File-based with JSON

**Decision**: Markdown files for notes/snippets, JSON for structured data (todos, projects, config).

**Rationale**:
- **User control**: Files are human-readable and portable
- **Simplicity**: No database setup, migrations, or query language
- **Version control friendly**: Users can track changes with git if desired
- **Meets requirements**: FR-002 explicitly requires markdown files
- **Offline by design**: No network dependencies

**Alternatives Considered**:
- **SQLite**: Rejected as adds complexity and reduces user control over data
- **IndexedDB**: Rejected as files provide better portability and user transparency
- **LowDB/NeDB**: Rejected as plain JSON is sufficient for single-user local app

**Storage Structure**:
```
<user-selected-folder>/
├── .knowledgebase/
│   ├── config.json           # App configuration
│   ├── todos.json            # All todos
│   ├── projects.json         # Project metadata
│   └── tools.json            # Software tools
├── notes/                    # Note files
│   ├── <project-name>/
│   │   └── <note>.md
│   └── <note>.md
└── snippets/                 # Code snippets
    └── <snippet>.json        # Each contains code + metadata
```

---

## Performance Considerations

### Launch Time (SC-007: <3 seconds)

**Strategy**:
- Lazy-load sections (only load active section data)
- Index file system on background thread during initialization
- Cache rendered markdown to avoid re-parsing
- Use Electron's `BrowserWindow` `ready-to-show` event to prevent white flash

### Search Performance (SC-006: <2s for 1000+ snippets)

**Strategy**:
- Implement in-memory full-text index (simple inverted index)
- Build index asynchronously on app start
- Incremental index updates on create/modify/delete
- Consider Web Workers for search to avoid UI blocking if needed

### Note Operations (SC-001, SC-005: <1s)

**Strategy**:
- Read/write operations use async file system APIs
- Debounce save operations (e.g., 500ms after last edit)
- Preload adjacent notes for instant navigation
- Cache parsed markdown in memory with LRU eviction

---

## Security Considerations

### Electron Security

**Best Practices to Implement**:
- Enable `contextIsolation: true` in BrowserWindow
- Disable `nodeIntegration` in renderer
- Use preload script to expose minimal, validated IPC API
- Implement CSP (Content Security Policy) headers
- Validate all file paths to prevent directory traversal

### Markdown Security

**Sanitization Strategy**:
- Configure marked.js to escape HTML by default
- Use DOMPurify for additional sanitization if HTML support needed
- Restrict file:// protocol links in rendered markdown
- Validate internal note references before navigation

---

## Accessibility Considerations (Constitution: WCAG 2.1 AA)

**Implementation Requirements**:
- Semantic HTML for all UI components
- ARIA labels for interactive elements (buttons, links, inputs)
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management for modals and section switching
- High contrast mode support (Windows theme integration)
- Screen reader testing with NVDA (Windows)

---

## UI/UX Architecture

### Layout Strategy (Portrait Optimization: FR-033/FR-034)

**Design**:
- Vertical navigation sidebar (always visible)
- Persistent pinned todos section (FR-015)
- Main content area with single-column layout
- Responsive breakpoints for landscape adaptation

**Pinned Todos Implementation**:
- Fixed position panel (collapsible)
- Z-index management for overlay
- Keyboard shortcut to toggle (e.g., Ctrl+T)

### State Management

**Simple State Pattern**:
- Centralized state object in `state.js`
- Observer pattern for component updates
- State persistence to localStorage for UI preferences
- No external state management library needed

### Routing

**Client-side Routing**:
- Hash-based routing (`#/notes`, `#/projects`, etc.)
- Browser back/forward support
- Route guards for unsaved changes

---

## Development Workflow

### Setup Process
1. `npm install` - Install Electron, Vite, Vitest, Playwright, marked.js
2. `npm run dev` - Start Vite dev server + Electron
3. `npm run test` - Run Vitest unit tests
4. `npm run test:e2e` - Run Playwright E2E tests
5. `npm run build` - Build production app
6. `npm run package` - Package for Windows (electron-builder)

### File Watching
- Vite watches renderer files (hot reload)
- Main process changes require app restart
- Tests run in watch mode during development

---

## Open Questions & Future Considerations

### Resolved in Current Design
- ✅ Storage location configuration (first-run setup wizard)
- ✅ Note reference syntax (use `[[Note Title]]` wiki-style links)
- ✅ Code snippet storage (JSON files with metadata)
- ✅ Todo persistence (central JSON file)
- ✅ Project organization (folder-based with metadata file)

### Deferred (Out of Scope)
- Multi-user support / collaboration features
- Cloud synchronization
- Mobile app versions
- Plugin/extension system
- Advanced markdown features (math, diagrams)
- Full-text search with fuzzy matching (use exact match initially)

---

## Validation Against Requirements

All functional requirements (FR-001 through FR-035) are addressable with the chosen technology stack:

- **Notes & Markdown**: marked.js + file system ✓
- **Storage & Config**: JSON + localStorage ✓
- **Projects**: Folder structure + metadata ✓
- **Todos**: JSON + pinned UI component ✓
- **Roadmaps**: JSON data model ✓
- **Snippets**: JSON + search index ✓
- **Tools**: JSON + shell integration ✓
- **Display**: Vanilla CSS + responsive design ✓

All success criteria (SC-001 through SC-009) have implementation strategies defined above.

---

## Summary

The vanilla JavaScript + Electron + Vite stack provides the simplest possible solution that meets all requirements. No NEEDS CLARIFICATION items remain. The design is ready to proceed to Phase 1 (data model and contracts).
