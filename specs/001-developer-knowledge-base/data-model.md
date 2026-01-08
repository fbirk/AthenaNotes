# Data Model: Developer Knowledge Base

**Feature**: 001-developer-knowledge-base  
**Phase**: 1 (Design & Contracts)  
**Date**: 2026-01-08

## Overview

This document defines the data structures, relationships, validation rules, and state transitions for the Developer Knowledge Base application. All entities are stored as files (markdown or JSON) in the user's configured storage location.

---

## Entity Definitions

### 1. Configuration

**Purpose**: Store application-wide settings and user preferences.

**Storage**: `<storage-root>/.knowledgebase/config.json`

**Schema**:
```json
{
  "version": "1.0.0",
  "storageLocation": "/absolute/path/to/storage",
  "createdAt": "2026-01-08T10:30:00Z",
  "lastModified": "2026-01-08T10:30:00Z",
  "preferences": {
    "theme": "light",
    "defaultView": "notes",
    "editorFontSize": 14,
    "todosPanelCollapsed": false
  }
}
```

**Fields**:
- `version` (string, required): Schema version for migrations
- `storageLocation` (string, required): Absolute path to storage root
- `createdAt` (ISO 8601 datetime, required): First setup timestamp
- `lastModified` (ISO 8601 datetime, required): Last config change
- `preferences` (object, required): User preferences
  - `theme` (enum: "light" | "dark", default: "light")
  - `defaultView` (enum: "notes" | "projects" | "snippets" | "tools", default: "notes")
  - `editorFontSize` (integer, min: 10, max: 24, default: 14)
  - `todosPanelCollapsed` (boolean, default: false)

**Validation Rules**:
- `storageLocation` must be an absolute path
- `storageLocation` must exist and be writable
- `version` must follow semver format
- `editorFontSize` must be between 10 and 24

**State Transitions**:
- Created during first-run setup (FR-008)
- Updated when user changes preferences
- Read on every app launch

---

### 2. Note

**Purpose**: Individual markdown documents for knowledge capture.

**Storage**: `<storage-root>/notes/**/*.md` (hierarchical folders supported)

**File Format**: Standard markdown with YAML frontmatter

**Schema**:
```markdown
---
id: "note-uuid-v4"
title: "Note Title"
createdAt: "2026-01-08T10:30:00Z"
modifiedAt: "2026-01-08T12:45:00Z"
projectId: "project-uuid-v4"
tags: ["tag1", "tag2"]
---

# Note Title

Markdown content here...

Internal link example: [[Another Note Title]]
```

**Frontmatter Fields**:
- `id` (UUID v4, required): Unique identifier
- `title` (string, required, max: 200 chars): Note title
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp
- `projectId` (UUID v4, optional): Associated project ID
- `tags` (array of strings, optional): Searchable tags

**Content**:
- Body (markdown, required): Note content in CommonMark format
- Internal links: `[[Note Title]]` syntax for cross-references

**Validation Rules**:
- Title cannot be empty or whitespace-only
- Title cannot contain characters: `/ \ : * ? " < > |`
- File name derived from title (slugified)
- Frontmatter must be valid YAML
- `projectId` must reference an existing project (if provided)

**State Transitions**:
1. **Created**: User creates new note → file written with initial frontmatter
2. **Modified**: User edits content → `modifiedAt` updated, file saved
3. **Moved**: User moves to folder → file path changes, metadata unchanged
4. **Deleted**: User deletes note → file removed, update any referencing notes

**Relationships**:
- Belongs to zero or one Project (via `projectId`)
- May reference other Notes (via `[[Title]]` links)

---

### 3. Project

**Purpose**: Container for organizing related notes, todos, and roadmap.

**Storage**: `<storage-root>/.knowledgebase/projects.json`

**Schema**:
```json
{
  "projects": [
    {
      "id": "project-uuid-v4",
      "name": "Project Name",
      "description": "Project description",
      "createdAt": "2026-01-08T10:30:00Z",
      "modifiedAt": "2026-01-08T10:30:00Z",
      "folderPath": "notes/project-name"
    }
  ]
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `name` (string, required, max: 100 chars): Project name
- `description` (string, optional, max: 500 chars): Project description
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp
- `folderPath` (string, required): Relative path to project notes folder

**Validation Rules**:
- Name cannot be empty or whitespace-only
- Name must be unique across all projects
- Name cannot contain characters: `/ \ : * ? " < > |`
- `folderPath` is derived from name (slugified)

**State Transitions**:
1. **Created**: User creates project → entry added to projects.json
2. **Modified**: User updates name/description → `modifiedAt` updated
3. **Deleted**: User deletes project → entry removed, prompt to handle associated notes/todos

**Relationships**:
- Has many Notes (via Note.projectId foreign key)
- Has many Todos (via Todo.projectId foreign key)
- Has many Milestones (via Milestone.projectId foreign key)

---

### 4. Todo

**Purpose**: Task tracking with priorities, deadlines, and project association.

**Storage**: `<storage-root>/.knowledgebase/todos.json`

**Schema**:
```json
{
  "todos": [
    {
      "id": "todo-uuid-v4",
      "title": "Todo title",
      "description": "Optional detailed description",
      "priority": "high",
      "deadline": "2026-01-15T00:00:00Z",
      "completed": false,
      "completedAt": null,
      "projectId": "project-uuid-v4",
      "createdAt": "2026-01-08T10:30:00Z",
      "modifiedAt": "2026-01-08T10:30:00Z"
    }
  ]
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `title` (string, required, max: 200 chars): Todo title
- `description` (string, optional, max: 1000 chars): Detailed description
- `priority` (enum: "high" | "medium" | "low", required): Priority level
- `deadline` (ISO 8601 datetime, optional): Due date/time
- `completed` (boolean, required, default: false): Completion status
- `completedAt` (ISO 8601 datetime, optional): Completion timestamp
- `projectId` (UUID v4, optional): Associated project ID
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp

**Validation Rules**:
- Title cannot be empty or whitespace-only
- `priority` must be one of: "high", "medium", "low"
- `deadline` must be in the future (warning, not error)
- If `completed` is true, `completedAt` must be set
- `projectId` must reference an existing project (if provided)

**State Transitions**:
1. **Created**: User creates todo → entry added with `completed: false`
2. **Modified**: User updates fields → `modifiedAt` updated
3. **Completed**: User marks complete → `completed: true`, `completedAt` set
4. **Uncompleted**: User marks incomplete → `completed: false`, `completedAt: null`
5. **Deleted**: User deletes todo → entry removed

**Sorting Rules** (FR-018):
- Primary: Priority (high > medium > low)
- Secondary: Deadline (earliest first, nulls last)
- Tertiary: Creation date (newest first)

**Relationships**:
- Belongs to zero or one Project (via `projectId`)

---

### 5. Milestone

**Purpose**: Roadmap checkpoints for project tracking.

**Storage**: `<storage-root>/.knowledgebase/milestones.json`

**Schema**:
```json
{
  "milestones": [
    {
      "id": "milestone-uuid-v4",
      "projectId": "project-uuid-v4",
      "title": "Milestone title",
      "description": "Milestone description",
      "deadline": "2026-02-01T00:00:00Z",
      "completed": false,
      "completedAt": null,
      "createdAt": "2026-01-08T10:30:00Z",
      "modifiedAt": "2026-01-08T10:30:00Z"
    }
  ]
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `projectId` (UUID v4, required): Associated project ID
- `title` (string, required, max: 200 chars): Milestone title
- `description` (string, optional, max: 1000 chars): Milestone description
- `deadline` (ISO 8601 datetime, required): Target completion date
- `completed` (boolean, required, default: false): Completion status
- `completedAt` (ISO 8601 datetime, optional): Completion timestamp
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp

**Validation Rules**:
- Title cannot be empty or whitespace-only
- `projectId` must reference an existing project
- `deadline` is required
- If `completed` is true, `completedAt` must be set

**State Transitions**:
1. **Created**: User creates milestone → entry added
2. **Modified**: User updates fields → `modifiedAt` updated
3. **Completed**: User marks complete → `completed: true`, `completedAt` set
4. **Deleted**: User deletes milestone → entry removed

**Sorting Rules** (FR-023):
- By deadline (chronological order, earliest first)

**Relationships**:
- Belongs to one Project (via `projectId`, required)

---

### 6. Code Snippet

**Purpose**: Reusable code blocks with tags for search and categorization.

**Storage**: `<storage-root>/snippets/*.json` (one file per snippet)

**Schema**:
```json
{
  "id": "snippet-uuid-v4",
  "title": "Snippet title",
  "description": "What this snippet does",
  "language": "javascript",
  "code": "const example = () => {\n  return 'code here';\n};",
  "tags": {
    "language": ["javascript", "typescript"],
    "usage": ["async", "promise"],
    "module": ["api", "utils"]
  },
  "createdAt": "2026-01-08T10:30:00Z",
  "modifiedAt": "2026-01-08T10:30:00Z"
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `title` (string, required, max: 200 chars): Snippet title
- `description` (string, optional, max: 500 chars): Snippet description
- `language` (string, required): Primary programming language
- `code` (string, required, max: 50000 chars): Code content
- `tags` (object, required): Categorized tags
  - `language` (array of strings): Programming languages
  - `usage` (array of strings): Usage patterns (e.g., "dispose-pattern")
  - `module` (array of strings): Module/component context
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp

**Validation Rules**:
- Title cannot be empty or whitespace-only
- `language` must be a recognized language identifier (e.g., "javascript", "python", "csharp")
- `code` cannot be empty
- At least one tag must be provided across all tag categories
- Tag values normalized to lowercase

**State Transitions**:
1. **Created**: User creates snippet → file written
2. **Modified**: User updates fields → `modifiedAt` updated, file saved
3. **Deleted**: User deletes snippet → file removed

**Search Index**:
- Index fields: `title`, `description`, `language`, all `tags.*`, `code`
- Full-text search with exact match (not fuzzy initially)
- Tag-based filtering (AND/OR operations)

**Relationships**:
- Standalone entity (no foreign keys)

---

### 7. Software Tool

**Purpose**: Quick-launch entries for frequently used applications.

**Storage**: `<storage-root>/.knowledgebase/tools.json`

**Schema**:
```json
{
  "tools": [
    {
      "id": "tool-uuid-v4",
      "name": "Visual Studio Code",
      "description": "Code editor",
      "launchPath": "C:\\Program Files\\Microsoft VS Code\\Code.exe",
      "launchType": "application",
      "category": "Development",
      "createdAt": "2026-01-08T10:30:00Z",
      "modifiedAt": "2026-01-08T10:30:00Z"
    },
    {
      "id": "tool-uuid-v4",
      "name": "GitHub",
      "description": "Source control platform",
      "launchPath": "https://github.com",
      "launchType": "url",
      "category": "Web",
      "createdAt": "2026-01-08T10:30:00Z",
      "modifiedAt": "2026-01-08T10:30:00Z"
    }
  ]
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `name` (string, required, max: 100 chars): Tool name
- `description` (string, optional, max: 300 chars): Tool description
- `launchPath` (string, required): File path or URL
- `launchType` (enum: "application" | "url", required): Launch method
- `category` (string, optional, max: 50 chars): Tool category
- `createdAt` (ISO 8601 datetime, required): Creation timestamp
- `modifiedAt` (ISO 8601 datetime, required): Last modification timestamp

**Validation Rules**:
- Name cannot be empty or whitespace-only
- `launchPath` must be valid file path (if `launchType: "application"`) or URL (if `launchType: "url"`)
- If `launchType: "application"`, path should exist (warning, not error)
- If `launchType: "url"`, must be valid HTTP(S) URL

**State Transitions**:
1. **Created**: User adds tool → entry added
2. **Modified**: User updates fields → `modifiedAt` updated
3. **Launched**: User clicks tool → shell opens path (no state change)
4. **Deleted**: User removes tool → entry removed

**Relationships**:
- Standalone entity (no foreign keys)

---

## Data Relationships Diagram

```
Configuration (singleton)

Project (1)
  ├─→ Note (0..*)        [projectId]
  ├─→ Todo (0..*)        [projectId]
  └─→ Milestone (0..*)   [projectId]

Note (1)
  └─→ Note (0..*)        [via [[Title]] references]

Todo (standalone with optional Project link)
Snippet (standalone)
Tool (standalone)
```

---

## File System Layout Summary

```
<user-selected-storage-root>/
├── .knowledgebase/
│   ├── config.json           # Configuration entity
│   ├── todos.json            # All Todo entities
│   ├── projects.json         # All Project entities
│   ├── milestones.json       # All Milestone entities
│   └── tools.json            # All Tool entities
├── notes/                    # Note entities (markdown files)
│   ├── <project-folder>/
│   │   └── *.md
│   └── *.md                  # Unassociated notes
└── snippets/                 # Snippet entities (JSON files)
    └── *.json
```

---

## Consistency and Integrity Rules

### Referential Integrity
- When a Project is deleted:
  - Prompt user to choose: delete associated Notes/Todos/Milestones OR unlink them
  - If unlink: set `projectId` to `null` in affected entities
- When a Note is deleted:
  - Scan for references in other notes → mark as broken links
  - Do NOT cascade delete

### Concurrent Modifications
- Not applicable (single-user, single-instance application)
- File locking handled by OS

### Backup Strategy
- Users can manually backup the storage folder (all data in one location)
- No automatic backup (out of scope)

---

## Migration Strategy

### Version 1.0.0 (Initial Release)
- Initialize all JSON files with empty arrays/objects if missing
- Create `.knowledgebase` folder on first run
- Create `notes/` and `snippets/` folders on first run

### Future Versions
- Check `config.version` on app start
- Run migration scripts sequentially (1.0.0 → 1.1.0 → 1.2.0)
- Backup config before migration
- Update `config.version` after successful migration

---

## Performance Considerations

### Indexing Strategy
- On app start: scan file system, build in-memory index
- Index contents: file paths, frontmatter, project associations
- Update index on create/modify/delete operations
- Re-index on storage location change

### Caching Strategy
- Cache parsed markdown (LRU cache, max 50 notes)
- Cache rendered HTML (LRU cache, max 20 notes)
- Cache todo/project/tool lists (invalidate on modification)

### Lazy Loading
- Load only active section's data
- Pre-fetch adjacent notes for instant navigation
- Load snippets incrementally if >500 snippets

---

## Validation Summary

All entities map to functional requirements:
- **Configuration**: FR-008, FR-009, FR-010
- **Note**: FR-001 through FR-007
- **Project**: FR-011 through FR-014
- **Todo**: FR-015 through FR-020
- **Milestone**: FR-021 through FR-024
- **Snippet**: FR-025 through FR-029
- **Tool**: FR-030 through FR-032

All success criteria have supporting data structures for measurement.
