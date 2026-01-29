# Implementation Plan: TODOs of the Day

**Branch**: `002-todos-of-the-day` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-todos-of-the-day/spec.md`

## Summary

Add a "TODOs of the Day" feature that provides a simple daily task list with automatic rollover. Incomplete tasks carry over to the next day with increased priority, while completed tasks are archived. The feature includes a quick input bar with add button for fast task creation, checkbox-based completion, and clear visual priority indicators. This feature operates independently from the existing todos system.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, CSS3 (consistent with existing app)
**Primary Dependencies**: Electron (existing), Vite (existing), uuid (existing)
**Storage**: Local file system (`daily-todos.json`, `daily-todos-archive.json`)
**Testing**: Vitest (unit tests), Playwright (E2E) - consistent with existing
**Target Platform**: Windows 10/11 Desktop (Electron) - existing platform
**Project Type**: Feature addition to existing Electron desktop application
**Performance Goals**: Rollover <1s for 100 todos (SC-004), single-click completion (SC-002)
**Constraints**: Offline-capable, single-user, completely independent from existing todos
**Scale/Scope**: ~1-100 active daily todos, 30-day archive retention

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate Evaluation

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Code Quality** | | | |
| Readability | Self-documenting code, clear naming | PASS | Follow existing patterns (e.g., `todos.js` → `daily-todos.js`) |
| Consistency | Follow established patterns | PASS | Reuse existing component structure, IPC patterns |
| Simplicity | Simplest solution that meets requirements | PASS | Single JSON file storage, no complex state |
| Modularity | Cohesive, loosely-coupled modules | PASS | Separate component, service, and IPC handler files |
| No Dead Code | Remove unused code | PASS | Feature is additive, no removal needed |
| **II. Testing Standards** | | | |
| Test Coverage | Tests for all features/fixes | PASS | Unit tests for rollover logic, E2E for UI |
| Test Independence | Isolated tests | PASS | No dependencies on existing todos tests |
| Contract Testing | API boundary tests | PASS | IPC contract tests defined |
| **III. User Experience** | | | |
| Consistency | Uniform UI patterns | PASS | Match existing todo checkbox, list styles |
| Feedback | Clear user feedback | PASS | Priority indicators, overdue badges |
| Error Handling | User-friendly errors | PASS | Validation prevents empty todos |
| Accessibility | WCAG 2.1 AA | PASS | Keyboard navigation, focus management |
| Responsiveness | Adapt to screen sizes | PASS | Vertical list design, consistent with portrait layout |
| **IV. Performance** | | | |
| Response Time | <100ms UI, <1s common, <5s complex | PASS | Small data set, simple operations |
| Resource Efficiency | No leaks, efficient resource use | PASS | Single JSON file, no complex caching needed |
| Degradation | Graceful under load | N/A | Single-user local app |

**Gate Status: PASSED** - All applicable constitution principles are addressed.

## Project Structure

### Documentation (this feature)

```text
specs/002-todos-of-the-day/
├── spec.md              # Feature specification
├── plan.md              # This file
├── data-model.md        # Entity definitions and storage
├── contracts/           # IPC API contracts
│   └── ipc-api.md
└── tasks.md             # Task breakdown (to be generated)
```

### Source Code (additions to existing repository)

```text
src/
├── main/
│   └── services/
│       ├── file-service.js           # MODIFY: Add daily todos file operations
│       └── daily-todos-service.js    # NEW: Daily todos business logic + rollover
│
├── renderer/
│   ├── index.html                    # MODIFY: Add daily todos section
│   ├── styles/
│   │   └── components.css            # MODIFY: Add daily todos styles
│   └── js/
│       ├── app.js                    # MODIFY: Initialize daily todos component
│       ├── router.js                 # MODIFY: Add daily todos route (optional)
│       ├── components/
│       │   └── daily-todos.js        # NEW: Daily todos UI component
│       └── services/
│           └── api.js                # MODIFY: Add dailyTodos.* IPC calls
│
└── shared/
    └── constants.js                  # MODIFY: Add daily todos priority levels

tests/
├── unit/
│   └── services/
│       └── daily-todos-service.test.js  # NEW: Rollover logic tests
└── e2e/
    └── daily-todos.spec.js              # NEW: E2E tests for daily todos
```

**Structure Decision**: Feature is implemented as an addition to the existing Electron application structure. New files are created following existing naming conventions. The feature is self-contained within its own component and service files while leveraging existing infrastructure (file service base, IPC patterns, UI styles).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. The feature follows existing patterns and adds minimal complexity:
- One new data file (`daily-todos.json`)
- One new archive file (`daily-todos-archive.json`)
- One new renderer component
- One new main process service
- Minor modifications to existing files for integration
