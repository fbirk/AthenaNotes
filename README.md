# KnowledgeBase

![KnowledgeBase Banner](docs/Welcome-Screen.jpg)

A modern, cross-platform developer knowledge base and productivity suite. Organize notes, code snippets, todos, projects, and tools—all in one beautiful desktop app.

---

## ✨ Features

- **Notes**: Markdown editor with live preview, project organization, and internal linking.
- **Code Snippets**: Save, search, and tag code snippets by language, usage, and module. Syntax highlighting included.
- **Todos**: Persistent, prioritized todo panel with deadlines and project association.
- **Projects**: Group notes, todos, and roadmaps by initiative. Edit, rename, and manage projects easily.
- **Tools Launcher**: Quick-launch for your favorite apps and URLs, categorized for easy access.
- **Roadmaps & Milestones**: Plan and track progress with visual timelines (coming soon).
- **Beautiful UI**: Responsive, themeable interface with modern design and smooth interactions.
- **Electron + Vite**: Fast startup, hot reload, and native desktop experience.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)

### Installation
```bash
# Clone the repository
$ git clone https://github.com/yourusername/KnowledgeBase.git
$ cd KnowledgeBase

# Install dependencies
$ npm install
```

### Running the App
```bash
# Start the development server
$ npm run dev

# The app will open in Electron and Vite will serve the renderer at http://localhost:5173/
```

---

## 🛠️ Usage

- **Create Notes**: Click the + button in Notes. Write in Markdown, link to other notes, and assign to projects.
- **Add Snippets**: Go to Snippets, click + New Snippet, fill in details (usage/module/language optional).
- **Track Todos**: Open the Todos panel, add tasks, set priorities and deadlines.
- **Manage Projects**: Create, edit, and delete projects. Group notes and todos by project.
- **Launch Tools**: Add your favorite apps/URLs in Tools. Launch with one click.

---

## 👩‍💻 Developer Guide

- **Source Structure**:
  - `src/main/` — Electron main process, IPC, file services
  - `src/renderer/` — UI components, styles, and logic
  - `src/shared/` — Validators and shared constants
  - `specs/` — Documentation, plans, and contracts
- **Hot Reload**: Changes in renderer auto-refresh the UI.
- **IPC API**: Extend backend features via `window.knowledgeBase.invoke()`.
- **Styling**: Customize themes in `src/renderer/styles/`.

---

## 🤝 Contributing

Pull requests, issues, and feature suggestions are welcome! See [specs/master/plan.md](specs/master/plan.md) for roadmap and guidelines.

---

## 📄 License

MIT License. See [LICENSE](LICENSE.md) for details.

---

![Screenshot](docs/Notes-Screen.jpg)

