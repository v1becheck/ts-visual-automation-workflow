# Visual Automation Workflow Builder

> A node-based automation flow builder (inspired by tools like n8n). Built for the Senior Full-Stack Developer technical challenge.

## Overview

<!-- Briefly describe what the app does and the main features implemented. -->

## Tech Stack

<!-- List core technologies: Next.js, ReactFlow, database choice, etc. Add any libraries you introduced and why. -->

## Getting Started

### Prerequisites

- Node.js 22 (use `nvm use`)
- **MongoDB** (optional for persistence): local instance or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account

### Installation & Setup

```bash
nvm use
npm i
cp .env.example .env
# Edit .env and set MONGODB_URI (see below). If unset, the app runs with in-memory default workflow (no persistence).
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy `.env.example` to `.env`. Optional but recommended for persistence:

| Variable      | Description |
|---------------|-------------|
| `MONGODB_URI` | MongoDB connection string. **Local:** `mongodb://localhost:27017/automation`. **Atlas:** `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/automation?retryWrites=true&w=majority` |

If `MONGODB_URI` is not set, the app still runs: the default workflow is in-memory only and changes are not persisted.

## Architecture & Design

### Database

**MongoDB** with **Mongoose**. Single collection: **Automation**.

- **Schema:** `name` (string), `nodes` (array of Mixed – React Flow nodes), `edges` (array of Mixed – React Flow edges), `createdAt` / `updatedAt` (timestamps).
- Workflows are stored as one document per automation; nodes and edges are stored as JSON-friendly arrays so React Flow types can evolve without migrations.
- Works with a **local** MongoDB instance or **MongoDB Atlas**; set `MONGODB_URI` accordingly.

### API

- **GET /api/automation** – Returns the first workflow (or creates one). Query `?id=...` loads a specific workflow. Without DB config, returns default in-memory workflow.
- **PUT /api/automation** – Body: `{ id, nodes?, edges?, name? }`. Updates the workflow (requires DB).
- **POST /api/automations** – Create workflow. Body (optional): `{ name?, nodes?, edges? }`. Returns `{ id, name, nodes, edges, createdAt, updatedAt }`.
- **GET /api/automations/:id** – Get one workflow.
- **PUT /api/automations/:id** – Update workflow. Body: `{ name?, nodes?, edges? }`.
- **DELETE /api/automations/:id** – Delete workflow.

Errors return appropriate status codes (400, 404, 503) and a JSON `{ error: "..." }`.

### Frontend

On load, the builder calls **GET /api/automation**, stores the returned `id`, `nodes`, and `edges`, and keeps the current workflow id in state. Changes to nodes/edges are **debounced** (1.5s); when the delay elapses, the app sends **PUT /api/automation** with `{ id, nodes, edges }` so the current workflow is persisted. If no DB is configured, `id` is null and no save requests are sent.

### Trade-offs

<!-- Decisions you made and what you’d do differently with more time or scale. -->

## Testing

<!-- If you added tests: where they live, how to run them (`npm test`), what’s covered. -->

<!-- If not: testing strategy — what you would test, which areas are critical, and how you’d approach it. -->

## What I’d Improve With More Time

<!-- Prioritised list: performance, UX, tests, validation, extra features, etc. -->

## Challenge Requirements (Reference)

- **Frontend:** Node creation & editing modal; UI/UX improvements.
- **Backend:** Database + schema; CRUD API for workflows (`POST/GET/PUT/DELETE /api/automations`).
- **Bonus:** Extra node types, validation, undo/redo, templates, export/import, dark mode, shortcuts — as implemented.

See `README_CHALLENGE.md` for the full challenge brief.
