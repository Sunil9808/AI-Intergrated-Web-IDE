// ============================================================
// Task API — FlyRank Internship · Backend Track · W2 · A1
// In-memory CRUD API built with Node.js + Express
// Swagger UI served at /docs via swagger-ui-express
// ============================================================

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./openapi.json");

const app = express();
const PORT = 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json()); // parse JSON request bodies

// ── In-memory "database" ────────────────────────────────────
let tasks = [
  { id: 1, title: "Learn Express", done: true },
  { id: 2, title: "Build CRUD API", done: false },
  { id: 3, title: "Write a README", done: false },
];
let nextId = 4; // tracks the next available id

// ── Helper ──────────────────────────────────────────────────
const findTask = (id) => tasks.find((t) => t.id === id);

// ============================================================
// Stage 0 + 1 — Root & Health
// ============================================================

// GET /  — API descriptor
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

// GET /health  — liveness probe (used by real services to check uptime)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ============================================================
// Stage 2 — Read endpoints
// ============================================================

// GET /tasks  — list all tasks (supports ?done= and ?search= stretch goals)
app.get("/tasks", (req, res) => {
  let result = [...tasks];

  // Stretch: filter by done status
  if (req.query.done !== undefined) {
    const doneFilter = req.query.done === "true";
    result = result.filter((t) => t.done === doneFilter);
  }

  // Stretch: search by title substring (case-insensitive)
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(term));
  }

  // Stretch: pagination
  if (req.query.limit !== undefined || req.query.offset !== undefined) {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || result.length;
    result = result.slice(offset, offset + limit);
  }

  res.status(200).json(result);
});

// GET /tasks/:id  — single task by id
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = findTask(id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(200).json(task);
});

// ============================================================
// Stage 3 — Create
// ============================================================

// POST /tasks  — create a new task
app.post("/tasks", (req, res) => {
  const { title } = req.body;

  // Validate: title must be present and non-empty
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res
      .status(400)
      .json({ error: "title is required and must be a non-empty string" });
  }

  const newTask = {
    id: nextId++,
    title: title.trim(),
    done: false,
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

// ============================================================
// Stage 4 — Update & Delete
// ============================================================

// PUT /tasks/:id  — replace title and/or done
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = findTask(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  // Validate: body must contain at least one valid field
  const hasTitle = title !== undefined;
  const hasDone = done !== undefined;

  if (!hasTitle && !hasDone) {
    return res
      .status(400)
      .json({ error: "Request body must include 'title' and/or 'done'" });
  }

  if (hasTitle) {
    if (typeof title !== "string" || title.trim() === "") {
      return res
        .status(400)
        .json({ error: "'title' must be a non-empty string" });
    }
    task.title = title.trim();
  }

  if (hasDone) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "'done' must be a boolean" });
    }
    task.done = done;
  }

  res.status(200).json(task);
});

// DELETE /tasks/:id  — remove a task
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send(); // 204 No Content — success, nothing to return
});

// ============================================================
// Stretch goals
// ============================================================

// GET /stats  — computed summary
app.get("/stats", (req, res) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const open = total - done;
  res.status(200).json({ total, done, open });
});

// POST /reset  — restore the 3 seed tasks (handy for demos)
app.post("/reset", (req, res) => {
  tasks = [
    { id: 1, title: "Learn Express", done: true },
    { id: 2, title: "Build CRUD API", done: false },
    { id: 3, title: "Write a README", done: false },
  ];
  nextId = 4;
  res.status(200).json({ message: "Tasks reset to seed data", tasks });
});

// ============================================================
// Stage 5 — Swagger UI
// ============================================================
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀  Task API running on http://localhost:${PORT}`);
  console.log(`📖  Swagger UI      → http://localhost:${PORT}/docs`);
  console.log(`❤️   Health check    → http://localhost:${PORT}/health\n`);
});
