# Feature Specification: CLI Interface for KnowledgeBase

**Feature Branch**: `003-cli-interface`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Create a CLI version of this project. The version should work in the powershell console and should make use of the newest powershell visualizations. It want do navigate through the knowledge base only with the keyboard. It still provide all functionalities of the current knowledge base, like different tabs/registers for different types of notes, an edit mode and a preview mode, the ability to check todos, notes and mark them as done. Use a similar cli handling like the claude code cli with its registers and keyboard navigation."

## User Scenarios & Testing

### User Story 1 - Navigate the Knowledge Base via Keyboard (Priority: P1)

A developer launches the CLI application in their PowerShell terminal and can browse their entire knowledge base using only the keyboard. The application presents a tab bar at the top (Notes, Todos, Daily Todos, Projects, Snippets, Roadmaps, Tools) that can be switched using keyboard shortcuts. Within each tab, the user navigates lists with arrow keys, selects items with Enter, and goes back with Escape. The experience feels similar to the Claude Code CLI with its register-based navigation.

**Why this priority**: Without keyboard navigation and tab switching, the CLI has no usable interface. This is the foundational interaction model.

**Independent Test**: Can be fully tested by launching the CLI, pressing Tab/number keys to switch sections, using arrow keys to browse lists, and pressing Enter to select items. Delivers a browsable read-only knowledge base.

**Acceptance Scenarios**:

1. **Given** the CLI is launched, **When** the user presses a tab shortcut key (e.g., 1-7 or Ctrl+Tab), **Then** the view switches to the corresponding section
2. **Given** a list of items is displayed, **When** the user presses Up/Down arrow keys, **Then** the selection highlight moves accordingly
3. **Given** an item is highlighted, **When** the user presses Enter, **Then** the detail view for that item is displayed
4. **Given** a detail view is shown, **When** the user presses Escape, **Then** the view returns to the list
5. **Given** any view is active, **When** the user presses the help key (?), **Then** a contextual help overlay shows available keyboard shortcuts

---

### User Story 2 - View and Edit Notes with Markdown Preview (Priority: P1)

A developer selects a note from the notes list and sees its rendered markdown content in a preview pane. They press a key to switch to edit mode, where the raw markdown is displayed in an editable text area. After making changes, they save with a keyboard shortcut and can toggle back to preview mode.

**Why this priority**: Notes are the primary content type. Edit/preview toggle is the core editing interaction specified by the user.

**Independent Test**: Can be tested by selecting a note, viewing its preview, pressing 'e' to enter edit mode, modifying text, pressing Ctrl+S to save, and pressing 'p' to return to preview mode.

**Acceptance Scenarios**:

1. **Given** a note is selected, **When** the detail panel loads, **Then** the note content is shown as rendered markdown (preview mode)
2. **Given** preview mode is active, **When** the user presses the edit shortcut, **Then** the raw markdown is shown in an editable text input
3. **Given** edit mode is active, **When** the user presses the save shortcut, **Then** the note is persisted and a confirmation is shown
4. **Given** edit mode is active, **When** the user presses the preview shortcut, **Then** the rendered markdown is displayed again
5. **Given** unsaved changes exist, **When** the user tries to navigate away, **Then** a confirmation prompt appears

---

### User Story 3 - Manage Todos and Daily Todos (Priority: P1)

A developer views their todo list, toggles completion status with a keyboard shortcut, and creates new todos inline. They switch to the Daily Todos tab to see today's tasks, check items off, and add quick tasks. Priority levels are visually distinct using terminal colors.

**Why this priority**: Todo management with completion toggling is a core feature explicitly requested by the user ("ability to check todos and mark them as done").

**Independent Test**: Can be tested by navigating to Todos, pressing Space to toggle a todo's completion, pressing 'n' to create a new todo, and switching to Daily Todos to verify the same workflow.

**Acceptance Scenarios**:

1. **Given** the Todos tab is active, **When** a todo is highlighted and the user presses Space, **Then** the completion status toggles and the visual indicator updates
2. **Given** the Todos tab is active, **When** the user presses 'n', **Then** a new todo creation form appears with title input focused
3. **Given** a todo list is shown, **When** the user presses a filter key, **Then** the list filters between All/Active/Completed
4. **Given** the Daily Todos tab is active, **When** the user types a task and presses Enter, **Then** the daily todo is created
5. **Given** a daily todo exists from a previous day, **When** the Daily Todos tab loads, **Then** incomplete items are rolled over with overdue indicators

---

### User Story 4 - Manage Code Snippets with Syntax Display (Priority: P2)

A developer browses their code snippets library, searches by keyword or filters by language/usage/module tags, and views snippets with syntax-highlighted code blocks in the terminal. They can copy snippet code to the clipboard with a shortcut and create or edit snippets.

**Why this priority**: Snippets are a secondary content type. Viewing and copying code is valuable but less frequently used than notes and todos.

**Independent Test**: Can be tested by navigating to Snippets, using search to find a snippet, viewing it with syntax coloring, and pressing 'c' to copy code to clipboard.

**Acceptance Scenarios**:

1. **Given** the Snippets tab is active, **When** the user types in the search field, **Then** snippets are filtered in real-time
2. **Given** a snippet is selected, **When** the detail view loads, **Then** the code is displayed with syntax coloring appropriate for the language
3. **Given** a snippet detail is shown, **When** the user presses the copy shortcut, **Then** the code is copied to the system clipboard
4. **Given** the user presses 'n' in the snippets list, **When** the create form appears, **Then** all fields (title, language, code, tags) are editable

---

### User Story 5 - Manage Projects and Roadmaps (Priority: P2)

A developer views their projects list, selects a project to see its details (description, status, associated notes count), and navigates to the Roadmaps tab to view milestones in a timeline representation. They can create and edit projects and milestones, and toggle milestone completion.

**Why this priority**: Projects and roadmaps provide organizational structure. Important but less frequently accessed than daily content.

**Independent Test**: Can be tested by creating a project, adding a milestone with a due date, viewing the roadmap timeline, and toggling milestone completion.

**Acceptance Scenarios**:

1. **Given** the Projects tab is active, **When** a project is selected, **Then** its name, description, status, and associated notes count are displayed
2. **Given** the Roadmaps tab is active, **When** a project filter is selected, **Then** only milestones for that project are shown
3. **Given** a milestone is highlighted, **When** the user presses Space, **Then** the milestone completion status toggles
4. **Given** the Roadmaps tab is active, **When** milestones are displayed, **Then** they show a visual timeline with progress indicators using terminal graphics

---

### User Story 6 - Launch Software Tools (Priority: P3)

A developer browses their saved software tools grouped by category, and launches an application or opens a URL directly from the CLI with a keyboard shortcut.

**Why this priority**: Tools is a convenience feature with simple requirements. Least complex to implement.

**Independent Test**: Can be tested by navigating to Tools, selecting a tool entry, and pressing Enter to launch it.

**Acceptance Scenarios**:

1. **Given** the Tools tab is active, **When** tools are displayed, **Then** they are grouped by category with visual separation
2. **Given** a tool is highlighted, **When** the user presses Enter, **Then** the application is launched or URL is opened in the default browser
3. **Given** the user presses 'n' in Tools, **When** the create form appears, **Then** all fields (name, path/URL, category, description) are editable

---

### User Story 7 - First-Run Setup and Configuration (Priority: P3)

A new user launches the CLI for the first time and is guided through selecting a storage folder. If a storage location is already configured (from the Electron app), the CLI detects and uses it automatically.

**Why this priority**: Setup only occurs once. Existing Electron users should have zero-friction onboarding.

**Independent Test**: Can be tested by launching the CLI without a configured storage path and completing the setup wizard, then relaunching to verify automatic detection.

**Acceptance Scenarios**:

1. **Given** no storage path is configured, **When** the CLI launches, **Then** a setup wizard prompts for the storage folder path
2. **Given** the Electron app has already configured a storage path, **When** the CLI launches, **Then** it detects and uses the existing configuration
3. **Given** an invalid path is entered, **When** the user confirms, **Then** a clear error message is shown and re-entry is prompted

---

### Edge Cases

- What happens when the terminal window is too narrow to display the full layout? The UI must gracefully adapt or show a minimum-width warning.
- How does the system handle notes with very long content? Content must be scrollable within the terminal pane.
- What happens when the user resizes the terminal while the CLI is running? The layout must re-render to fit the new dimensions.
- How does the system handle markdown elements that cannot render in a terminal (e.g., images)? These should degrade gracefully with text placeholders (e.g., `[Image: alt-text]`).
- What happens when the storage folder is on a network drive or becomes temporarily unavailable? An appropriate error message should be shown without crashing.
- How does the system handle concurrent access if both the Electron app and CLI are running? File-level operations should use the same data format and be resilient to concurrent reads.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a full-screen terminal user interface (TUI) that operates entirely within the PowerShell console
- **FR-002**: System MUST display a tab bar with sections: Notes, Todos, Daily Todos, Projects, Snippets, Roadmaps, Tools
- **FR-003**: System MUST support switching between tabs using number keys (1-7) and Tab/Shift+Tab cycling
- **FR-004**: System MUST support list navigation using Up/Down arrow keys with visible selection highlighting
- **FR-005**: System MUST support item selection with Enter and back-navigation with Escape
- **FR-006**: System MUST display a contextual status bar showing current section, item count, and available keyboard shortcuts
- **FR-007**: System MUST provide a help overlay (triggered by ?) showing all keyboard shortcuts for the current context
- **FR-008**: Notes MUST support preview mode (rendered markdown) and edit mode (raw markdown) with keyboard toggle
- **FR-009**: Notes MUST support creating, editing, saving, and deleting notes with appropriate keyboard shortcuts
- **FR-010**: Notes MUST support filtering by project and sorting by modification date, title, or creation date
- **FR-011**: Todos MUST display with visual priority indicators (color-coded: high, medium, low) and completion checkboxes
- **FR-012**: Todos MUST support toggling completion via Space key and filtering by status (All/Active/Completed)
- **FR-013**: Todos MUST support creating, editing, saving, and deleting with title, description, priority, project, and deadline fields
- **FR-014**: Daily Todos MUST support quick-add via inline text input with Enter to confirm
- **FR-015**: Daily Todos MUST display overdue indicators for rolled-over items and support priority escalation
- **FR-016**: Daily Todos MUST support checking off items and automatic archival of completed items
- **FR-017**: Projects MUST support sidebar list with detail panel showing name, description, status, and associated notes count
- **FR-018**: Projects MUST support CRUD operations via keyboard
- **FR-019**: Snippets MUST display code with syntax coloring in the terminal
- **FR-020**: Snippets MUST support search by keyword and filtering by language, usage, and module tags
- **FR-021**: Snippets MUST support copying code to the system clipboard via keyboard shortcut
- **FR-022**: Roadmaps MUST display milestones in a visual timeline using terminal graphics characters
- **FR-023**: Roadmaps MUST support filtering by project and toggling milestone completion
- **FR-024**: Tools MUST display grouped by category and support launching applications or opening URLs
- **FR-025**: System MUST read from and write to the same storage folder and file format as the existing Electron application
- **FR-026**: System MUST detect terminal dimensions and adapt the layout responsively
- **FR-027**: System MUST handle terminal resize events and re-render the layout accordingly
- **FR-028**: Markdown preview MUST render headings, lists, bold, italic, code blocks, and links in terminal-appropriate formatting
- **FR-029**: Markdown elements that cannot render in a terminal (images, embedded HTML) MUST degrade gracefully with text placeholders
- **FR-030**: System MUST display a confirmation prompt before destructive actions (delete note, delete todo, delete project)
- **FR-031**: System MUST show feedback messages (success/error) for all create, update, and delete operations
- **FR-032**: System MUST provide a first-run setup flow if no storage path is configured
- **FR-033**: System MUST leverage modern PowerShell terminal capabilities (ANSI colors, Unicode box-drawing characters, cursor positioning) for rich visual presentation

### Key Entities

- **Tab/Section**: A navigable view corresponding to a content type (Notes, Todos, Daily Todos, Projects, Snippets, Roadmaps, Tools). Each tab has its own list and detail layout.
- **List-Detail Panel**: The primary layout pattern where a sidebar shows a scrollable list of items and the main area shows the selected item's content or edit form.
- **Keyboard Context**: The set of available keyboard shortcuts that changes based on the current view, mode (preview/edit), and whether a modal/overlay is active.
- **Terminal Layout**: The responsive arrangement of UI elements (tab bar, sidebar, main content, status bar) within the terminal dimensions.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can perform all knowledge base operations (CRUD on notes, todos, daily todos, projects, snippets, milestones, tools) without leaving the terminal
- **SC-002**: Users can switch between any two sections in under 2 seconds using keyboard shortcuts
- **SC-003**: Users can toggle a todo's completion status in a single keypress from the list view
- **SC-004**: Users can create a new note and save it in under 30 seconds using only keyboard input
- **SC-005**: The CLI reads and writes data that is fully compatible with the existing Electron application (100% data interoperability)
- **SC-006**: The CLI renders correctly on terminal widths of 80 columns and above
- **SC-007**: All markdown notes created in the Electron app display correctly in the CLI's preview mode, with graceful degradation for unsupported elements
- **SC-008**: Users familiar with the Electron version can discover and use CLI equivalents of all features within 5 minutes, aided by the contextual help overlay

## Assumptions

- The user's PowerShell version supports modern terminal capabilities (ANSI escape sequences, Unicode rendering). PowerShell 7+ (pwsh) is assumed.
- The existing Electron app's data storage format (JSON files, markdown with YAML frontmatter) serves as the canonical data format. The CLI will not introduce a separate data layer.
- The CLI is a Node.js application that reuses the existing `file-service.js`, `config-service.js`, and `daily-todos-service.js` from the main process, adapted for direct filesystem access without Electron's IPC layer.
- Concurrent use of the Electron app and CLI is possible but not guaranteed to be conflict-free for simultaneous writes to the same item. Read operations will always reflect the latest saved state.
- Terminal color support is assumed (256-color or true-color). The application will detect color support and fall back to basic styling if unavailable.
- The Claude Code CLI's interaction model (registers, keyboard navigation, contextual shortcuts) is the primary UX inspiration but will be adapted to the knowledge base domain.
