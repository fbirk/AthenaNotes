# IPC API Contract: Daily Todos

**Feature**: 002-todos-of-the-day
**Version**: 1.0.0
**Date**: 2026-01-29

## Overview

This document defines the IPC (Inter-Process Communication) contract for the Daily Todos feature. All APIs follow the same patterns established in the main application.

**Namespace**: All daily todo APIs are exposed under `window.knowledgeBase` with the `dailyTodos.*` prefix.

---

## Daily Todos API

### `dailyTodos.list()`

List all active daily todos for today.

**Request**: None

**Response**:
```typescript
{
  success: true,
  data: {
    todos: Array<{
      id: string,
      title: string,
      priority: "low" | "medium" | "high" | "critical",
      completed: boolean,
      completedAt: string | null,
      createdAt: string,
      createdDate: string,
      daysOverdue: number
    }>,
    lastRolloverDate: string
  }
}
```

**Notes**:
- Todos are returned pre-sorted by the sorting rules (priority desc, daysOverdue desc, createdAt asc)
- Incomplete todos appear before completed todos in the sorted list
- Automatically triggers rollover if `lastRolloverDate` is before today

---

### `dailyTodos.create(todo)`

Create a new daily todo.

**Request**:
```typescript
{
  title: string  // Required, max 500 chars
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    title: string,
    priority: "medium",
    completed: false,
    completedAt: null,
    createdAt: string,
    createdDate: string,
    daysOverdue: 0
  }
}
```

**Errors**:
- `VALIDATION_ERROR`: Title is empty, whitespace-only, or exceeds 500 characters

---

### `dailyTodos.toggleComplete(id)`

Toggle the completion status of a daily todo.

**Request**:
```typescript
{
  id: string  // Todo UUID
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

**Errors**:
- `DAILY_TODO_NOT_FOUND`: Todo with the specified ID doesn't exist

**Notes**:
- If toggling to complete: `completed` becomes `true`, `completedAt` is set to current timestamp
- If toggling to incomplete: `completed` becomes `false`, `completedAt` is set to `null`

---

### `dailyTodos.delete(id)`

Delete a daily todo permanently.

**Request**:
```typescript
{
  id: string  // Todo UUID
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

**Errors**:
- `DAILY_TODO_NOT_FOUND`: Todo with the specified ID doesn't exist

**Notes**:
- Deletion is permanent and immediate
- No confirmation required (fast interaction per FR-025)

---

### `dailyTodos.rollover()`

Manually trigger the daily rollover process.

**Request**: None

**Response**:
```typescript
{
  success: true,
  data: {
    rolledOver: boolean,      // true if rollover was performed
    todosArchived: number,    // count of completed todos moved to archive
    todosEscalated: number,   // count of incomplete todos with priority increased
    newRolloverDate: string   // the date after rollover
  }
}
```

**Notes**:
- Normally called automatically when `dailyTodos.list()` detects a new day
- Can be called manually for testing or recovery scenarios
- If already rolled over today, returns `rolledOver: false` with zero counts
- Handles multi-day gaps by processing each missed day

---

### `dailyTodos.getArchive(options)`

Retrieve archived (completed) daily todos.

**Request**:
```typescript
{
  limit?: number,   // Max items to return (default: 50)
  offset?: number,  // Pagination offset (default: 0)
  fromDate?: string,// Filter: archived on or after this date (YYYY-MM-DD)
  toDate?: string   // Filter: archived on or before this date (YYYY-MM-DD)
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    archivedTodos: Array<{
      id: string,
      title: string,
      priority: "low" | "medium" | "high" | "critical",
      completedAt: string,
      createdAt: string,
      createdDate: string,
      archivedDate: string,
      daysToComplete: number
    }>,
    total: number,           // Total count matching filters
    retentionDays: number    // Current retention setting
  }
}
```

**Notes**:
- Sorted by `archivedDate` descending (most recent first)
- Used for viewing historical completions (future feature)

---

### `dailyTodos.updatePriority(id, priority)`

Manually update the priority of a daily todo.

**Request**:
```typescript
{
  id: string,
  priority: "low" | "medium" | "high" | "critical"
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    priority: "low" | "medium" | "high" | "critical"
  }
}
```

**Errors**:
- `DAILY_TODO_NOT_FOUND`: Todo with the specified ID doesn't exist
- `VALIDATION_ERROR`: Invalid priority value

**Notes**:
- Allows users to manually adjust priority if needed
- Does not affect `daysOverdue` counter

---

## Error Response Format

All API methods return errors in the standard format:

```typescript
{
  success: false,
  error: {
    code: string,      // Error code (e.g., "DAILY_TODO_NOT_FOUND")
    message: string,   // Human-readable error message
    details?: any      // Optional additional error details
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed (empty title, invalid priority, etc.) |
| `DAILY_TODO_NOT_FOUND` | Todo with specified ID doesn't exist |
| `READ_ERROR` | Failed to read daily todos file |
| `WRITE_ERROR` | Failed to write daily todos file |
| `STORAGE_NOT_CONFIGURED` | Storage location not set (app not initialized) |

---

## Implementation Notes

1. **Automatic Rollover**: The `dailyTodos.list()` method checks `lastRolloverDate` and automatically triggers rollover if needed before returning results.

2. **Atomic Writes**: Use atomic write operations (write to temp file, then rename) to prevent data corruption.

3. **File Initialization**: Create `daily-todos.json` and `daily-todos-archive.json` with default values on first access if they don't exist.

4. **Timezone Handling**: Use local system timezone for determining "today" (consistent with user expectations).

5. **Sorting**: Pre-sort todos in the main process before returning to renderer. Sorting rules:
   - Incomplete before completed
   - Within incomplete: priority (critical > high > medium > low)
   - Within same priority: daysOverdue (highest first)
   - Within same daysOverdue: createdAt (oldest first)

6. **Independence**: These handlers are completely separate from the existing `todos.*` handlers. No shared code or data.

---

## Testing Requirements

- **Contract tests**: Verify all API methods exist and return correct structure
- **Validation tests**: Test input validation for create and updatePriority
- **Rollover tests**: Test single-day and multi-day rollover scenarios
- **Archive tests**: Test completed todos move to archive correctly
- **Edge cases**: Empty list, max priority, title length limits
