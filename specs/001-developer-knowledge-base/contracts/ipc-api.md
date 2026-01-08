# IPC API Contract: Main ↔ Renderer Communication

**Feature**: 001-developer-knowledge-base  
**Version**: 1.0.0  
**Date**: 2026-01-08

## Overview

This document defines the IPC (Inter-Process Communication) contract between Electron's main process and renderer process. The API is exposed through the preload script using `contextBridge` for security.

**Security Model**: Context isolation enabled, no Node.js integration in renderer.

---

## API Namespace: `window.knowledgeBase`

All APIs are exposed under the `window.knowledgeBase` namespace in the renderer process.

---

## Configuration API

### `config.get()`

Get application configuration.

**Request**: None

**Response**:
```typescript
{
  success: true,
  data: {
    version: string,
    storageLocation: string,
    createdAt: string,
    lastModified: string,
    preferences: {
      theme: "light" | "dark",
      defaultView: "notes" | "projects" | "snippets" | "tools",
      editorFontSize: number,
      todosPanelCollapsed: boolean
    }
  }
}
```

**Errors**:
- `CONFIG_NOT_FOUND`: Configuration file doesn't exist
- `CONFIG_PARSE_ERROR`: Invalid JSON in config file

---

### `config.update(updates)`

Update configuration preferences.

**Request**:
```typescript
{
  preferences?: {
    theme?: "light" | "dark",
    defaultView?: "notes" | "projects" | "snippets" | "tools",
    editorFontSize?: number,
    todosPanelCollapsed?: boolean
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Configuration  // Updated full configuration
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid preference values
- `WRITE_ERROR`: Failed to write config file

---

### `config.setStorageLocation(path)`

Set or update storage location (first-run setup).

**Request**:
```typescript
{
  path: string  // Absolute path to storage folder
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    storageLocation: string,
    initialized: boolean
  }
}
```

**Errors**:
- `INVALID_PATH`: Path doesn't exist or is not a directory
- `NOT_WRITABLE`: Path is not writable
- `INITIALIZATION_ERROR`: Failed to create required folders

---

## Notes API

### `notes.list(options)`

List all notes or notes filtered by project.

**Request**:
```typescript
{
  projectId?: string,  // Filter by project (optional)
  sortBy?: "title" | "createdAt" | "modifiedAt",
  sortOrder?: "asc" | "desc"
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    title: string,
    createdAt: string,
    modifiedAt: string,
    projectId: string | null,
    tags: string[],
    filePath: string
  }>
}
```

---

### `notes.get(id)`

Get a single note by ID.

**Request**:
```typescript
{
  id: string  // Note UUID
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    title: string,
    createdAt: string,
    modifiedAt: string,
    projectId: string | null,
    tags: string[],
    content: string,  // Full markdown content
    filePath: string
  }
}
```

**Errors**:
- `NOTE_NOT_FOUND`: Note with ID doesn't exist
- `READ_ERROR`: Failed to read note file

---

### `notes.create(note)`

Create a new note.

**Request**:
```typescript
{
  title: string,
  content: string,
  projectId?: string | null,
  tags?: string[]
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,          // Generated UUID
    title: string,
    createdAt: string,
    modifiedAt: string,
    projectId: string | null,
    tags: string[],
    filePath: string
  }
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid title or content
- `PROJECT_NOT_FOUND`: projectId doesn't reference existing project
- `WRITE_ERROR`: Failed to write note file
- `DUPLICATE_TITLE`: Note with same title exists in same location

---

### `notes.update(id, updates)`

Update an existing note.

**Request**:
```typescript
{
  id: string,
  updates: {
    title?: string,
    content?: string,
    projectId?: string | null,
    tags?: string[]
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Note  // Updated note object
}
```

**Errors**:
- `NOTE_NOT_FOUND`: Note with ID doesn't exist
- `VALIDATION_ERROR`: Invalid updates
- `WRITE_ERROR`: Failed to write updated note

---

### `notes.delete(id)`

Delete a note.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true,
    referencingNotes: string[]  // IDs of notes that referenced this note
  }
}
```

**Errors**:
- `NOTE_NOT_FOUND`: Note with ID doesn't exist
- `DELETE_ERROR`: Failed to delete note file

---

### `notes.search(query)`

Search notes by content or title.

**Request**:
```typescript
{
  query: string,  // Search term
  projectId?: string  // Limit to project (optional)
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    title: string,
    snippet: string,  // Matching text excerpt
    relevance: number
  }>
}
```

---

## Projects API

### `projects.list()`

List all projects.

**Request**: None

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    name: string,
    description: string,
    createdAt: string,
    modifiedAt: string,
    folderPath: string,
    noteCount: number,
    todoCount: number
  }>
}
```

---

### `projects.get(id)`

Get a single project by ID.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    description: string,
    createdAt: string,
    modifiedAt: string,
    folderPath: string
  }
}
```

**Errors**:
- `PROJECT_NOT_FOUND`: Project with ID doesn't exist

---

### `projects.create(project)`

Create a new project.

**Request**:
```typescript
{
  name: string,
  description?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,  // Generated UUID
    name: string,
    description: string,
    createdAt: string,
    modifiedAt: string,
    folderPath: string
  }
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid name
- `DUPLICATE_NAME`: Project with same name exists
- `WRITE_ERROR`: Failed to write projects file or create folder

---

### `projects.update(id, updates)`

Update a project.

**Request**:
```typescript
{
  id: string,
  updates: {
    name?: string,
    description?: string
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Project  // Updated project object
}
```

**Errors**:
- `PROJECT_NOT_FOUND`: Project with ID doesn't exist
- `VALIDATION_ERROR`: Invalid updates
- `DUPLICATE_NAME`: New name conflicts with existing project

---

### `projects.delete(id, options)`

Delete a project.

**Request**:
```typescript
{
  id: string,
  deleteAssociated: boolean  // If true, delete notes/todos; if false, unlink them
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true,
    notesAffected: number,
    todosAffected: number,
    milestonesAffected: number
  }
}
```

**Errors**:
- `PROJECT_NOT_FOUND`: Project with ID doesn't exist
- `DELETE_ERROR`: Failed to delete project or associated data

---

## Todos API

### `todos.list(options)`

List all todos or filtered by project/status.

**Request**:
```typescript
{
  projectId?: string,
  completed?: boolean,
  sortBy?: "priority" | "deadline" | "createdAt",
  sortOrder?: "asc" | "desc"
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    title: string,
    description: string,
    priority: "high" | "medium" | "low",
    deadline: string | null,
    completed: boolean,
    completedAt: string | null,
    projectId: string | null,
    createdAt: string,
    modifiedAt: string
  }>
}
```

---

### `todos.create(todo)`

Create a new todo.

**Request**:
```typescript
{
  title: string,
  description?: string,
  priority: "high" | "medium" | "low",
  deadline?: string | null,
  projectId?: string | null
}
```

**Response**:
```typescript
{
  success: true,
  data: Todo  // Created todo object with generated ID
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid todo data
- `PROJECT_NOT_FOUND`: projectId doesn't reference existing project

---

### `todos.update(id, updates)`

Update a todo.

**Request**:
```typescript
{
  id: string,
  updates: {
    title?: string,
    description?: string,
    priority?: "high" | "medium" | "low",
    deadline?: string | null,
    projectId?: string | null
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Todo  // Updated todo object
}
```

---

### `todos.toggleComplete(id)`

Toggle todo completion status.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    completed: boolean,
    completedAt: string | null
  }
}
```

---

### `todos.delete(id)`

Delete a todo.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true
  }
}
```

---

## Milestones API

### `milestones.list(projectId)`

List milestones for a project.

**Request**:
```typescript
{
  projectId: string
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    projectId: string,
    title: string,
    description: string,
    deadline: string,
    completed: boolean,
    completedAt: string | null,
    createdAt: string,
    modifiedAt: string
  }>
}
```

---

### `milestones.create(milestone)`

Create a new milestone.

**Request**:
```typescript
{
  projectId: string,
  title: string,
  description?: string,
  deadline: string
}
```

**Response**:
```typescript
{
  success: true,
  data: Milestone  // Created milestone with generated ID
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid milestone data
- `PROJECT_NOT_FOUND`: projectId doesn't reference existing project

---

### `milestones.update(id, updates)`

Update a milestone.

**Request**:
```typescript
{
  id: string,
  updates: {
    title?: string,
    description?: string,
    deadline?: string
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Milestone  // Updated milestone
}
```

---

### `milestones.toggleComplete(id)`

Toggle milestone completion status.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    completed: boolean,
    completedAt: string | null
  }
}
```

---

### `milestones.delete(id)`

Delete a milestone.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true
  }
}
```

---

## Snippets API

### `snippets.list(options)`

List all snippets or filtered by tags.

**Request**:
```typescript
{
  language?: string,
  tags?: {
    language?: string[],
    usage?: string[],
    module?: string[]
  },
  sortBy?: "title" | "createdAt" | "modifiedAt",
  sortOrder?: "asc" | "desc"
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    title: string,
    description: string,
    language: string,
    tags: {
      language: string[],
      usage: string[],
      module: string[]
    },
    createdAt: string,
    modifiedAt: string
  }>
}
```

---

### `snippets.get(id)`

Get a single snippet by ID.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    title: string,
    description: string,
    language: string,
    code: string,  // Full code content
    tags: {
      language: string[],
      usage: string[],
      module: string[]
    },
    createdAt: string,
    modifiedAt: string
  }
}
```

**Errors**:
- `SNIPPET_NOT_FOUND`: Snippet with ID doesn't exist

---

### `snippets.create(snippet)`

Create a new code snippet.

**Request**:
```typescript
{
  title: string,
  description?: string,
  language: string,
  code: string,
  tags: {
    language?: string[],
    usage?: string[],
    module?: string[]
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Snippet  // Created snippet with generated ID
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid snippet data

---

### `snippets.update(id, updates)`

Update a snippet.

**Request**:
```typescript
{
  id: string,
  updates: {
    title?: string,
    description?: string,
    language?: string,
    code?: string,
    tags?: {
      language?: string[],
      usage?: string[],
      module?: string[]
    }
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Snippet  // Updated snippet
}
```

---

### `snippets.delete(id)`

Delete a snippet.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true
  }
}
```

---

### `snippets.search(query)`

Search snippets by title, description, tags, or code content.

**Request**:
```typescript
{
  query: string,
  searchIn?: ("title" | "description" | "code" | "tags")[]
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    title: string,
    snippet: string,  // Matching excerpt
    relevance: number
  }>
}
```

---

## Tools API

### `tools.list(options)`

List all software tools.

**Request**:
```typescript
{
  category?: string,
  sortBy?: "name" | "category",
  sortOrder?: "asc" | "desc"
}
```

**Response**:
```typescript
{
  success: true,
  data: Array<{
    id: string,
    name: string,
    description: string,
    launchPath: string,
    launchType: "application" | "url",
    category: string,
    createdAt: string,
    modifiedAt: string
  }>
}
```

---

### `tools.create(tool)`

Create a new tool entry.

**Request**:
```typescript
{
  name: string,
  description?: string,
  launchPath: string,
  launchType: "application" | "url",
  category?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: Tool  // Created tool with generated ID
}
```

**Errors**:
- `VALIDATION_ERROR`: Invalid tool data

---

### `tools.update(id, updates)`

Update a tool entry.

**Request**:
```typescript
{
  id: string,
  updates: {
    name?: string,
    description?: string,
    launchPath?: string,
    launchType?: "application" | "url",
    category?: string
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: Tool  // Updated tool
}
```

---

### `tools.delete(id)`

Delete a tool entry.

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    deleted: true
  }
}
```

---

### `tools.launch(id)`

Launch a tool (open application or URL).

**Request**:
```typescript
{
  id: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    launched: true
  }
}
```

**Errors**:
- `TOOL_NOT_FOUND`: Tool with ID doesn't exist
- `LAUNCH_ERROR`: Failed to launch tool (invalid path/URL)

---

## File System API

### `fs.selectFolder()`

Open native folder selection dialog.

**Request**: None

**Response**:
```typescript
{
  success: true,
  data: {
    path: string | null  // null if user canceled
  }
}
```

---

### `fs.validatePath(path)`

Check if a path exists and is writable.

**Request**:
```typescript
{
  path: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    exists: boolean,
    isDirectory: boolean,
    isWritable: boolean
  }
}
```

---

## Error Response Format

All API methods return errors in a consistent format:

```typescript
{
  success: false,
  error: {
    code: string,      // Error code (e.g., "NOTE_NOT_FOUND")
    message: string,   // Human-readable error message
    details?: any      // Optional additional error details
  }
}
```

---

## Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource doesn't exist
- `READ_ERROR`: Failed to read file
- `WRITE_ERROR`: Failed to write file
- `DELETE_ERROR`: Failed to delete file
- `PERMISSION_ERROR`: Insufficient permissions
- `STORAGE_NOT_CONFIGURED`: Storage location not set

---

## Event Subscriptions

The renderer can subscribe to events from the main process:

### `onStorageChange(callback)`

Triggered when storage location changes.

**Callback Payload**:
```typescript
{
  oldPath: string,
  newPath: string
}
```

---

### `onFileSystemChange(callback)`

Triggered when files change externally (file watcher).

**Callback Payload**:
```typescript
{
  type: "created" | "modified" | "deleted",
  entityType: "note" | "snippet" | "config",
  id: string
}
```

---

## Implementation Notes

1. **All async operations**: Every API method returns a Promise
2. **Type safety**: Use TypeScript definitions for both main and renderer
3. **Validation**: Main process validates all inputs before processing
4. **Error handling**: All errors are caught and returned in standard format
5. **File locking**: Use atomic write operations (write to temp, rename)
6. **Path sanitization**: Prevent directory traversal attacks

---

## Testing Requirements

- **Contract tests**: Verify all API methods exist and return correct structure
- **Error handling**: Test all error codes are returned correctly
- **Validation**: Test input validation for each method
- **Integration**: Test main ↔ renderer communication end-to-end
