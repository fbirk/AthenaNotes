# Research: CLI Interface for KnowledgeBase

**Branch**: `003-cli-interface` | **Date**: 2026-03-19

## Decision 1: TUI Framework

**Decision**: Use **Ink** (React for CLI) as the primary TUI framework.

**Rationale**:
- Ink provides a React-like component model for terminal UIs, which maps well to the existing component-based architecture of the Electron app
- Actively maintained (v5.x, regular releases)
- Strong ecosystem: `ink-text-input`, `ink-select-input`, `ink-spinner`, `ink-tab` for common UI patterns
- Flexbox-based layout system handles responsive terminal sizing
- Good Windows/PowerShell 7+ compatibility via ANSI escape sequences
- Used by major CLI tools (Gatsby, Prisma, Shopify CLI)
- The component model (props, state, hooks) makes it natural to port the existing class-based components

**Alternatives considered**:
- **blessed/neo-blessed**: More feature-rich but largely unmaintained since 2021. Complex API, poor TypeScript support. Heavy for what we need.
- **terminal-kit**: Low-level, requires manual layout management. Better for games than structured UIs.
- **Raw ANSI/readline**: Maximum control but enormous effort. No layout system.
- **Bubbletea (Go)**: Excellent TUI framework but wrong language — would require reimplementing all services.

## Decision 2: Service Reuse Strategy

**Decision**: Import existing services directly from `src/main/services/` without modification.

**Rationale**:
- All three services (`file-service.js`, `config-service.js`, `daily-todos-service.js`) are 100% pure Node.js with zero Electron dependencies
- They use only `node:fs/promises`, `node:path`, and `uuid` — all available in the CLI context
- The singleton pattern with `.initialize(storagePath)` works identically outside Electron
- 28+ functions in file-service alone can be called directly
- Same data format (JSON + markdown with YAML frontmatter) ensures full interoperability

**Alternatives considered**:
- **Fork/copy services**: Creates maintenance burden with two copies diverging over time
- **Abstract into shared package**: Over-engineering for a monorepo; direct imports are simpler
- **Rewrite services for CLI**: Unnecessary duplication of tested, working code

## Decision 3: Terminal Markdown Rendering

**Decision**: Use **marked** (already a project dependency) with a custom terminal renderer, supplemented by **marked-terminal** for ANSI output.

**Rationale**:
- `marked` is already used in the Electron renderer for markdown processing
- `marked-terminal` provides a `marked` renderer that outputs ANSI-styled terminal text (headings with color/bold, lists with bullets, code with background, links underlined)
- Reusing the same markdown parser guarantees rendering consistency between Electron and CLI
- Custom renderer extensions can handle internal links (`[[Note Title]]`) gracefully in terminal context

**Alternatives considered**:
- **cli-markdown**: Less maintained, doesn't integrate with `marked`
- **terminal-markdown**: Smaller community, fewer features
- **Custom ANSI renderer from scratch**: Too much effort for diminishing returns

## Decision 4: Terminal Syntax Highlighting

**Decision**: Use **cli-highlight** for code snippet syntax coloring in the terminal.

**Rationale**:
- Built on highlight.js (same engine used by many markdown renderers)
- Outputs ANSI-colored code for terminal display
- Supports 190+ languages out of the box
- Works well with PowerShell 7+ terminal color support

**Alternatives considered**:
- **Prism.js**: Browser-focused, no built-in terminal output
- **Cardinal**: Node-specific but JavaScript-only, too limited for multi-language snippets
- **Custom ANSI coloring**: Unreasonable effort for 190+ language support

## Decision 5: Clipboard Support

**Decision**: Use **clipboardy** for cross-platform clipboard operations (copy snippet code).

**Rationale**:
- Pure Node.js clipboard access (read/write)
- Works on Windows (PowerShell clip.exe), macOS (pbcopy), Linux (xclip/xsel)
- No native compilation required
- Small, focused package

**Alternatives considered**:
- **node-clipboard**: Less maintained
- **PowerShell Set-Clipboard**: Windows-only, breaks cross-platform potential
- **Manual child_process calls**: clipboardy already abstracts this correctly

## Decision 6: Project Structure

**Decision**: Add CLI source code under `src/cli/` in the same repository, with a separate entry point and npm script.

**Rationale**:
- CLI lives alongside the Electron app in the same monorepo
- Can import services directly via relative paths (`../main/services/`)
- Shared constants and validators from `src/shared/` are immediately available
- Single `package.json` manages all dependencies
- CLI entry point via `src/cli/index.js`, launchable via `npm run cli` or `npx knowledgebase`

**Alternatives considered**:
- **Separate repository**: Duplicates services, complicates dependency management
- **npm workspaces monorepo**: Over-engineering for two entry points sharing the same services
- **Subdirectory with own package.json**: Unnecessary complexity

## Decision 7: Bootstrap Configuration for CLI

**Decision**: The CLI reads the same `.dev-storage.json` / `storage-location.json` bootstrap config as the Electron app, with fallback to a CLI-specific config at `~/.knowledgebase-cli.json` and a `--storage` CLI argument.

**Rationale**:
- Zero-friction for existing Electron users — their storage path is auto-detected
- CLI argument provides override for automation/scripting
- Fallback config enables standalone CLI use without Electron
- Priority order: CLI argument > environment variable > Electron bootstrap config > CLI config > setup wizard

**Alternatives considered**:
- **Always require CLI argument**: Poor UX for repeated use
- **Separate config system**: Fragments the configuration story
- **XDG config directory**: Not standard on Windows

## Decision 8: Text Editing in Terminal

**Decision**: Use **Ink's text input components** for short-form editing (titles, tags, descriptions) and launch the user's **$EDITOR** (e.g., vim, nano, code) for long-form markdown editing (note content, todo descriptions).

**Rationale**:
- Terminal text areas have fundamental limitations for multi-line editing (no cursor positioning, no selection, no undo)
- Claude Code and other CLI tools use external editor launch for long content — this is the established pattern
- Ink's `ink-text-input` handles single-line inputs well within the TUI
- `$EDITOR` / `$VISUAL` environment variable is the Unix/PowerShell convention; falls back to notepad on Windows
- The edited file is saved back when the editor closes, maintaining the TUI flow

**Alternatives considered**:
- **Built-in multi-line editor**: Extremely complex to implement correctly in terminal, poor UX compared to real editors
- **Always external editor**: Too disruptive for single-line inputs like todo titles
- **vim-like keybindings in TUI**: Massive scope, niche audience

## Decision 9: Layout Architecture

**Decision**: Use a three-zone layout: **tab bar** (top), **list-detail split** (center), **status bar** (bottom). Each tab renders its own list-detail content.

**Rationale**:
- Mirrors the Electron app's sidebar + main panel layout
- Tab bar provides quick section switching (number keys 1-7)
- Status bar shows context-sensitive shortcuts, current item info
- Ink's `<Box>` with `flexDirection` handles the split naturally
- Responsive: list panel collapses or wraps on narrow terminals

**Alternatives considered**:
- **Full-screen cards (no split)**: Loses the browse-while-viewing benefit
- **Tmux-like panes**: Too complex, unfamiliar to most users
- **Stacked views (mobile-like)**: Works but slower navigation than side-by-side
