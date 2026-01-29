# Data Model: TODOs of the Day

**Feature**: 002-todos-of-the-day
**Phase**: 1 (Design & Contracts)
**Date**: 2026-01-29

## Overview

This document defines the data structures, relationships, validation rules, and state transitions for the TODOs of the Day feature. This feature is intentionally independent from the existing Todo system (FR-027, FR-028).

---

## Entity Definitions

### 1. DailyTodo

**Purpose**: A daily task item that persists until completed, with automatic priority escalation for overdue items.

**Storage**: `<storage-root>/.knowledgebase/daily-todos.json`

**Schema**:
```json
{
  "dailyTodos": [
    {
      "id": "daily-todo-uuid-v4",
      "title": "Todo title text",
      "priority": "medium",
      "completed": false,
      "completedAt": null,
      "createdAt": "2026-01-29T09:30:00Z",
      "createdDate": "2026-01-29",
      "daysOverdue": 0
    }
  ],
  "lastRolloverDate": "2026-01-29"
}
```

**Fields**:
- `id` (UUID v4, required): Unique identifier
- `title` (string, required, max: 500 chars): Todo title/description
- `priority` (enum: "low" | "medium" | "high" | "critical", required): Priority level
- `completed` (boolean, required, default: false): Completion status
- `completedAt` (ISO 8601 datetime, optional): Timestamp when marked complete
- `createdAt` (ISO 8601 datetime, required): Original creation timestamp
- `createdDate` (ISO 8601 date string, required): Date the todo was created (YYYY-MM-DD format)
- `daysOverdue` (integer, required, default: 0, min: 0): Number of days the todo has been carried over

**Root-level Fields**:
- `dailyTodos` (array, required): List of active daily todos
- `lastRolloverDate` (ISO 8601 date string, required): Date of the last rollover execution

**Validation Rules**:
- Title cannot be empty or whitespace-only
- Title maximum length is 500 characters
- `priority` must be one of: "low", "medium", "high", "critical"
- `daysOverdue` must be non-negative
- If `completed` is true, `completedAt` must be set
- If `completed` is false, `completedAt` must be null
- `createdDate` must be a valid date string in YYYY-MM-DD format

**State Transitions**:
1. **Created**: User creates daily todo → entry added with `completed: false`, `priority: "medium"`, `daysOverdue: 0`
2. **Completed**: User marks complete → `completed: true`, `completedAt` set to current timestamp
3. **Uncompleted**: User marks incomplete → `completed: false`, `completedAt: null`
4. **Rolled Over**: Day changes, todo incomplete → `daysOverdue` incremented, `priority` increased by one level (capped at "critical")
5. **Archived**: Day changes, todo was completed → entry moved to archive file, removed from active list
6. **Deleted**: User deletes todo → entry removed permanently

**Priority Escalation Rules**:
- When a todo rolls over, priority increases by one level
- Priority order: low → medium → high → critical
- Priority cannot exceed "critical" (maximum)
- Example: A "medium" priority todo that hasn't been completed for 2 days becomes "critical"

**Sorting Rules** (FR-019):
- Primary: Priority (critical > high > medium > low)
- Secondary: Days overdue (most overdue first)
- Tertiary: Creation timestamp (oldest first)
- Completed todos always appear after incomplete todos

---

### 2. DailyTodoArchive

**Purpose**: Historical record of completed daily todos for reference and analytics.

**Storage**: `<storage-root>/.knowledgebase/daily-todos-archive.json`

**Schema**:
```json
{
  "archivedTodos": [
    {
      "id": "daily-todo-uuid-v4",
      "title": "Completed todo title",
      "priority": "high",
      "completedAt": "2026-01-28T17:45:00Z",
      "createdAt": "2026-01-26T09:30:00Z",
      "createdDate": "2026-01-26",
      "archivedDate": "2026-01-29",
      "daysToComplete": 2
    }
  ],
  "retentionDays": 30
}
```

**Fields**:
- `id` (UUID v4, required): Original todo identifier
- `title` (string, required): Todo title at time of completion
- `priority` (enum, required): Final priority level when completed
- `completedAt` (ISO 8601 datetime, required): When the todo was marked complete
- `createdAt` (ISO 8601 datetime, required): Original creation timestamp
- `createdDate` (ISO 8601 date string, required): Date the todo was created
- `archivedDate` (ISO 8601 date string, required): Date the todo was moved to archive
- `daysToComplete` (integer, required): Number of days from creation to completion

**Root-level Fields**:
- `archivedTodos` (array, required): List of archived completed todos
- `retentionDays` (integer, required, default: 30): Number of days to keep archived items

**Validation Rules**:
- All fields are required (no optional fields)
- `daysToComplete` must be non-negative
- `retentionDays` must be positive (minimum 1)
- `archivedDate` must be >= `completedAt` date

**State Transitions**:
1. **Created**: Todo completed + day rollover → entry added to archive
2. **Purged**: Archive entry older than `retentionDays` → entry removed during cleanup

**Cleanup Rules**:
- During rollover, remove archived entries where `archivedDate` is older than `retentionDays`
- Cleanup runs automatically as part of the daily rollover process

---

## Rollover Process

The rollover process runs when the application starts and `lastRolloverDate` is before today's date.

**Rollover Algorithm**:

```
1. Get today's date (local timezone)
2. If lastRolloverDate >= today, exit (already rolled over)
3. For each todo in dailyTodos:
   a. If todo.completed == true:
      - Create archive entry with daysToComplete = (completedAt.date - createdDate)
      - Add to archivedTodos
      - Remove from dailyTodos
   b. If todo.completed == false:
      - Increment todo.daysOverdue by 1
      - Increase todo.priority by one level (capped at "critical")
4. Run archive cleanup (remove entries older than retentionDays)
5. Set lastRolloverDate = today
6. Save both files
```

**Multi-day Gap Handling**:
- If the app hasn't been opened for multiple days, process each missed day sequentially
- Example: If closed on Monday, opened on Thursday, process Tuesday and Wednesday rollovers
- Calculate days missed: `today - lastRolloverDate`
- Apply priority increases and daysOverdue increments for each missed day

---

## Data Relationships Diagram

```
DailyTodo (active)
  │
  │ rollover (day change + completed)
  ▼
DailyTodoArchive (historical)
  │
  │ cleanup (after retentionDays)
  ▼
(Purged)
```

**Independence from Existing Todos**:
```
Existing System                  Daily Todos System
─────────────────               ───────────────────
todos.json          ←── NO CONNECTION ──→   daily-todos.json
                                            daily-todos-archive.json
```

---

## File System Layout

```
<user-selected-storage-root>/
├── .knowledgebase/
│   ├── config.json              # Existing: App configuration
│   ├── todos.json               # Existing: Regular todos (unchanged)
│   ├── daily-todos.json         # NEW: Active daily todos
│   └── daily-todos-archive.json # NEW: Archived completed daily todos
```

---

## Default Values

**New DailyTodo**:
```json
{
  "id": "<generated-uuid>",
  "title": "<user-input>",
  "priority": "medium",
  "completed": false,
  "completedAt": null,
  "createdAt": "<current-timestamp>",
  "createdDate": "<current-date>",
  "daysOverdue": 0
}
```

**Initial daily-todos.json** (first run):
```json
{
  "dailyTodos": [],
  "lastRolloverDate": "<today>"
}
```

**Initial daily-todos-archive.json** (first run):
```json
{
  "archivedTodos": [],
  "retentionDays": 30
}
```

---

## Performance Considerations

### Expected Scale
- Active todos: 1-50 items typical, max ~100
- Archived todos: 30 days × average 5 completions/day = ~150 items
- Total data size: < 100KB typical

### Optimization Strategies
- Load daily-todos.json on app start (small file)
- Lazy load archive only when viewing history (future feature)
- Rollover process is O(n) where n = active todos
- Archive cleanup is O(n) where n = archived todos

### Caching Strategy
- Cache active todos in memory after initial load
- Update cache on create/complete/delete operations
- Persist to file on each modification (immediate save)
- Reload from file only on app restart

---

## Migration Strategy

### Version 1.0.0 (Initial Release)
- Create `daily-todos.json` with empty array on first access
- Create `daily-todos-archive.json` with empty array on first access
- Set `lastRolloverDate` to today on creation

### Future Versions
- Add `version` field to data files for schema migrations
- Support migration scripts similar to main config pattern

---

## Validation Summary

All entities map to functional requirements:
- **DailyTodo**: FR-001 through FR-023, FR-027
- **DailyTodoArchive**: FR-014, FR-015, FR-028
- **Rollover Process**: FR-011 through FR-017
