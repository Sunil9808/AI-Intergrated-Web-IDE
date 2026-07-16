# Task API 📝

> **FlyRank Internship · Backend Track · Week 2 · Assignment A1**  
> A fully-featured in-memory CRUD API for to-do tasks — built with **Node.js + Express**, documented with **Swagger UI**.

---

## What this is

A REST API that lets any HTTP client **Create, Read, Update, and Delete** to-do tasks.  
Data lives in memory — restarting the server resets the list (intentional — see [The Mortality Experiment](#the-mortality-experiment) below).

---

## Quick start (one command)

```bash
# 1 — install dependencies
npm install

# 2 — start the server
npm start
```

Server starts on **http://localhost:3000**

| URL | What you'll see |
|-----|----------------|
| http://localhost:3000/ | API descriptor JSON |
| http://localhost:3000/health | `{ "status": "ok" }` |
| http://localhost:3000/docs | **Swagger UI — interactive docs** |

> **Dev mode** (auto-restarts on file save): `npm run dev`

---

## Endpoint table

| Method | Path | Description | Success | Error |
|--------|------|-------------|---------|-------|
| `GET` | `/` | API descriptor | 200 | — |
| `GET` | `/health` | Liveness probe | 200 | — |
| `GET` | `/tasks` | List all tasks | 200 | — |
| `GET` | `/tasks/:id` | Get one task | 200 | 404 |
| `POST` | `/tasks` | Create a task | **201** | 400 |
| `PUT` | `/tasks/:id` | Update a task | 200 | 400 / 404 |
| `DELETE` | `/tasks/:id` | Delete a task | **204** | 404 |
| `GET` | `/stats` | Task statistics | 200 | — |
| `POST` | `/reset` | Restore seed tasks | 200 | — |

### Query parameters on `GET /tasks`

| Param | Example | Effect |
|-------|---------|--------|
| `done` | `?done=true` | Filter by completion |
| `search` | `?search=milk` | Case-insensitive title search |
| `limit` | `?limit=2` | Pagination — max results |
| `offset` | `?offset=2` | Pagination — skip N results |

---

## Sample `curl -i` output

```
$ curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 37
Date: Mon, 14 Jul 2026 12:00:00 GMT
Connection: keep-alive

{"id":4,"title":"Buy milk","done":false}
```

---

## Full CRUD cycle via curl

```bash
# List all tasks
curl -i http://localhost:3000/tasks

# Get task 1
curl -i http://localhost:3000/tasks/1

# Create a task
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'

# Update task (mark done + rename)
curl -i -X PUT http://localhost:3000/tasks/4 \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy oat milk","done":true}'

# Delete task
curl -i -X DELETE http://localhost:3000/tasks/4

# Confirm it's gone — expect 404
curl -i http://localhost:3000/tasks/4
```

---

## Status codes used

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET or PUT |
| 201 | Created | Successful POST /tasks |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Missing/invalid `title` or empty body |
| 404 | Not Found | Task id doesn't exist |

---

## Stretch goals implemented

- ✅ **Filter** `GET /tasks?done=true`
- ✅ **Search** `GET /tasks?search=milk`
- ✅ **Pagination** `GET /tasks?limit=2&offset=0`
- ✅ **Stats** `GET /stats` → `{ "total": 3, "done": 1, "open": 2 }`
- ✅ **Reset** `POST /reset` → restores the 3 seed tasks

> **Why real APIs never return "everything":**  
> Without `limit`/`offset`, a single `GET /tasks` on a production database with millions of rows would transfer gigabytes of data, time out, and bring the server down. Pagination makes responses predictable in size and time — it's not optional in production, it's a contract.

---

## The Mortality Experiment

Create a few tasks, then press `Ctrl+C` to stop the server, restart with `npm start`, and run `GET /tasks` again.  
All your new tasks are gone — only the 3 seed tasks remain.

**Why?** Because the task list is just a JavaScript array in the process's RAM. When the process exits, RAM is released — no data survives. This is the entire reason Week 3 introduces a database: persistent storage that outlives the process.

---

## Commit history

| Commit | Stage |
|--------|-------|
| `Stage 0: hello server` | Express server starts, GET / returns hello |
| `Stage 1: root and health endpoints` | GET / + GET /health return proper JSON |
| `Stage 2: read endpoints with 404` | GET /tasks + GET /tasks/:id with 404 handling |
| `Stage 3: create with validation` | POST /tasks with 201 and 400 validation |
| `Stage 4: full CRUD` | PUT /tasks/:id + DELETE /tasks/:id |
| `Stage 5: Swagger UI` | openapi.json + /docs serving |
| `Stage 6: publish and docs` | README, GitHub publish |

---

## Project structure

```
todo-api/
├── index.js        ← the entire API (~160 lines)
├── openapi.json    ← OpenAPI 3.0 spec driving Swagger UI
├── package.json
├── .gitignore
└── README.md       ← you are here
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server framework |
| `swagger-ui-express` | Serves Swagger UI at /docs |
| `nodemon` *(dev)* | Auto-restarts server on file changes |
