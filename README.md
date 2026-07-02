# 🤖 AI Web IDE

A fully-featured, VS Code-style AI-powered Web IDE built with React, TypeScript, Monaco Editor, and real LLM integration.

## ✨ Features

### 🖥️ VS Code-Style UI
- Title bar with window controls
- Menu bar with full menus
- Activity bar with panel switching
- Resizable sidebar, editor, and bottom panel
- Status bar with live indicators

### 📝 Monaco Editor
- Full syntax highlighting for 20+ languages
- IntelliSense & autocomplete
- Tab management (multi-tab)
- Breadcrumb navigation
- Minimap, line numbers, bracket pairs
- Format on save
- Keyboard shortcuts

### 📁 File Explorer
- File tree with icons
- Right-click context menu
- Folder expand/collapse
- File open in editor

### 🤖 Real AI Features (powered by OpenAI GPT-4o)
- **AI Chat** — Streaming chat assistant with full context awareness
- **Explain Code** — Explain any code in detail
- **Generate Code** — Generate from description
- **Debug Errors** — Find and fix bugs
- **Refactor** — Improve code quality
- **Code Review** — Quality, security, performance review
- **Generate Tests** — Unit tests with edge cases
- **Add Documentation** — JSDoc/docstrings
- **Convert Languages** — Translate between languages

### 💻 Terminal
- Xterm.js terminal
- Socket.IO real-time connection
- node-pty backend (real commands)
- Simulation mode when backend unavailable

### 🎨 Themes
- Dark (VS Code default)
- Light
- High Contrast
- Monokai
- Solarized Dark

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
# Root (frontend)
npm install

# Backend
cd server && npm install && cd ..
```

### 2. Configure environment

Edit `.env`:
```env
OPENAI_API_KEY=sk-your-key-here
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4o
PORT=5000
```

### 3. Run development

```bash
# Run both frontend and backend concurrently
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:5000

---

## 📁 Project Structure

```
AI-Web-IDE/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── TitleBar/       # Window title bar
│   │   ├── MenuBar/        # Application menus
│   │   ├── ActivityBar/    # Left icon bar
│   │   ├── Sidebar/        # Explorer, Search, Git, AI Chat
│   │   ├── Editor/         # Monaco editor + tabs
│   │   ├── BottomPanel/    # Terminal, Output, Problems
│   │   └── StatusBar/      # Status indicators
│   ├── store/              # Zustand state management
│   ├── services/           # Frontend API services
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Helper utilities
│
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   │   ├── ai/             # OpenAI streaming
│   │   └── fileSystem/     # File operations
│   ├── socket/             # Socket.IO handlers
│   └── middleware/         # Express middleware
│
└── .env                    # Configuration
```

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/files/tree` | File tree |
| GET | `/api/files/read` | Read file |
| POST | `/api/files/write` | Write file |
| POST | `/api/files/create` | Create file/folder |
| DELETE | `/api/files/delete` | Delete file/folder |
| PUT | `/api/files/rename` | Rename file |
| POST | `/api/ai/chat` | AI chat (streaming SSE) |
| POST | `/api/ai/explain` | Explain code |
| POST | `/api/ai/generate` | Generate code |
| POST | `/api/ai/debug` | Debug errors |
| POST | `/api/ai/refactor` | Refactor code |
| POST | `/api/ai/review` | Code review |
| POST | `/api/ai/test` | Generate tests |
| POST | `/api/ai/document` | Generate docs |
| POST | `/api/ai/convert` | Convert language |

---

## 🔌 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `terminal:create` | Client → Server | Create terminal session |
| `terminal:data` | Bidirectional | Send/receive terminal data |
| `terminal:resize` | Client → Server | Resize terminal |
| `terminal:destroy` | Client → Server | Close terminal session |
| `terminal:created` | Server → Client | Session created confirmation |
| `terminal:closed` | Server → Client | Session closed notification |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+Shift+E` | Explorer |
| `Ctrl+Shift+F` | Search |
| `Ctrl+Shift+A` | AI Assistant |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+\`` | Toggle Terminal |
| `Ctrl+S` | Save File |
| `Ctrl+P` | Quick Open |
| `Ctrl+Shift+E` | AI: Explain Code |
| `Shift+Alt+F` | Format Document |

---

## 🤖 AI Context System

The AI receives full context on every request:
- Current open file path, content, and language
- List of all open editor tabs
- Workspace name
- Recent terminal errors
- Selected code snippet

This enables accurate, context-aware responses.

---

## 🐳 Docker (Optional)

```bash
docker-compose up
```

---

## 📄 License

MIT License - See LICENSE file
