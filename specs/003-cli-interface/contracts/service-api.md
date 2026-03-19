# Service API Contracts: CLI Interface

**Branch**: `003-cli-interface` | **Date**: 2026-03-19

## Overview

The CLI does **not** introduce new APIs. Instead, it calls existing service methods directly (no IPC layer). This document maps the Electron IPC channels to direct service method calls that the CLI components will use.

All methods return `{ success: boolean, data?: any, error?: string }` — the same contract as the Electron IPC handlers.

## Service Layer Architecture

```
CLI Components (Ink/React)
    │
    ▼
CLI Service Adapter (src/cli/services/kb-service.js)
    │  - Thin adapter that wraps existing services
    │  - Handles initialization, error wrapping
    │  - Returns same { success, data, error } format
    │
    ├──▶ FileService (src/main/services/file-service.js)
    ├──▶ ConfigService (src/main/services/config-service.js)
    └──▶ DailyTodosService (src/main/services/daily-todos-service.js)
```

## Contract: Notes

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List notes | `fileService.listNotes(projectFolder)` | `{ projectId?, sortBy?, sortOrder? }` | `Note[]` (metadata only) |
| Get note | `fileService.readNote(filePath)` | `noteId: string` | `Note` (full content) |
| Create note | `fileService.createNote(noteData)` | `{ title, content, projectId? }` | `Note` |
| Update note | `fileService.writeNote(filePath, note)` | `{ id, updates: { title?, content?, projectId? } }` | `Note` |
| Delete note | `fileService.deleteNote(filePath)` | `noteId: string` | `void` |
| Search notes | `fileService.listNotes()` + filter | `{ query: string }` | `Note[]` |

**Note resolution**: The CLI adapter must resolve `noteId` → file path using the notes list, same as `main.js` handlers do.

## Contract: Todos

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List todos | `fileService.readJSON('todos.json')` | none | `Todo[]` |
| Create todo | Read + append + `fileService.writeJSON()` | `{ title, description?, priority?, projectId?, deadline? }` | `Todo` |
| Update todo | Read + modify + `fileService.writeJSON()` | `{ id, updates }` | `Todo` |
| Toggle complete | Read + toggle + `fileService.writeJSON()` | `todoId: string` | `Todo` |
| Delete todo | Read + filter + `fileService.writeJSON()` | `todoId: string` | `void` |

**Note**: Todo CRUD is implemented inline in `main.js` handlers (not in a dedicated service). The CLI adapter must replicate this logic or extract it into a shared `todo-service.js`.

## Contract: Daily Todos

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List | `dailyTodosService.list()` | none | `{ todos: DailyTodo[], lastRolloverDate }` |
| Create | `dailyTodosService.create(data)` | `{ title, priority? }` | `DailyTodo` |
| Toggle complete | `dailyTodosService.toggleComplete(id)` | `todoId: string` | `DailyTodo` |
| Delete | `dailyTodosService.delete(id)` | `todoId: string` | `void` |
| Rollover | `dailyTodosService.rollover()` | none | `{ todos, lastRolloverDate }` |
| Get archive | `dailyTodosService.getArchive(options)` | `{ limit?, offset? }` | `ArchivedTodo[]` |
| Update priority | `dailyTodosService.updatePriority(id, priority)` | `{ id, priority }` | `DailyTodo` |

## Contract: Projects

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List projects | `fileService.readJSON('projects.json')` | none | `Project[]` |
| Get project | Read + find by ID | `projectId: string` | `Project` |
| Create project | Read + append + write + create folder | `{ name, description? }` | `Project` |
| Update project | Read + modify + write (+ rename folder) | `{ id, updates }` | `Project` |
| Delete project | Read + remove + write + handle notes | `{ projectId, deleteNotes: boolean }` | `void` |

## Contract: Snippets

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List snippets | `fileService.listSnippets()` | none | `Snippet[]` |
| Get snippet | `fileService.getSnippet(id)` | `snippetId: string` | `Snippet` |
| Create snippet | `fileService.createSnippet(data)` | `{ title, language, code, tags, description? }` | `Snippet` |
| Update snippet | `fileService.updateSnippet(id, updates)` | `{ id, updates }` | `Snippet` |
| Delete snippet | `fileService.deleteSnippet(id)` | `snippetId: string` | `void` |
| Search snippets | `fileService.searchSnippets(query, tagFilters)` | `{ query?, tagFilters? }` | `Snippet[]` |

## Contract: Milestones

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List milestones | `fileService.readJSON('milestones.json')` | `projectId?: string` | `Milestone[]` |
| Create milestone | Read + append + write | `{ title, projectId, deadline, description? }` | `Milestone` |
| Update milestone | Read + modify + write | `{ id, updates }` | `Milestone` |
| Toggle complete | Read + toggle + write | `milestoneId: string` | `Milestone` |
| Delete milestone | Read + filter + write | `milestoneId: string` | `void` |

## Contract: Tools

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| List tools | `fileService.readJSON('tools.json')` | none | `Tool[]` |
| Create tool | Read + append + write | `{ name, launchType, launchPath, category?, description? }` | `Tool` |
| Update tool | Read + modify + write | `{ id, updates }` | `Tool` |
| Delete tool | Read + filter + write | `toolId: string` | `void` |
| Launch tool | `child_process.exec` / `open` | `toolId: string` | `void` |

**CLI-specific**: `tools.launch` uses `child_process.exec` (for applications) or `open` package (for URLs) instead of Electron's `shell.openExternal()`.

## Contract: Config

| Operation | Service Call | Input | Output (data field) |
| --- | --- | --- | --- |
| Get config | `configService.getConfig()` | none | `Config` |
| Update config | `configService.updateConfig(updates)` | `{ updates }` | `Config` |
| Set storage | `configService.setStorageLocation(path)` | `storagePath: string` | `Config` |
| Validate path | `fileService.validatePath(path)` | `targetPath: string` | `{ valid, writable }` |

## Contract: CLI Bootstrap

Not present in Electron. CLI-specific initialization flow:

```
1. Parse CLI arguments (--storage <path>)
2. If no arg: check $KNOWLEDGEBASE_STORAGE env var
3. If no env: read Electron bootstrap config (.dev-storage.json or storage-location.json)
4. If no bootstrap: read ~/.knowledgebase-cli.json
5. If no config found: launch setup wizard (interactive path selection)
6. Call fileService.initialize(storagePath)
7. Call configService (reads from initialized fileService)
8. Call dailyTodosService.initialize(storagePath)
9. Launch TUI
```
