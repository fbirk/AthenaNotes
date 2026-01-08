# Tasks: Developer Knowledge Base

**Input**: Design documents from `/specs/001-developer-knowledge-base/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ipc-api.md

**Tests**: Tests are NOT explicitly required in the feature specification, so test tasks are NOT included per requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to repository root `C:\Users\BirkF\source\repos\KnowledgeBase\`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic Electron + Vite structure

- [x] T001 Initialize npm project and create package.json with Electron + Vite configuration
- [x] T002 Install core dependencies: electron, marked, vite, vite-plugin-electron
- [x] T003 [P] Install dev dependencies: vitest, @vitest/ui, happy-dom, @playwright/test, eslint
- [x] T004 [P] Create vite.config.js with Electron plugin configuration
- [x] T005 [P] Create vitest.config.js for unit testing
- [x] T006 [P] Create playwright.config.js for E2E testing
- [x] T007 [P] Create .eslintrc.json with ES2022+ configuration
- [x] T008 [P] Create src/main/ directory structure (main.js, preload.js, services/)
- [x] T009 [P] Create src/renderer/ directory structure (index.html, js/, styles/, assets/)
- [x] T010 [P] Create src/shared/ directory for shared constants and validators
- [x] T011 [P] Create tests/ directory structure (unit/, integration/, e2e/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Electron app and IPC infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T012 Create basic Electron main process in src/main/main.js with window management
- [x] T013 Create preload script in src/main/preload.js with contextBridge for secure IPC
- [x] T014 Create basic HTML structure in src/renderer/index.html with navigation layout
- [x] T015 [P] Create global styles in src/renderer/styles/main.css
- [x] T016 [P] Create component styles in src/renderer/styles/components.css
- [x] T017 [P] Create theme variables in src/renderer/styles/themes.css
- [x] T018 Create shared constants in src/shared/constants.js for app-wide values
- [x] T019 [P] Create shared validators in src/shared/validators.js for input validation
- [x] T020 Implement file-service.js in src/main/services/file-service.js for file system operations
- [x] T021 Implement config-service.js in src/main/services/config-service.js for configuration management
- [x] T022 Wire IPC handlers for Configuration API in src/main/main.js (config.get, config.update, config.setStorageLocation)
- [x] T023 Create app initialization script in src/renderer/js/app.js
- [x] T024 Create client-side router in src/renderer/js/router.js for hash-based navigation
- [x] T025 Create simple state management in src/renderer/js/state.js
- [x] T026 Create IPC API wrapper in src/renderer/js/services/api.js for renderer-to-main communication

**Checkpoint**: Foundation ready - Electron app launches, IPC communication works, user story implementation can now begin

---

## Phase 3: User Story 2 - Initial Setup and Storage Configuration (Priority: P2) 🎯 MVP PREREQUISITE

**Goal**: Enable first-time users to configure storage location before using the app

**Independent Test**: Launch app fresh, complete setup wizard, select folder, verify config persists

**Why P2 before P1**: Users need to configure storage before creating notes (P1 depends on this)

### Implementation for User Story 2

- [x] T027 [US2] Create setup wizard UI component in src/renderer/js/components/setup.js
- [x] T028 [US2] Implement folder selection dialog using fs.selectFolder() IPC in setup component
- [x] T029 [US2] Add storage path validation in setup component (calls fs.validatePath())
- [x] T030 [US2] Implement first-run detection logic in src/renderer/js/app.js
- [x] T031 [US2] Create storage initialization in config-service.js (create .knowledgebase, notes/, snippets/ folders)
- [x] T032 [US2] Add setup completion flow to persist storage location and redirect to main app
- [x] T033 [US2] Add setup wizard styles in src/renderer/styles/components.css

**Checkpoint**: Users can complete setup and configure storage location - ready for notes (US1)

---

## Phase 4: User Story 1 - Create and View Notes (Priority: P1) 🎯 MVP

**Goal**: Enable users to create, edit, save, and view markdown notes

**Independent Test**: Create a note, save it, view markdown preview, edit content, verify file persists

### Implementation for User Story 1

- [x] T034 [P] [US1] Create Note entity IPC handlers in src/main/main.js (notes.list, notes.get, notes.create, notes.update, notes.delete, notes.search)
- [x] T035 [P] [US1] Implement notes file operations in src/main/services/file-service.js (read/write markdown files with frontmatter)
- [x] T036 [US1] Create markdown service in src/renderer/js/services/markdown.js using marked.js for parsing and rendering
- [x] T037 [US1] Create notes UI component in src/renderer/js/components/notes.js
- [x] T038 [US1] Implement note list view with sorting options (title, createdAt, modifiedAt) in notes component
- [x] T039 [US1] Implement note editor with preview/edit mode toggle in notes component
- [x] T040 [US1] Add markdown preview rendering in notes component using markdown service
- [x] T041 [US1] Implement note saving with 500ms debounce in notes component
- [x] T042 [US1] Add note creation UI (title input, content editor) in notes component
- [x] T043 [US1] Implement note deletion with confirmation in notes component
- [x] T044 [US1] Add validation for note titles (no special characters, not empty) in shared validators
- [x] T045 [US1] Add error handling for file operations (read errors, write errors) in notes component
- [x] T046 [US1] Add success/error feedback messages in notes component

**Checkpoint**: Users can create, edit, view, and delete notes - core knowledge base functionality complete (MVP!)

---

## Phase 5: User Story 3 - Todo Management with Pinned View (Priority: P3)

**Goal**: Provide persistent todo tracking visible across all sections

**Independent Test**: Create todos with priorities/deadlines, verify sorting, confirm pinned panel stays visible

### Implementation for User Story 3

- [ ] T047 [P] [US3] Create Todo entity IPC handlers in src/main/main.js (todos.list, todos.create, todos.update, todos.toggleComplete, todos.delete)
- [ ] T048 [P] [US3] Implement todos JSON storage operations in src/main/services/file-service.js (read/write todos.json)
- [ ] T049 [US3] Create todos UI component in src/renderer/js/components/todos.js
- [ ] T050 [US3] Implement pinned panel with fixed positioning in src/renderer/styles/components.css
- [ ] T051 [US3] Implement todo CRUD UI (create, complete, delete) in todos component
- [ ] T052 [US3] Add priority selection UI (high, medium, low) in todos component
- [ ] T053 [US3] Add deadline picker in todos component
- [ ] T054 [US3] Implement sorting logic (priority first, then deadline) in todos component
- [ ] T055 [US3] Add collapse/expand toggle for pinned panel in todos component
- [ ] T056 [US3] Persist collapsed state to localStorage in todos component
- [ ] T057 [US3] Add keyboard shortcut (Ctrl+T) to toggle todos panel in src/renderer/js/app.js
- [ ] T058 [US3] Style completed todos with strikethrough in src/renderer/styles/components.css

**Checkpoint**: Todo panel is functional, pinned, and always visible - task tracking complete

---

## Phase 6: User Story 4 - Project Organization (Priority: P4)

**Goal**: Enable organizing notes by project with folder hierarchy

**Independent Test**: Create project, add notes to it, view project's notes, verify folder structure

### Implementation for User Story 4

- [ ] T059 [P] [US4] Create Project entity IPC handlers in src/main/main.js (projects.list, projects.get, projects.create, projects.update, projects.delete)
- [ ] T060 [P] [US4] Implement projects JSON storage operations in src/main/services/file-service.js (read/write projects.json)
- [ ] T061 [US4] Create projects UI component in src/renderer/js/components/projects.js
- [ ] T062 [US4] Implement project list view in projects component
- [ ] T063 [US4] Add project creation UI (name, description) in projects component
- [ ] T064 [US4] Implement project folder creation in file-service.js (create notes/project-name/)
- [ ] T065 [US4] Add project selection dropdown in notes component for associating notes
- [ ] T066 [US4] Implement project filtering in notes list view (filter by projectId)
- [ ] T067 [US4] Add project detail view showing associated notes in projects component
- [ ] T068 [US4] Implement project deletion with cascade options (delete or unlink notes) in projects component
- [ ] T069 [US4] Update todos component to support project-todo linking (optional projectId)

**Checkpoint**: Projects enable note organization - multi-project workflow enabled

---

## Phase 7: User Story 5 - Note Cross-Referencing (Priority: P5)

**Goal**: Enable linking between notes for knowledge web creation

**Independent Test**: Create two notes, link them with [[Title]] syntax, click link, verify navigation

### Implementation for User Story 5

- [ ] T070 [US5] Implement [[Title]] link parsing in markdown.js (detect internal links in markdown)
- [ ] T071 [US5] Add link resolution logic in markdown.js (convert [[Title]] to note ID)
- [ ] T072 [US5] Implement click handler for internal links in notes component
- [ ] T073 [US5] Add navigation to referenced note (< 1s per SC-005) in notes component
- [ ] T074 [US5] Implement broken link detection in markdown.js (check if target note exists)
- [ ] T075 [US5] Style broken links differently (red/strikethrough) in src/renderer/styles/components.css
- [ ] T076 [US5] Implement note preloading for instant navigation in notes component
- [ ] T077 [US5] Track referencing notes when deleting (return referencingNotes in notes.delete)

**Checkpoint**: Notes can reference each other - knowledge graph navigation works

---

## Phase 8: User Story 6 - Code Snippets with Tags (Priority: P6)

**Goal**: Save and search code snippets with categorized tags

**Independent Test**: Create snippets with tags, search by tag/keyword, verify results appear quickly

### Implementation for User Story 6

- [ ] T078 [P] [US6] Create Snippet entity IPC handlers in src/main/main.js (snippets.list, snippets.get, snippets.create, snippets.update, snippets.delete, snippets.search)
- [ ] T079 [P] [US6] Implement snippets JSON file operations in src/main/services/file-service.js (read/write snippets/*.json)
- [ ] T080 [US6] Create snippets UI component in src/renderer/js/components/snippets.js
- [ ] T081 [US6] Implement snippet list view with language/tag filters in snippets component
- [ ] T082 [US6] Add snippet creation UI (title, description, language, code, tags) in snippets component
- [ ] T083 [US6] Implement code editor with syntax highlighting (using highlight.js or similar) in snippets component
- [ ] T084 [US6] Add tag input UI for language, usage, and module categories in snippets component
- [ ] T085 [US6] Implement search index builder in src/main/services/file-service.js (index title, description, code, tags)
- [ ] T086 [US6] Implement search functionality meeting SC-006 (< 2s for 1000+ snippets) in file-service.js
- [ ] T087 [US6] Add search UI with keyword and tag filters in snippets component
- [ ] T088 [US6] Implement copy-to-clipboard functionality for code in snippets component
- [ ] T089 [US6] Style code blocks with syntax highlighting in src/renderer/styles/components.css

**Checkpoint**: Code snippets are searchable and organized by tags - developer workflow enhanced

---

## Phase 9: User Story 7 - Project Roadmaps (Priority: P7)

**Goal**: Track project progress with milestones and deadlines

**Independent Test**: Create project roadmap, add milestones with deadlines, view chronological display

### Implementation for User Story 7

- [ ] T090 [P] [US7] Create Milestone entity IPC handlers in src/main/main.js (milestones.list, milestones.create, milestones.update, milestones.toggleComplete, milestones.delete)
- [ ] T091 [P] [US7] Implement milestones JSON storage operations in src/main/services/file-service.js (read/write milestones.json)
- [ ] T092 [US7] Create roadmaps UI component in src/renderer/js/components/roadmaps.js
- [ ] T093 [US7] Implement milestone list view sorted by deadline (chronological) in roadmaps component
- [ ] T094 [US7] Add milestone creation UI (title, description, deadline) linked to project in roadmaps component
- [ ] T095 [US7] Implement milestone completion toggle in roadmaps component
- [ ] T096 [US7] Create project roadmap view in projects component (show project's milestones)
- [ ] T097 [US7] Implement summary view of all project roadmaps in roadmaps component
- [ ] T098 [US7] Style milestone timeline visualization in src/renderer/styles/components.css

**Checkpoint**: Project roadmaps provide high-level progress tracking - project management complete

---

## Phase 10: User Story 8 - Software Tools Launch Section (Priority: P8)

**Goal**: Quick-launch frequently used tools and applications

**Independent Test**: Add tool entry with launch path/URL, click to launch, verify app/browser opens

### Implementation for User Story 8

- [ ] T099 [P] [US8] Create Tool entity IPC handlers in src/main/main.js (tools.list, tools.create, tools.update, tools.delete, tools.launch)
- [ ] T100 [P] [US8] Implement tools JSON storage operations in src/main/services/file-service.js (read/write tools.json)
- [ ] T101 [US8] Implement shell-service.js in src/main/services/shell-service.js for launching applications/URLs
- [ ] T102 [US8] Create tools UI component in src/renderer/js/components/tools.js
- [ ] T103 [US8] Implement tools list view with category grouping in tools component
- [ ] T104 [US8] Add tool creation UI (name, description, launchPath, launchType, category) in tools component
- [ ] T105 [US8] Implement launch functionality (click to open) in tools component
- [ ] T106 [US8] Add validation for launch paths (check file exists for apps) in shared validators
- [ ] T107 [US8] Add error handling for invalid paths/URLs in tools component
- [ ] T108 [US8] Style tools as clickable cards/buttons in src/renderer/styles/components.css

**Checkpoint**: Tools section provides quick access to external applications - workflow integration complete

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final optimizations

- [ ] T109 [P] Implement LRU cache for parsed markdown (max 50 notes) in markdown.js
- [ ] T110 [P] Implement LRU cache for rendered HTML (max 20 notes) in markdown.js
- [ ] T111 [P] Add lazy loading for large note lists in notes component (load incrementally if > 100 notes)
- [ ] T112 [P] Add lazy loading for snippet lists in snippets component (load incrementally if > 500 snippets)
- [ ] T113 Optimize app launch time to meet SC-007 (< 3s) in main.js (use ready-to-show event)
- [ ] T114 [P] Add keyboard shortcuts for common actions (Ctrl+N new note, Ctrl+S save, Ctrl+F search)
- [ ] T115 [P] Implement autosave for notes (every 30s if changes exist) in notes component
- [ ] T116 [P] Add loading indicators for async operations in all components
- [ ] T117 [P] Add UI transitions and animations in src/renderer/styles/components.css
- [ ] T118 Implement portrait optimization layout per FR-033 in src/renderer/styles/main.css
- [ ] T119 [P] Add responsive breakpoints for landscape adaptation per FR-034 in src/renderer/styles/main.css
- [ ] T120 [P] Implement semantic HTML with ARIA labels for accessibility (WCAG 2.1 AA) in all components
- [ ] T121 [P] Add focus management for keyboard navigation in src/renderer/js/app.js
- [ ] T122 Implement file system watcher for external changes in file-service.js (emit onFileSystemChange events)
- [ ] T123 [P] Add security: configure Content Security Policy in main.js
- [ ] T124 [P] Add security: sanitize markdown HTML output in markdown.js using DOMPurify
- [ ] T125 [P] Add security: validate file paths to prevent directory traversal in file-service.js
- [ ] T126 [P] Create user documentation in docs/user-guide.md
- [ ] T127 [P] Create developer documentation in docs/developer-guide.md
- [ ] T128 Add electron-builder configuration for Windows packaging in package.json
- [ ] T129 Verify all success criteria SC-001 through SC-009 are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 2 (Phase 3)**: Depends on Foundational (Phase 2) - BLOCKS User Story 1 (notes need storage)
- **User Story 1 (Phase 4)**: Depends on User Story 2 (Phase 3) - MVP core functionality
- **User Story 3-8 (Phase 5-10)**: All depend on Foundational (Phase 2) and can proceed after US1/US2 complete
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 2 (P2)**: Setup & Foundational complete - MUST complete before US1
- **User Story 1 (P1)**: US2 complete - Core MVP functionality
- **User Story 3 (P3)**: US1/US2 complete - Todos independent but enhance workflow
- **User Story 4 (P4)**: US1/US2 complete - Projects organize existing notes
- **User Story 5 (P5)**: US1/US2 complete - Cross-refs enhance existing notes
- **User Story 6 (P6)**: US2 complete - Snippets are independent feature
- **User Story 7 (P7)**: US4 complete - Roadmaps require projects
- **User Story 8 (P8)**: US2 complete - Tools are independent feature

### Within Each User Story

- Tasks marked [P] within the same story can run in parallel
- Implementation tasks follow logical dependency order
- Core functionality before enhancements

### Parallel Opportunities

**Phase 1 (Setup)**: T003, T004, T005, T006, T007, T008, T009, T010, T011 can all run in parallel

**Phase 2 (Foundational)**: T015, T016, T017, T019 can run in parallel

**User Story 1 (P1)**: T034 and T035 can run in parallel initially

**User Story 3 (P3)**: T047 and T048 can run in parallel

**User Story 4 (P4)**: T059 and T060 can run in parallel

**User Story 6 (P6)**: T078 and T079 can run in parallel

**User Story 7 (P7)**: T090 and T091 can run in parallel

**User Story 8 (P8)**: T099, T100, T101 can run in parallel

**Phase 11 (Polish)**: T109, T110, T111, T112, T114, T115, T116, T117, T119, T120, T121, T123, T124, T125, T126, T127 can run in parallel

---

## Parallel Example: User Story 1 (Notes)

```bash
# Launch model/service setup together:
Task T034: "Create Note entity IPC handlers in src/main/main.js"
Task T035: "Implement notes file operations in src/main/services/file-service.js"

# After T034-T035 complete, continue with UI:
Task T036: "Create markdown service in src/renderer/js/services/markdown.js"
Task T037: "Create notes UI component in src/renderer/js/components/notes.js"
```

---

## Implementation Strategy

### MVP First (User Stories 2 + 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 2 (Setup wizard)
4. Complete Phase 4: User Story 1 (Notes)
5. **STOP and VALIDATE**: Test US2 + US1 independently
6. Deploy/demo MVP - Users can configure storage and manage notes

### Incremental Delivery

1. Foundation (Phases 1-2) → Infrastructure ready
2. Add User Story 2 (Setup) → Test independently
3. Add User Story 1 (Notes) → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 (Todos) → Test independently → Deploy/Demo
5. Add User Story 4 (Projects) → Test independently → Deploy/Demo
6. Add User Story 6 (Snippets) → Test independently → Deploy/Demo
7. Add User Story 7 (Roadmaps) → Test independently → Deploy/Demo
8. Add User Story 8 (Tools) → Test independently → Deploy/Demo
9. Polish (Phase 11) → Final release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Team completes US2 (Setup wizard) together (Phase 3)
3. Team completes US1 (Notes) together (Phase 4) - MVP checkpoint
4. Once US1 MVP complete, parallelize remaining stories:
   - Developer A: User Story 3 (Todos)
   - Developer B: User Story 6 (Snippets)
   - Developer C: User Story 8 (Tools)
   - Developer D: User Story 4 (Projects) → User Story 7 (Roadmaps)
   - Developer E: User Story 5 (Cross-references)
5. All developers: Polish (Phase 11) together

---

## Task Summary

**Total Tasks**: 129

**By Phase**:
- Phase 1 (Setup): 11 tasks
- Phase 2 (Foundational): 15 tasks
- Phase 3 (US2 - Setup): 7 tasks
- Phase 4 (US1 - Notes): 13 tasks
- Phase 5 (US3 - Todos): 12 tasks
- Phase 6 (US4 - Projects): 11 tasks
- Phase 7 (US5 - Cross-refs): 8 tasks
- Phase 8 (US6 - Snippets): 12 tasks
- Phase 9 (US7 - Roadmaps): 9 tasks
- Phase 10 (US8 - Tools): 10 tasks
- Phase 11 (Polish): 21 tasks

**By User Story**:
- US1 (Notes): 13 tasks
- US2 (Setup): 7 tasks
- US3 (Todos): 12 tasks
- US4 (Projects): 11 tasks
- US5 (Cross-refs): 8 tasks
- US6 (Snippets): 12 tasks
- US7 (Roadmaps): 9 tasks
- US8 (Tools): 10 tasks

**Parallel Opportunities**: 47 tasks marked [P] can run in parallel within their phases

**MVP Scope**: 46 tasks (Phases 1-4: Setup + Foundational + US2 + US1)

---

## Notes

- All tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
- Tasks marked [P] target different files and can run in parallel
- Each user story is independently testable after its phase completes
- MVP (User Stories 2 + 1) delivers core value: configure storage and manage notes
- Stop at any user story checkpoint to validate independently
- Tests are NOT included as they were not requested in the specification
