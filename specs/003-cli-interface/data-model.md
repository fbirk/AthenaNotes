# Data Model: CLI Interface for KnowledgeBase

**Branch**: `003-cli-interface` | **Date**: 2026-03-19

## Overview

The CLI shares the **exact same data model** as the Electron app. No new entities or storage files are introduced. This document describes the entities as they exist, with notes on CLI-specific behavior.

## Entities

### Note

**Storage**: Individual `.md` files in `<storage>/notes/` (root) or `<storage>/notes/<project-folder>/` (project-scoped)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| title | string (max 200) | Yes | Note title, used as filename slug |
| content | string | Yes | Markdown body |
| createdAt | ISO timestamp | Yes | Creation time |
| modifiedAt | ISO timestamp | Yes | Last modification time |
| projectId | UUID string | No | Associated project ID |
| tags | string[] | No | Categorization tags |

**Validation**: Title must not contain `/ \ : * ? " < > |` characters.

**File Format**: YAML frontmatter + markdown body:
```yaml
---
id: "uuid"
title: "Note Title"
createdAt: "2026-03-19T10:00:00.000Z"
modifiedAt: "2026-03-19T10:00:00.000Z"
projectId: "project-uuid"
tags: ["tag1", "tag2"]
---
Markdown content here...
```

### Todo

**Storage**: `<storage>/.knowledgebase/todos.json` → `{ todos: [...] }`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| title | string (max 200) | Yes | Todo title |
| description | string | No | Markdown description |
| completed | boolean | Yes | Completion status |
| priority | enum: low, medium, high | Yes | Priority level (default: medium) |
| projectId | UUID string | No | Associated project |
| deadline | ISO timestamp | No | Due date/time |
| createdAt | ISO timestamp | Yes | Creation time |
| modifiedAt | ISO timestamp | Yes | Last modification time |

### Daily Todo

**Storage**: `<storage>/.knowledgebase/daily-todos.json` + `daily-todos-archive.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| title | string (max 500) | Yes | Task description |
| priority | enum: low, medium, high, critical | Yes | Priority (default: medium) |
| completed | boolean | Yes | Completion status |
| completedAt | ISO timestamp | No | When completed |
| createdAt | ISO timestamp | Yes | Creation time |
| createdDate | YYYY-MM-DD | Yes | Date string for rollover tracking |
| daysOverdue | number | Yes | Days since creation (0 = today) |

**State Transitions**:
- On list load: if `lastRolloverDate < today`, rollover triggers
- Rollover: completed items → archive, incomplete items get `daysOverdue++` and priority escalation
- Priority escalation: low → medium → high → critical (one step per missed day)
- Archive retention: 30 days

### Project

**Storage**: `<storage>/.knowledgebase/projects.json` → `{ projects: [...] }`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| name | string (max 100) | Yes | Project name |
| description | string (max 500) | No | Project description |
| status | enum: active, archived | Yes | Project status |
| createdAt | ISO timestamp | Yes | Creation time |

**Relationships**: Notes and Todos reference projects via `projectId`. A project folder in `notes/<project-name>/` stores project-scoped note files.

### Snippet

**Storage**: Individual JSON files in `<storage>/snippets/<uuid>.json`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| title | string (max 200) | Yes | Snippet title |
| description | string (max 500) | No | Description |
| language | string | Yes | Programming language |
| code | string | Yes | Code content |
| tags | object | Yes | Categorized tags |
| tags.language | string[] | Yes | Language tags (first used for highlighting) |
| tags.usage | string[] | No | Usage category tags |
| tags.module | string[] | No | Module/library tags |
| createdAt | ISO timestamp | Yes | Creation time |
| modifiedAt | ISO timestamp | Yes | Last modification time |

### Milestone

**Storage**: `<storage>/.knowledgebase/milestones.json` → `{ milestones: [...] }`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| title | string (max 200) | Yes | Milestone title |
| description | string (max 1000) | No | Description |
| projectId | UUID string | Yes | Parent project |
| deadline | ISO date | Yes | Target date |
| completed | boolean | Yes | Completion status |
| createdAt | ISO timestamp | Yes | Creation time |

### Tool

**Storage**: `<storage>/.knowledgebase/tools.json` → `{ tools: [...] }`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID string | Yes | Unique identifier |
| name | string (max 100) | Yes | Tool name |
| description | string (max 300) | No | Description |
| launchType | enum: application, url | Yes | Launch type |
| launchPath | string | Yes | File path or URL |
| category | string (max 50) | No | Grouping category |
| createdAt | ISO timestamp | Yes | Creation time |

### Config

**Storage**: `<storage>/.knowledgebase/config.json`

| Field | Type | Description |
| --- | --- | --- |
| storagePath | string | Absolute path to storage root |
| theme | enum: light, dark | UI theme (GUI-specific, ignored by CLI) |
| defaultView | string | Default view on launch |
| editorFontSize | number (10-24) | Font size (GUI-specific, ignored by CLI) |
| todosPanelCollapsed | boolean | Panel state (GUI-specific, ignored by CLI) |

**CLI-specific**: The CLI will read `defaultView` to determine which tab to show on startup. GUI-specific fields are preserved but not used.

## Storage Directory Structure

```
<storage-folder>/
├── .knowledgebase/
│   ├── config.json
│   ├── todos.json
│   ├── daily-todos.json
│   ├── daily-todos-archive.json
│   ├── projects.json
│   ├── milestones.json
│   └── tools.json
├── notes/
│   ├── *.md                     # Root-level notes
│   └── <project-folder>/        # Project-specific notes
│       └── *.md
└── snippets/
    └── <uuid>.json              # One file per snippet
```
