# Tasks: CLI Interface for KnowledgeBase

**Input**: Design documents from `/specs/003-cli-interface/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/service-api.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and CLI directory scaffolding

- [x] T001 Create CLI directory structure: `src/cli/`, `src/cli/services/`, `src/cli/components/`, `src/cli/hooks/`, `src/cli/lib/`, `tests/unit/cli/`
- [x] T002 Install new dependencies: ink, react, ink-text-input, ink-select-input, ink-spinner, marked-terminal, cli-highlight, clipboardy, open, meow — update `package.json`
- [x] T003 [P] Add npm scripts to `package.json`: `"cli": "node src/cli/index.js"`, `"cli:dev": "node --watch src/cli/index.js"`, and bin entry `"knowledgebase": "src/cli/index.js"`
- [x] T004 [P] Verify existing services work outside Electron by creating a minimal smoke test: import `file-service.js`, `config-service.js`, `daily-todos-service.js` from `src/main/services/` and call `.initialize()` with a temp directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CLI infrastructure that MUST be complete before ANY user story tab can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement CLI entry point with arg parsing (meow) and bootstrap config chain (CLI arg > env var > Electron bootstrap > ~/.knowledgebase-cli.json > setup wizard) in `src/cli/index.js`
- [x] T006 Implement KnowledgeBase service adapter wrapping file-service, config-service, and daily-todos-service with `{ success, data, error }` response format in `src/cli/services/kb-service.js`
- [x] T007 Implement root App component with fullscreen Ink layout (tab bar top, content center, status bar bottom) and active tab state management in `src/cli/app.js`
- [x] T008 Implement TabBar component with 7 tabs (Notes, Todos, Daily Todos, Projects, Snippets, Roadmaps, Tools), number key 1-7 switching, and Tab/Shift+Tab cycling in `src/cli/components/tab-bar.js`
- [x] T009 Implement StatusBar component showing current section name, item count, and context-sensitive keyboard shortcut hints in `src/cli/components/status-bar.js`
- [x] T010 Implement useKeyboard hook with global shortcut layer (1-7 tabs, ? help, Ctrl+Q quit) and contextual shortcut registration/unregistration in `src/cli/hooks/use-keyboard.js`
- [x] T011 Implement useFocus hook for managing focus between list panel and detail panel (Tab to switch, track active panel) in `src/cli/hooks/use-focus.js`
- [x] T012 Implement useData hook for data loading with caching, refresh on demand, and loading state tracking in `src/cli/hooks/use-data.js`
- [x] T013 Implement reusable ListDetail split-panel component with scrollable list (Up/Down arrow navigation, Enter to select, Escape to deselect), visible selection highlight, and detail panel slot in `src/cli/components/list-detail.js`
- [x] T014 [P] Implement HelpOverlay component rendering contextual keyboard shortcuts when ? is pressed, dismissible with Escape or ? in `src/cli/components/help-overlay.js`
- [x] T015 [P] Implement ConfirmDialog overlay component for destructive action confirmation (y/n input) in `src/cli/components/confirm-dialog.js`
- [x] T016 [P] Implement terminal markdown rendering library configuring marked with marked-terminal renderer (headings, lists, bold, italic, code blocks, links, graceful image degradation) in `src/cli/lib/terminal-markdown.js`
- [x] T017 [P] Implement MarkdownPreview component that takes markdown string and renders terminal-formatted output using terminal-markdown lib in `src/cli/components/markdown-preview.js`
- [x] T018 [P] Implement editor service for launching $EDITOR/$VISUAL (fallback: notepad on Windows) with temp file round-trip and change detection in `src/cli/services/editor-service.js`
- [x] T019 [P] Implement SetupWizard component for first-run storage path selection with text input, path validation via kb-service, and initialization in `src/cli/components/setup-wizard.js`

**Checkpoint**: Foundation ready — CLI launches, shows tab bar with empty tabs, keyboard navigation works, help overlay shows. User story tab implementation can now begin.

---

## Phase 3: User Story 1 — Navigate the Knowledge Base via Keyboard (Priority: P1) MVP

**Goal**: Users can launch the CLI, switch between 7 tabs using number keys, navigate lists with arrow keys, select items with Enter, go back with Escape, and view a contextual help overlay.

**Independent Test**: Launch CLI, press 1-7 to switch tabs, use arrow keys in any populated list, press Enter to see detail, Escape to return, ? for help.

### Implementation for User Story 1

- [x] T020 [US1] Wire tab switching in App component: map number keys 1-7 to activeTab state, render placeholder content per tab showing tab name and "coming soon" message in `src/cli/app.js`
- [x] T021 [US1] Wire useKeyboard global layer into App: register 1-7 tab switch, ? help toggle, Ctrl+Q quit handlers in `src/cli/app.js`
- [x] T022 [US1] Wire HelpOverlay into App: show/hide on ? key, display global shortcuts + active tab shortcuts in `src/cli/app.js`
- [x] T023 [US1] Wire StatusBar into App: pass active tab name, item count (0 for placeholder), and shortcut hints from active tab context in `src/cli/app.js`
- [x] T024 [US1] Implement list navigation in ListDetail: virtual scrolling for lists > terminal height, page up/down support, visible scroll indicator in `src/cli/components/list-detail.js`
- [x] T025 [US1] Add Tab/Shift+Tab cycling between tabs in TabBar as alternative to number keys in `src/cli/components/tab-bar.js`

**Checkpoint**: CLI launches fullscreen, all 7 tabs switchable, list-detail layout navigable, help overlay functional.

---

## Phase 4: User Story 2 — View and Edit Notes with Markdown Preview (Priority: P1)

**Goal**: Users can browse notes in a sidebar list, view rendered markdown preview, switch to edit mode (launches $EDITOR), save changes, create new notes, and delete notes.

**Independent Test**: Navigate to Notes tab, select a note from list, see markdown rendered in terminal, press 'e' to edit in external editor, save, press 'p' to preview, create new note with 'n', delete with 'd'.

### Implementation for User Story 2

- [x] T026 [P] [US2] Implement notes list rendering in NotesTab: show note title, modified date, project tag per item, sorted by modification date in `src/cli/components/notes-tab.js`
- [x] T027 [P] [US2] Add notes CRUD methods to kb-service: listNotes (with projectId filter, sortBy, sortOrder), getNote, createNote, updateNote, deleteNote — wrapping fileService calls with `{ success, data, error }` in `src/cli/services/kb-service.js`
- [x] T028 [US2] Implement note detail panel in NotesTab: preview mode showing MarkdownPreview of note content, note title display, project label in `src/cli/components/notes-tab.js`
- [x] T029 [US2] Implement edit mode in NotesTab: press 'e' launches $EDITOR via editor-service with note content, on close detect changes and save via kb-service in `src/cli/components/notes-tab.js`
- [x] T030 [US2] Implement note creation flow in NotesTab: press 'n' prompts for title via inline text input, then opens $EDITOR for content, saves via kb-service.createNote in `src/cli/components/notes-tab.js`
- [x] T031 [US2] Implement note deletion in NotesTab: press 'd' shows ConfirmDialog, on confirm calls kb-service.deleteNote, refreshes list in `src/cli/components/notes-tab.js`
- [x] T032 [US2] Implement project filter dropdown in NotesTab: press 'f' cycles through All Projects + individual projects, reloads filtered note list in `src/cli/components/notes-tab.js`
- [x] T033 [US2] Implement sort selector in NotesTab: press 's' cycles sort options (Recent, Oldest, Title A-Z, Title Z-A, Newest, Oldest Created), reloads sorted list in `src/cli/components/notes-tab.js`
- [x] T034 [US2] Register NotesTab keyboard shortcuts (e, p, n, d, f, s, Ctrl+S) with useKeyboard contextual layer and display in StatusBar in `src/cli/components/notes-tab.js`

**Checkpoint**: Notes tab fully functional — list, preview, edit, create, delete, filter, sort all working via keyboard.

---

## Phase 5: User Story 3 — Manage Todos and Daily Todos (Priority: P1)

**Goal**: Users can view todos with priority colors, toggle completion with Space, filter by status, create/edit/delete todos. Daily Todos supports quick-add, checkbox toggle, overdue indicators, and automatic rollover.

**Independent Test**: Navigate to Todos tab, Space to toggle a todo, 'n' to create, filter with 'f'. Switch to Daily Todos tab, type task + Enter to add, Space to check off.

### Implementation for User Story 3

- [x] T035 [P] [US3] Add todos CRUD methods to kb-service: listTodos, createTodo, updateTodo, toggleTodoComplete, deleteTodo — implementing inline JSON read/modify/write logic from main.js handlers in `src/cli/services/kb-service.js`
- [x] T036 [P] [US3] Add milestones CRUD methods to kb-service: listMilestones, createMilestone, updateMilestone, toggleMilestoneComplete, deleteMilestone in `src/cli/services/kb-service.js`
- [x] T037 [US3] Implement TodosTab list rendering: show title, priority badge (color-coded: red=high, yellow=medium, green=low), completion checkbox indicator, project tag, deadline in `src/cli/components/todos-tab.js`
- [x] T038 [US3] Implement todo completion toggle in TodosTab: Space key toggles selected todo's completed status via kb-service, updates visual indicator (strikethrough + checkbox) in `src/cli/components/todos-tab.js`
- [x] T039 [US3] Implement todo filter in TodosTab: 'f' cycles All/Active/Completed, filters displayed list accordingly in `src/cli/components/todos-tab.js`
- [x] T040 [US3] Implement todo detail panel in TodosTab: show title, description (MarkdownPreview in preview mode), priority, project, deadline, completion status in `src/cli/components/todos-tab.js`
- [x] T041 [US3] Implement todo edit mode in TodosTab: 'e' enters edit mode with inline inputs for title/priority/project/deadline, launches $EDITOR for description, Ctrl+S saves in `src/cli/components/todos-tab.js`
- [x] T042 [US3] Implement todo creation in TodosTab: 'n' shows creation form with inline inputs for title, priority, project, deadline, description via $EDITOR in `src/cli/components/todos-tab.js`
- [x] T043 [US3] Implement todo deletion in TodosTab: 'd' shows ConfirmDialog, on confirm calls kb-service.deleteTodo in `src/cli/components/todos-tab.js`
- [x] T044 [US3] Register TodosTab shortcuts (Space, f, e, p, n, d, Ctrl+S) with useKeyboard and StatusBar in `src/cli/components/todos-tab.js`
- [x] T045 [US3] Implement DailyTodosTab list rendering: show title, priority badge (color-coded), completion checkbox, overdue indicator ("X days overdue" in red) in `src/cli/components/daily-todos-tab.js`
- [x] T046 [US3] Implement quick-add input bar in DailyTodosTab: text input at top, Enter to create daily todo via kb-service (dailyTodosService.create), clear input and refresh list in `src/cli/components/daily-todos-tab.js`
- [x] T047 [US3] Implement daily todo completion toggle in DailyTodosTab: Space toggles selected item via kb-service (dailyTodosService.toggleComplete), update visual in `src/cli/components/daily-todos-tab.js`
- [x] T048 [US3] Implement daily todo deletion in DailyTodosTab: 'd' deletes without confirmation (per existing FR-025 pattern), refresh list in `src/cli/components/daily-todos-tab.js`
- [x] T049 [US3] Implement automatic rollover trigger in DailyTodosTab: on tab load, call kb-service list (which triggers rollover internally), display date header in `src/cli/components/daily-todos-tab.js`
- [x] T050 [US3] Register DailyTodosTab shortcuts (Space, d, Enter for quick-add) with useKeyboard and StatusBar in `src/cli/components/daily-todos-tab.js`

**Checkpoint**: Todos and Daily Todos tabs fully functional — list, toggle, filter, create, edit, delete, quick-add, rollover all working.

---

## Phase 6: User Story 4 — Manage Code Snippets with Syntax Display (Priority: P2)

**Goal**: Users can browse snippets, search by keyword, filter by tags, view syntax-highlighted code, copy code to clipboard, and create/edit/delete snippets.

**Independent Test**: Navigate to Snippets tab, type in search to filter, select a snippet to see syntax-colored code, press 'c' to copy to clipboard.

### Implementation for User Story 4

- [x] T051 [P] [US4] Implement syntax highlighting wrapper using cli-highlight with language auto-detection and theme configuration in `src/cli/lib/syntax-highlight.js`
- [x] T052 [P] [US4] Implement clipboard wrapper using clipboardy for cross-platform copy-to-clipboard in `src/cli/lib/clipboard.js`
- [x] T053 [US4] Implement SnippetsTab list rendering: show title, language tag, description preview per item in `src/cli/components/snippets-tab.js`
- [x] T054 [US4] Implement search input in SnippetsTab: '/' focuses search text input, real-time filtering via kb-service.searchSnippets as user types in `src/cli/components/snippets-tab.js`
- [x] T055 [US4] Implement tag filter in SnippetsTab: 'f' cycles filter mode (language/usage/module), then accepts filter text input in `src/cli/components/snippets-tab.js`
- [x] T056 [US4] Implement snippet detail panel in SnippetsTab: show title, description, tags, and syntax-highlighted code block using syntax-highlight lib in `src/cli/components/snippets-tab.js`
- [x] T057 [US4] Implement copy-to-clipboard in SnippetsTab: 'c' copies selected snippet's code via clipboard lib, shows success feedback in StatusBar in `src/cli/components/snippets-tab.js`
- [x] T058 [US4] Implement snippet creation in SnippetsTab: 'n' shows form with inline inputs for title/language/tags, launches $EDITOR for code body, saves via kb-service in `src/cli/components/snippets-tab.js`
- [x] T059 [US4] Implement snippet edit and delete in SnippetsTab: 'e' edits, 'd' deletes with ConfirmDialog in `src/cli/components/snippets-tab.js`
- [x] T060 [US4] Register SnippetsTab shortcuts (/, f, c, e, n, d) with useKeyboard and StatusBar in `src/cli/components/snippets-tab.js`

**Checkpoint**: Snippets tab fully functional — search, filter, syntax display, clipboard copy, CRUD all working.

---

## Phase 7: User Story 5 — Manage Projects and Roadmaps (Priority: P2)

**Goal**: Users can view projects with details, create/edit/delete projects, view milestones in a timeline with progress bars, toggle milestone completion, and filter by project.

**Independent Test**: Navigate to Projects tab, select a project to see details and notes count, switch to Roadmaps tab to see milestone timeline with progress.

### Implementation for User Story 5

- [x] T061 [P] [US5] Add projects CRUD methods to kb-service: listProjects, getProject, createProject, updateProject, deleteProject (with notes handling option) in `src/cli/services/kb-service.js`
- [x] T062 [US5] Implement ProjectsTab list rendering: show project name, description preview, status per item in `src/cli/components/projects-tab.js`
- [x] T063 [US5] Implement project detail panel in ProjectsTab: show name, description, status, count of associated notes in `src/cli/components/projects-tab.js`
- [x] T064 [US5] Implement project creation in ProjectsTab: 'n' shows form with inline inputs for name (max 100) and description (max 500), saves via kb-service in `src/cli/components/projects-tab.js`
- [x] T065 [US5] Implement project edit and delete in ProjectsTab: 'e' edits fields, 'd' shows ConfirmDialog with option to keep or delete associated notes in `src/cli/components/projects-tab.js`
- [x] T066 [US5] Register ProjectsTab shortcuts (n, e, d) with useKeyboard and StatusBar in `src/cli/components/projects-tab.js`
- [x] T067 [US5] Implement RoadmapsTab view: project filter dropdown ('f'), display milestones + project todos combined as timeline sorted by deadline in `src/cli/components/roadmaps-tab.js`
- [x] T068 [US5] Implement milestone timeline rendering in RoadmapsTab: use Unicode box-drawing characters (─, │, ├, └) for timeline lines, color-code by status (green=complete, yellow=pending, red=overdue) in `src/cli/components/roadmaps-tab.js`
- [x] T069 [US5] Implement progress bar in RoadmapsTab: show completion percentage and X/Y counter per project using Unicode block characters (░, ▒, ▓, █) in `src/cli/components/roadmaps-tab.js`
- [x] T070 [US5] Implement milestone completion toggle in RoadmapsTab: Space toggles milestone via kb-service, milestone creation with 'n' (title, deadline, description), edit with 'e', delete with 'd' in `src/cli/components/roadmaps-tab.js`
- [x] T071 [US5] Register RoadmapsTab shortcuts (Space, f, n, e, d) with useKeyboard and StatusBar in `src/cli/components/roadmaps-tab.js`

**Checkpoint**: Projects and Roadmaps tabs fully functional — project CRUD, milestone timeline, progress visualization, completion toggle all working.

---

## Phase 8: User Story 6 — Launch Software Tools (Priority: P3)

**Goal**: Users can browse tools grouped by category, launch applications or open URLs from the CLI.

**Independent Test**: Navigate to Tools tab, see tools grouped by category, select a tool and press Enter to launch it.

### Implementation for User Story 6

- [x] T072 [P] [US6] Add tools CRUD methods to kb-service: listTools, createTool, updateTool, deleteTool, launchTool (using `open` package for URLs and `child_process.exec` for applications) in `src/cli/services/kb-service.js`
- [x] T073 [US6] Implement ToolsTab rendering: display tools grouped by category with category headings, show name, description, launch type icon (globe/monitor) per tool in `src/cli/components/tools-tab.js`
- [x] T074 [US6] Implement tool launch in ToolsTab: Enter launches selected tool via kb-service.launchTool, show feedback in StatusBar in `src/cli/components/tools-tab.js`
- [x] T075 [US6] Implement tool creation in ToolsTab: 'n' shows form with inline inputs for name, launch type (application/url), path/URL, category, description in `src/cli/components/tools-tab.js`
- [x] T076 [US6] Implement tool edit and delete in ToolsTab: 'e' edits, 'd' deletes with ConfirmDialog in `src/cli/components/tools-tab.js`
- [x] T077 [US6] Implement category filter in ToolsTab: 'f' cycles All Categories + individual categories in `src/cli/components/tools-tab.js`
- [x] T078 [US6] Register ToolsTab shortcuts (Enter, n, e, d, f) with useKeyboard and StatusBar in `src/cli/components/tools-tab.js`

**Checkpoint**: Tools tab fully functional — category grouping, launch, CRUD all working.

---

## Phase 9: User Story 7 — First-Run Setup and Configuration (Priority: P3)

**Goal**: New users are guided through storage folder selection. Existing Electron users have zero-friction automatic detection.

**Independent Test**: Launch CLI without configured storage, complete setup wizard, relaunch to verify auto-detection.

### Implementation for User Story 7

- [x] T079 [US7] Implement Electron bootstrap config detection in CLI entry point: read `.dev-storage.json` and `storage-location.json` from expected Electron paths in `src/cli/index.js`
- [x] T080 [US7] Implement CLI-specific config persistence: save selected storage path to `~/.knowledgebase-cli.json` after setup wizard completes in `src/cli/index.js`
- [x] T081 [US7] Implement path validation in SetupWizard: validate entered path exists and is writable via kb-service, show clear error for invalid paths, re-prompt on failure in `src/cli/components/setup-wizard.js`
- [x] T082 [US7] Implement storage initialization in SetupWizard: on valid path confirmation, call configService.setStorageLocation to create directory structure, then transition to main App in `src/cli/components/setup-wizard.js`

**Checkpoint**: Setup flow complete — new users guided, existing users auto-detected, invalid paths handled.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, responsive behavior, and final quality improvements

- [x] T083 Implement terminal resize handling in App: listen for stdout resize events, re-render layout, show minimum width warning (80 columns) when terminal is too narrow in `src/cli/app.js`
- [x] T084 [P] Implement graceful degradation for narrow terminals: collapse list-detail to single panel mode when width < 100 columns, show width warning < 80 columns in `src/cli/components/list-detail.js`
- [x] T085 [P] Implement long content scrolling in detail panels: scrollable markdown preview with Page Up/Down, scroll position indicator in `src/cli/components/markdown-preview.js`
- [x] T086 [P] Implement error state handling across all tabs: show user-friendly error messages when service calls fail, offer retry option in `src/cli/app.js`
- [x] T087 [P] Implement unsaved changes guard in NotesTab and TodosTab: warn before navigating away from edited content via ConfirmDialog in `src/cli/components/notes-tab.js` and `src/cli/components/todos-tab.js`
- [x] T088 Add graceful markdown degradation: images render as `[Image: alt-text]`, HTML blocks render as `[HTML content]` in `src/cli/lib/terminal-markdown.js`
- [x] T089 Add loading spinners (ink-spinner) for async operations: show spinner while loading notes list, saving, deleting across all tab components
- [x] T090 Final keyboard shortcut audit: verify all shortcuts documented in help overlay match actual handlers, no conflicts between global and contextual layers in `src/cli/components/help-overlay.js`
- [x] T091 Run quickstart.md validation: verify `npm run cli` launches correctly, all 7 tabs work, basic CRUD on notes and todos succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — wires the app shell together
- **US2 (Phase 4)**: Depends on Foundational + benefits from US1 (tab switching works)
- **US3 (Phase 5)**: Depends on Foundational + benefits from US1
- **US4 (Phase 6)**: Depends on Foundational — independent of US1-3
- **US5 (Phase 7)**: Depends on Foundational — independent of US1-4
- **US6 (Phase 8)**: Depends on Foundational — independent of US1-5
- **US7 (Phase 9)**: Depends on Foundational — independent of US1-6
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only — no cross-story dependencies. Wires the app shell.
- **US2 (P1)**: Foundational only — notes tab is fully independent
- **US3 (P1)**: Foundational only — todos/daily-todos tabs are fully independent
- **US4 (P2)**: Foundational only — snippets tab is fully independent
- **US5 (P2)**: Foundational only — projects tab independent; roadmaps tab benefits from milestones methods added in US3 (T036) but can implement its own
- **US6 (P3)**: Foundational only — tools tab is fully independent
- **US7 (P3)**: Foundational only — setup wizard is fully independent (already scaffolded in T019)

### Within Each User Story

- Service methods before UI components
- List rendering before detail panel
- Read operations before write operations
- Core interaction before secondary features (filter, sort)
- Shortcut registration as final task per story

### Parallel Opportunities

**Phase 2 parallel groups:**
- Group A (independent): T014, T015, T016, T017, T018, T019 can all run in parallel
- Group B (sequential): T005 → T006 → T007 → T008/T009 → T010/T011/T012 → T013

**Cross-story parallelism after Phase 2:**
- US2, US3, US4, US5, US6, US7 can ALL proceed in parallel (different files, no shared state)
- US1 should complete first as it wires the app shell, but other stories only need Foundational

---

## Parallel Example: User Story 2 (Notes)

```
# These can run in parallel (different files):
Agent 1: T026 — Notes list rendering in notes-tab.js
Agent 2: T027 — Notes CRUD methods in kb-service.js

# Then sequential:
T028 — Note detail panel (depends on T026, T027)
T029 — Edit mode (depends on T028)
T030 — Note creation (depends on T028)
T031 — Note deletion (depends on T028)

# These can run in parallel:
Agent 1: T032 — Project filter
Agent 2: T033 — Sort selector

# Final:
T034 — Register shortcuts
```

## Parallel Example: User Story 3 (Todos + Daily Todos)

```
# These can run in parallel (different service methods):
Agent 1: T035 — Todos CRUD methods in kb-service.js
Agent 2: T036 — Milestones CRUD methods in kb-service.js

# Then Todos tab (sequential):
T037 → T038 → T039 → T040 → T041 → T042 → T043 → T044

# Daily Todos tab (can start as soon as T035 is done):
T045 → T046 → T047 → T048 → T049 → T050
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — App shell with tab navigation
4. Complete Phase 4: US2 — Notes with edit/preview
5. **STOP and VALIDATE**: CLI launches, tabs switch, notes viewable/editable
6. Demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Tab navigation works → **Skeleton MVP**
3. US2 → Notes CRUD → **Content MVP** (most valuable feature)
4. US3 → Todos + Daily Todos → **Productivity MVP**
5. US4 → Snippets → Code management added
6. US5 → Projects + Roadmaps → Organization added
7. US6 → Tools → Launcher added
8. US7 → Setup wizard → First-run experience polished
9. Polish → Edge cases, resize, error handling

### Parallel Agent Strategy

With multiple agents after Foundational phase:

- **Agent A**: US1 (app shell wiring) → US2 (notes tab)
- **Agent B**: US3 (todos + daily todos tabs)
- **Agent C**: US4 (snippets tab) + US6 (tools tab)
- **Agent D**: US5 (projects + roadmaps tabs) + US7 (setup wizard)
- **All agents**: Polish phase (each handles their own tabs' edge cases)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after Foundational phase
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing services in `src/main/services/` must NOT be modified — CLI adapter wraps them
