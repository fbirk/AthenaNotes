# Keyboard Shortcuts Viewer

A new section in the Knowledge Base app for saving and quickly referencing keyboard shortcuts for external programs (Visual Studio, Chrome, VS Code, etc.). Available in both GUI (Electron) and CLI (Ink) versions.

## Data Model

Stored as `shortcuts.json` in the `.knowledgebase/` storage directory.

```json
{
  "shortcuts": [
    {
      "id": "uuid",
      "program": "Visual Studio",
      "shortcut": "Ctrl+Shift+B",
      "description": "Build solution",
      "createdAt": "2026-04-10T12:00:00.000Z",
      "modifiedAt": "2026-04-10T12:00:00.000Z"
    }
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | yes | Unique identifier, generated on create |
| program | string | yes | Name of the external program (e.g. "Visual Studio") |
| shortcut | string | yes | Key combination (e.g. "Ctrl+Shift+B") |
| description | string | yes | What the shortcut does |
| createdAt | string (ISO) | yes | Creation timestamp |
| modifiedAt | string (ISO) | yes | Last modification timestamp |

All three user-facing fields (program, shortcut, description) are required and must be non-empty strings.

## IPC Channels

All handlers follow the existing `{ success: boolean, data?: any, error?: string }` response pattern.

### `shortcuts.list`

- **Payload**: none
- **Returns**: Array of all shortcuts, sorted by program name (alphabetical), then by description within each program
- **Reads** `shortcuts.json`, returns `data.shortcuts || []`

### `shortcuts.create`

- **Payload**: `{ program: string, shortcut: string, description: string }`
- **Returns**: The newly created shortcut object (with generated id and timestamps)
- **Validates** all three fields are non-empty strings

### `shortcuts.update`

- **Payload**: `{ id: string, updates: { program?, shortcut?, description? } }`
- **Returns**: The updated shortcut object
- **Updates** `modifiedAt` timestamp
- **Errors** if id not found

### `shortcuts.delete`

- **Payload**: `{ id: string }`
- **Returns**: `{ deleted: true }`
- **Errors** if id not found

## GUI (Electron Renderer)

### Navigation

- Add `#/shortcuts` to the route array in `app.js` (auto-labels as "Shortcuts")
- Add route handler in `router.js` mapping to `renderShortcutsComponent(container)`

### Component: `shortcuts.js`

Function-based pattern (like `tools.js`). Entry point: `renderShortcutsComponent(container)`.

### Layout

No master-detail split. The entire view is a single-pane quick-reference layout.

**Header area:**
- Section title "Shortcuts"
- Search input (left) and `+` add button (right)
- Search filters instantly on keypress against program name and description

**Content area:**
- CSS `column-count` flowing layout (responsive column count based on viewport width)
- Shortcuts grouped by program name as section headers
- Each program group uses `break-inside: avoid` to keep groups together when possible
- Each shortcut row displays: `<kbd>` styled key combination, description text, and edit/delete icons on hover

**Search behavior:**
- Filters rows where program name or description matches the search term (case-insensitive substring match)
- Groups with zero visible rows are hidden entirely (including their header)
- Empty search shows everything

### Add Modal

Triggered by the `+` button. Modal dialog with three fields:
- **Program**: text input with a `<datalist>` providing autocomplete from existing program names
- **Shortcut**: text input
- **Description**: text input

Submit creates via `shortcuts.create`, then re-renders the list.

### Edit

Clicking the edit icon on a row opens the same modal, pre-filled with the existing values. Submit calls `shortcuts.update`.

### Delete

Clicking the delete icon shows a confirmation dialog. On confirm, calls `shortcuts.delete` and re-renders.

## CLI (Ink/React)

### Tab Bar

Add 8th tab: `{ label: 'Shortcuts', key: '8' }` in `tab-bar.js`.

### Component: `shortcuts-tab.js`

React component following the same patterns as `tools-tab.js`.

### List View

- Shortcuts displayed grouped by program name
- Program name as a colored header line
- Each shortcut row: key combo (highlighted) + description
- Scrollable with arrow keys, PgUp/PgDn

### Keyboard Actions

| Key | Action |
|-----|--------|
| `n` | Open inline form to create a new shortcut |
| `e` | Edit the currently selected shortcut |
| `d` | Delete the currently selected shortcut (with confirmation prompt) |
| `/` | Activate search filter mode (instant filter, Escape to clear) |
| Arrow keys | Navigate between shortcuts |
| PgUp/PgDn | Page through the list |

### Service Layer

Add to `kb-service.js`:
- `listShortcuts()` - read and return sorted shortcuts
- `createShortcut({ program, shortcut, description })` - create new entry
- `updateShortcut({ id, updates })` - update existing entry
- `deleteShortcut(id)` - delete entry

These wrap `fileService.readJSON('shortcuts.json')` / `fileService.writeJSON('shortcuts.json', data)`.

## Styling (GUI)

Add to `components.css`:

- `.shortcuts-section` - main container
- `.shortcuts-header` - title + search + add button row
- `.shortcuts-search` - search input styling
- `.shortcuts-columns` - CSS columns container (responsive column-count)
- `.shortcuts-group` - program group with `break-inside: avoid`
- `.shortcuts-group-title` - program name header
- `.shortcut-row` - individual shortcut entry (flex row)
- `.shortcut-row:hover .shortcut-actions` - show edit/delete icons on hover
- `.shortcut-key` - `<kbd>` styling for key combinations
- `.shortcut-description` - description text
- `.shortcut-actions` - edit/delete icon container (hidden by default, visible on hover)

## Testing

Unit tests following the existing vitest patterns:

- **IPC handler tests**: CRUD operations for shortcuts (create, list, update, delete), validation of required fields, error handling for missing ids
- **Validator tests**: If shared validation functions are added to `validators.js`

## Files to Create/Modify

### New Files
- `src/renderer/js/components/shortcuts.js` - GUI component
- `src/cli/components/shortcuts-tab.js` - CLI component
- `tests/unit/shortcuts.test.js` - Unit tests

### Modified Files
- `src/main/main.js` - Add IPC handlers for `shortcuts.*`
- `src/renderer/js/router.js` - Add `#/shortcuts` route
- `src/renderer/js/app.js` - Add `#/shortcuts` to navigation array
- `src/renderer/styles/components.css` - Add shortcuts styling
- `src/cli/components/tab-bar.js` - Add 8th tab
- `src/cli/app.js` - Import and render shortcuts tab
- `src/cli/services/kb-service.js` - Add shortcuts service functions
- `CLAUDE.md` - Update architecture section with shortcuts references
