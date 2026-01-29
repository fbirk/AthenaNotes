# Tasks: TODOs of the Day

**Input**: Design documents from `/specs/002-todos-of-the-day/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/ipc-api.md

**Tests**: Tests are included per existing project patterns (Vitest for unit tests, Playwright for E2E).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is an Electron desktop application:
- **Main process**: `src/main/`
- **Renderer process**: `src/renderer/`
- **Shared**: `src/shared/`
- **Tests**: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup

**Purpose**: Add constants and data file initialization for daily todos

- [X] T001 Add daily todo priority constants to src/shared/constants.js
- [X] T002 [P] Create daily-todos-service.js skeleton in src/main/services/daily-todos-service.js
- [X] T003 [P] Add dailyTodos IPC channel handlers to src/main/main.js
- [X] T004 [P] Extend preload.js to expose dailyTodos.* methods in src/main/preload.js

---

## Phase 2: Foundational (Data Layer)

**Purpose**: Core data operations that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement file initialization for daily-todos.json in src/main/services/daily-todos-service.js
- [X] T006 Implement file initialization for daily-todos-archive.json in src/main/services/daily-todos-service.js
- [X] T007 Implement loadDailyTodos() function in src/main/services/daily-todos-service.js
- [X] T008 Implement saveDailyTodos() function with atomic write in src/main/services/daily-todos-service.js
- [X] T009 Implement loadArchive() function in src/main/services/daily-todos-service.js
- [X] T010 Implement saveArchive() function with atomic write in src/main/services/daily-todos-service.js
- [X] T011 Add dailyTodos.* methods to api.js in src/renderer/js/services/api.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Quick Daily Task Creation (Priority: P1)

**Goal**: Users can quickly add tasks via input bar with add button

**Independent Test**: Type text in input bar, click add, verify task appears in list with default priority

### Tests for User Story 1

- [X] T012 [P] [US1] Unit test for dailyTodos.create() in tests/unit/services/daily-todos-service.test.js
- [X] T013 [P] [US1] Unit test for title validation (empty, whitespace, max length) in tests/unit/services/daily-todos-service.test.js

### Implementation for User Story 1

- [X] T014 [US1] Implement dailyTodos.create() IPC handler in src/main/services/daily-todos-service.js
- [X] T015 [P] [US1] Create daily-todos.js component skeleton in src/renderer/js/components/daily-todos.js
- [X] T016 [US1] Implement input bar HTML structure in src/renderer/js/components/daily-todos.js
- [X] T017 [US1] Implement add button and Enter key handler in src/renderer/js/components/daily-todos.js
- [X] T018 [US1] Add input validation (prevent empty todos) in src/renderer/js/components/daily-todos.js
- [X] T019 [US1] Clear input bar after successful creation in src/renderer/js/components/daily-todos.js
- [X] T020 [P] [US1] Add daily todos input bar styles to src/renderer/styles/components.css

**Checkpoint**: User Story 1 complete - users can create daily todos via input bar

---

## Phase 4: User Story 2 - Complete Daily Tasks (Priority: P2)

**Goal**: Users can check off tasks they've completed with single click

**Independent Test**: Create task, click checkbox, verify task shows as completed with visual distinction

### Tests for User Story 2

- [X] T021 [P] [US2] Unit test for dailyTodos.toggleComplete() in tests/unit/services/daily-todos-service.test.js
- [X] T022 [P] [US2] Unit test for completedAt timestamp handling in tests/unit/services/daily-todos-service.test.js

### Implementation for User Story 2

- [X] T023 [US2] Implement dailyTodos.toggleComplete() IPC handler in src/main/services/daily-todos-service.js
- [X] T024 [US2] Implement checkbox rendering in daily-todos.js in src/renderer/js/components/daily-todos.js
- [X] T025 [US2] Implement checkbox click handler for toggle in src/renderer/js/components/daily-todos.js
- [X] T026 [US2] Add visual distinction for completed todos (strikethrough, dimmed) in src/renderer/styles/components.css
- [X] T027 [US2] Sort completed todos below incomplete todos in src/renderer/js/components/daily-todos.js

**Checkpoint**: User Story 2 complete - users can complete and uncomplete tasks

---

## Phase 5: User Story 3 - Daily Rollover with Priority Boost (Priority: P3)

**Goal**: Incomplete tasks carry over with increased priority, completed tasks are archived

**Independent Test**: Create task, simulate day change, verify priority increased and completed tasks archived

### Tests for User Story 3

- [X] T028 [P] [US3] Unit test for single-day rollover in tests/unit/services/daily-todos-service.test.js
- [X] T029 [P] [US3] Unit test for multi-day rollover in tests/unit/services/daily-todos-service.test.js
- [X] T030 [P] [US3] Unit test for priority escalation (max cap at critical) in tests/unit/services/daily-todos-service.test.js
- [X] T031 [P] [US3] Unit test for archive creation from completed todos in tests/unit/services/daily-todos-service.test.js
- [X] T032 [P] [US3] Unit test for archive cleanup (retention days) in tests/unit/services/daily-todos-service.test.js

### Implementation for User Story 3

- [X] T033 [US3] Implement rollover() function with priority escalation in src/main/services/daily-todos-service.js
- [X] T034 [US3] Implement archiveTodo() function to move completed todos in src/main/services/daily-todos-service.js
- [X] T035 [US3] Implement cleanupArchive() function for retention in src/main/services/daily-todos-service.js
- [X] T036 [US3] Implement multi-day gap handling in rollover in src/main/services/daily-todos-service.js
- [X] T037 [US3] Add automatic rollover check to dailyTodos.list() in src/main/services/daily-todos-service.js
- [X] T038 [US3] Implement dailyTodos.rollover() IPC handler for manual trigger in src/main/services/daily-todos-service.js

**Checkpoint**: User Story 3 complete - automatic rollover with priority boost works

---

## Phase 6: User Story 4 - View Daily Todo List (Priority: P4)

**Goal**: Users see tasks in a clear vertical list sorted by priority

**Independent Test**: Create tasks with different priorities, verify correct sort order and visual indicators

### Tests for User Story 4

- [X] T039 [P] [US4] Unit test for sorting logic (priority, daysOverdue, createdAt) in tests/unit/services/daily-todos-service.test.js

### Implementation for User Story 4

- [X] T040 [US4] Implement sorting logic in dailyTodos.list() in src/main/services/daily-todos-service.js
- [X] T041 [US4] Implement todo list rendering in daily-todos.js in src/renderer/js/components/daily-todos.js
- [X] T042 [US4] Add priority indicator badges (low/medium/high/critical) in src/renderer/js/components/daily-todos.js
- [X] T043 [US4] Add days overdue indicator for rolled-over todos in src/renderer/js/components/daily-todos.js
- [X] T044 [US4] Implement empty state message when no todos exist in src/renderer/js/components/daily-todos.js
- [X] T045 [P] [US4] Add priority badge and overdue indicator styles in src/renderer/styles/components.css

**Checkpoint**: User Story 4 complete - list displays with proper sorting and indicators

---

## Phase 7: User Story 5 - Delete Daily Todos (Priority: P5)

**Goal**: Users can delete irrelevant tasks without confirmation

**Independent Test**: Create task, click delete, verify task is removed immediately

### Tests for User Story 5

- [X] T046 [P] [US5] Unit test for dailyTodos.delete() in tests/unit/services/daily-todos-service.test.js

### Implementation for User Story 5

- [X] T047 [US5] Implement dailyTodos.delete() IPC handler in src/main/services/daily-todos-service.js
- [X] T048 [US5] Add delete button to each todo item in src/renderer/js/components/daily-todos.js
- [X] T049 [US5] Implement delete click handler (no confirmation) in src/renderer/js/components/daily-todos.js
- [X] T050 [P] [US5] Add delete button styles in src/renderer/styles/components.css

**Checkpoint**: User Story 5 complete - users can delete todos instantly

---

## Phase 8: Integration & Polish

**Purpose**: Wire up component to app, add routing, and final polish

- [X] T051 Import and initialize daily-todos component in src/renderer/js/app.js
- [X] T052 Add #/daily-todos route to router.js in src/renderer/js/router.js
- [X] T053 Add daily todos section to index.html in src/renderer/index.html
- [X] T054 Add navigation link for daily todos in src/renderer/index.html
- [ ] T055 [P] E2E test: create daily todo via input bar in tests/e2e/daily-todos.spec.js
- [ ] T056 [P] E2E test: complete and uncomplete daily todo in tests/e2e/daily-todos.spec.js
- [ ] T057 [P] E2E test: delete daily todo in tests/e2e/daily-todos.spec.js
- [X] T058 Verify daily todos are independent from existing todos system
- [ ] T059 Code review and cleanup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Create): No dependencies on other stories
  - US2 (Complete): Requires US1 (need todos to complete)
  - US3 (Rollover): Requires US2 (needs completion logic)
  - US4 (View): Requires US1 (need todos to view)
  - US5 (Delete): Requires US1 (need todos to delete)
- **Integration (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
        ┌─────────────┐
        │ Foundational│
        │  (Phase 2)  │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌───────┐           ┌───────┐
│  US1  │◄──────────┤  US4  │ (View needs todos)
│Create │           │ View  │
└───┬───┘           └───────┘
    │
    ├─────────────────┐
    │                 │
    ▼                 ▼
┌───────┐       ┌───────┐
│  US2  │       │  US5  │
│Complete│       │Delete │
└───┬───┘       └───────┘
    │
    ▼
┌───────┐
│  US3  │
│Rollover│
└───────┘
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- IPC handlers before UI components
- Core logic before visual polish
- Story complete before moving to next

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004 can all run in parallel

**Phase 2 (Foundational)**:
- T005 + T006 can run in parallel (different files)
- T007 + T009 can run in parallel (load functions)
- T008 + T010 can run in parallel (save functions)

**Per User Story**:
- All tests marked [P] within a story can run in parallel
- UI styles marked [P] can run parallel to logic implementation

---

## Parallel Example: User Story 3 (Rollover)

```bash
# Launch all tests for User Story 3 together:
Task: "Unit test for single-day rollover in tests/unit/services/daily-todos-service.test.js"
Task: "Unit test for multi-day rollover in tests/unit/services/daily-todos-service.test.js"
Task: "Unit test for priority escalation in tests/unit/services/daily-todos-service.test.js"
Task: "Unit test for archive creation in tests/unit/services/daily-todos-service.test.js"
Task: "Unit test for archive cleanup in tests/unit/services/daily-todos-service.test.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Create)
4. Complete Phase 4: User Story 2 (Complete)
5. Complete Phase 6: User Story 4 (View)
6. **STOP and VALIDATE**: Basic daily todo functionality works
7. Deploy/demo if ready

### Full Feature

1. Continue with Phase 5: User Story 3 (Rollover) - core differentiator
2. Continue with Phase 7: User Story 5 (Delete)
3. Complete Phase 8: Integration & Polish
4. Full feature ready

### Incremental Delivery

1. MVP (Create + Complete + View) = functional daily checklist
2. Add Rollover = accountability feature
3. Add Delete = list management
4. Each increment adds value without breaking previous functionality

---

## Summary

| Phase | Story | Task Count | Parallel Tasks | Status |
|-------|-------|------------|----------------|--------|
| 1 | Setup | 4 | 3 | COMPLETE |
| 2 | Foundational | 7 | 4 | COMPLETE |
| 3 | US1 - Create | 9 | 3 | COMPLETE |
| 4 | US2 - Complete | 7 | 2 | COMPLETE |
| 5 | US3 - Rollover | 11 | 5 | COMPLETE |
| 6 | US4 - View | 7 | 2 | COMPLETE |
| 7 | US5 - Delete | 5 | 2 | COMPLETE |
| 8 | Integration | 9 | 3 | 5/9 COMPLETE |
| **Total** | | **59** | **24** | **55/59** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Data Independence**: daily-todos.json is completely separate from todos.json (FR-027, FR-028)
