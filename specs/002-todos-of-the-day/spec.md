# Feature Specification: TODOs of the Day

**Feature Branch**: `002-todos-of-the-day`
**Created**: 2026-01-29
**Status**: Draft
**Input**: User description: "Create a feature for daily todo items that can be checked/completed. Open items carry over to the next day with higher priority. Completed items are removed the next day. Easy creation via input bar with add button. Unrelated to existing todos list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Daily Task Creation (Priority: P1)

As a developer, I want to quickly add tasks for today using a simple input bar so that I can capture tasks with minimal friction.

**Why this priority**: The primary interaction is creating daily tasks. Without fast, easy creation, the feature loses its core value proposition.

**Independent Test**: Can be tested by typing a task in the input bar, clicking add, and verifying the task appears in the list.

**Acceptance Scenarios**:

1. **Given** the TODOs of the day section is visible, **When** I type text in the input bar and click the add button, **Then** a new daily todo is created and appears in the list.
2. **Given** the input bar is focused, **When** I press Enter after typing, **Then** the todo is created (same as clicking add button).
3. **Given** a new daily todo is created, **When** I view the list, **Then** the todo appears with today's date and default priority.
4. **Given** the input bar, **When** I attempt to add an empty todo, **Then** no todo is created and the input remains focused.

---

### User Story 2 - Complete Daily Tasks (Priority: P2)

As a developer, I want to check off tasks I've completed today so that I can track my daily progress.

**Why this priority**: Completing tasks is the second most common interaction after creating them. Essential for the feature to function.

**Independent Test**: Can be tested by creating a task, clicking the checkbox, and verifying the task is marked complete.

**Acceptance Scenarios**:

1. **Given** a daily todo exists, **When** I click the checkbox next to it, **Then** the todo is marked as completed.
2. **Given** a completed daily todo, **When** I view the list, **Then** the completed todo is visually distinguished (e.g., strikethrough, dimmed).
3. **Given** a completed daily todo, **When** I click the checkbox again, **Then** the todo is marked as incomplete (toggle behavior).
4. **Given** completed and incomplete todos, **When** I view the list, **Then** incomplete todos appear above completed todos.

---

### User Story 3 - Daily Rollover with Priority Boost (Priority: P3)

As a developer, I want uncompleted tasks to carry over to the next day with increased priority so that I don't forget important tasks and overdue items get attention.

**Why this priority**: The rollover mechanism is the core differentiator from a simple checklist. It creates accountability and urgency.

**Independent Test**: Can be tested by creating a task, simulating a day change, and verifying the task appears with increased priority.

**Acceptance Scenarios**:

1. **Given** an incomplete daily todo from yesterday, **When** I open the application today, **Then** the todo appears in today's list with its priority increased by one level.
2. **Given** an incomplete daily todo that has rolled over multiple days, **When** I view it, **Then** its priority reflects the cumulative increases (with a maximum cap).
3. **Given** a completed daily todo from yesterday, **When** I open the application today, **Then** the completed todo is not visible in today's list.
4. **Given** the first launch of a new day, **When** the rollover process runs, **Then** the previous day's completion timestamp determines which todos are archived.

---

### User Story 4 - View Daily Todo List (Priority: P4)

As a developer, I want to see my daily tasks in a clear vertical list so that I can focus on what needs to be done today.

**Why this priority**: The list view is the primary interface for interacting with daily todos. Must be clear and scannable.

**Independent Test**: Can be tested by creating multiple todos and verifying they appear in the correct order.

**Acceptance Scenarios**:

1. **Given** multiple daily todos exist, **When** I view the list, **Then** todos are displayed vertically in priority order (highest priority first).
2. **Given** todos with the same priority, **When** I view the list, **Then** they are ordered by creation date (oldest first, as they've been waiting longer).
3. **Given** the daily todo list, **When** I view it, **Then** I can see each todo's title, priority indicator, and days overdue (if any).
4. **Given** a todo that has rolled over, **When** I view it, **Then** I can see a visual indicator showing how many days it has been pending.

---

### User Story 5 - Delete Daily Todos (Priority: P5)

As a developer, I want to delete tasks that are no longer relevant so that my list stays focused on actual work.

**Why this priority**: Users need the ability to remove irrelevant tasks to keep the list manageable.

**Independent Test**: Can be tested by creating a task, deleting it, and verifying it no longer appears.

**Acceptance Scenarios**:

1. **Given** a daily todo exists, **When** I click the delete action, **Then** the todo is permanently removed.
2. **Given** I delete a todo, **When** the deletion completes, **Then** no confirmation dialog is shown (fast interaction).
3. **Given** the last todo is deleted, **When** I view the list, **Then** an empty state message is displayed.

---

### Edge Cases

- What happens when the application is opened after being closed for multiple days?
- How does the system handle todos created just before midnight during rollover?
- What is the maximum priority level, and what happens when a todo reaches it?
- How does the system determine "today" in different timezones?
- What happens if the user creates a very long todo title?
- How are completed todos archived and can they be viewed historically?

## Requirements *(mandatory)*

### Functional Requirements

**Daily Todo Creation**
- **FR-001**: System MUST provide an input bar for creating daily todos.
- **FR-002**: System MUST provide an add button next to the input bar.
- **FR-003**: System MUST create a new daily todo when user clicks add or presses Enter.
- **FR-004**: System MUST NOT create a todo when the input is empty or whitespace-only.
- **FR-005**: System MUST clear the input bar after successfully creating a todo.
- **FR-006**: System MUST assign a default priority level to newly created todos.

**Daily Todo Completion**
- **FR-007**: System MUST allow marking a daily todo as complete via checkbox.
- **FR-008**: System MUST allow toggling completion status (complete/incomplete).
- **FR-009**: System MUST visually distinguish completed todos from incomplete todos.
- **FR-010**: System MUST record the completion timestamp when a todo is marked complete.

**Daily Rollover**
- **FR-011**: System MUST automatically roll over incomplete todos to the next day.
- **FR-012**: System MUST increase the priority of rolled-over todos by one level.
- **FR-013**: System MUST cap priority at a maximum level (e.g., "critical").
- **FR-014**: System MUST remove completed todos from the active list after the day changes.
- **FR-015**: System MUST archive completed todos for historical reference.
- **FR-016**: System MUST perform rollover when the application starts on a new day.
- **FR-017**: System MUST track the original creation date and days overdue for each todo.

**Daily Todo Display**
- **FR-018**: System MUST display daily todos in a vertical list.
- **FR-019**: System MUST sort todos by priority (highest first), then by age (oldest first).
- **FR-020**: System MUST display incomplete todos above completed todos.
- **FR-021**: System MUST show a priority indicator for each todo.
- **FR-022**: System MUST show days overdue for rolled-over todos.
- **FR-023**: System MUST display an empty state when no todos exist.

**Daily Todo Deletion**
- **FR-024**: System MUST allow deleting daily todos.
- **FR-025**: System MUST NOT require confirmation for deletion (fast interaction).
- **FR-026**: System MUST permanently remove deleted todos (no soft delete).

**Data Independence**
- **FR-027**: System MUST store daily todos separately from the existing todo system.
- **FR-028**: System MUST NOT share data or state with the existing todos feature.

### Key Entities

- **DailyTodo**: A daily task item with title, priority level, completion status, original creation date, and current day marker.
- **DailyTodoArchive**: Historical record of completed daily todos for reference.

### Assumptions

- The application is used by a single user (consistent with main app).
- "Day" is determined by local system time.
- Priority levels are: low, medium, high, critical (4 levels).
- New todos default to "medium" priority.
- Rollover runs once per day, triggered on first app interaction of the new day.
- Archived todos are kept for 30 days by default (configurable later).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new daily todo in under 5 seconds (type and press Enter).
- **SC-002**: Users can complete a todo with a single click.
- **SC-003**: Daily list is visible and scrollable within the designated UI area.
- **SC-004**: Rollover completes in under 1 second for up to 100 active todos.
- **SC-005**: Priority indicators are visually distinct and recognizable at a glance.
- **SC-006**: Overdue indicator clearly shows the number of days a todo has been pending.
- **SC-007**: The feature operates independently without affecting existing todos functionality.
