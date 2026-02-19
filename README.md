# Visual Automation Workflow Builder

> A node-based automation flow builder (inspired by tools like n8n). Built for the Senior Full-Stack Developer technical challenge.

**Live demo (MongoDB Atlas):** [https://fs-coding-challenge-main.vercel.app/](https://fs-coding-challenge-main.vercel.app/)

## Overview

The app lets you build automation workflows by dragging nodes onto a canvas and connecting them with edges. Each node represents an action or trigger (e.g. webhook, email, delay); edges define the flow. You can edit node labels and types in a modal, add labels to edges (double-click edge), validate the workflow (cycles, orphaned nodes), undo/redo, copy/paste/duplicate nodes, and export/import workflows as JSON. Workflows are persisted to MongoDB (local or Atlas) with manual save (and optional debounced auto-save).

**Main features:** Drag-and-drop node palette; node edit modal (label + type); edge labels (double-click edge or select + Enter); workflow list in sidebar (create, switch, rename, delete); manual Save + “Unsaved” indicator and Ctrl+S; workflow validation panel; undo/redo; copy (Ctrl+C), paste at cursor (Ctrl+V), duplicate (Ctrl+D); multi-select (Shift+drag box, Ctrl+click to add); “Go to node” search; export/import; workflow templates; dark/light theme; minimap with zoom (buttons + scroll) and drag-to-pan; keyboard shortcuts (Ctrl+/).

## Tech Stack

- **Next.js 16** (App Router) – React framework, API routes, server-side env for DB.
- **ReactFlow (@xyflow/react)** – Canvas, nodes, edges, minimap, controls.
- **TypeScript** – Typed nodes/edges, API payloads, and app state.
- **MongoDB + Mongoose** – Persistence; works with local MongoDB or MongoDB Atlas. Mongoose for schema, connection caching, and ODM.
- **CSS** – Custom styles (no UI library); CSS variables for theming (dark/light).
- **Jest + Testing Library** – Unit tests (e.g. page render). Run with `npm test`.

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
| `MONGODB_URI` | MongoDB connection string. <br> - **Local:** `mongodb://localhost:27017/automation` <br> - **Atlas:** `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/automation?retryWrites=true&w=majority` |

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
- **GET /api/automations** – List workflows. Returns `[{ id, name, createdAt, updatedAt }, ...]`.
- **POST /api/automations** – Create workflow. Body (optional): `{ name?, nodes?, edges? }`. Returns `{ id, name, nodes, edges, createdAt, updatedAt }`.
- **GET /api/automations/:id** – Get one workflow.
- **PUT /api/automations/:id** – Update workflow. Body: `{ name?, nodes?, edges? }`.
- **DELETE /api/automations/:id** – Delete workflow.

Errors return appropriate status codes (400, 404, 503) and a JSON `{ error: "..." }`.

### Frontend

On load, the builder fetches the workflow list (**GET /api/automations**) and loads the first workflow (or a selected one). The sidebar shows **Workflows**: create new, switch by name, rename (inline), and delete. The current workflow is persisted via **manual Save** (button or Ctrl+S) and optionally **debounced auto-save** (1.5s); both send **PUT /api/automation** (or PUT/automations/:id for renames). If no DB is configured, workflows are in-memory only.

**Shortcuts (Ctrl+/ in-app):** Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), Save (Ctrl+S), Copy/Paste/Duplicate (Ctrl+C / Ctrl+V / Ctrl+D), multi-select (Shift+drag, Ctrl+click), pan (Space + drag), Go to node (search at top), edit node/edge (Enter when selected), delete (Ctrl+Click or Delete/Backspace).

### Trade-offs

- **No auth** – The API is open; fine for a demo/portfolio, but production would need authentication and per-user or per-tenant workflows.
- **Nodes/edges as Mixed** – Stored as flexible JSON in MongoDB so React Flow schema changes don’t require migrations; stricter validation could be added later.

## Testing

Tests live in `src/__tests__/`. Run them with:

```bash
npm test
```

Coverage includes at least the main page render. With more time: unit tests for workflow validation and export/import parsing; integration tests for the CRUD API (e.g. create workflow, GET by id, update, delete); and E2E for core flows (add node, connect, edit, persist).

## What I’d Improve With More Time

1. **Auth** – Sign-in and scope workflows to users (or API keys for programmatic access).
2. **Tests** – Broader unit tests (validation, export/import), API integration tests, and E2E for critical paths.
3. **Rate limiting** – Protect the API from abuse when public.
4. **Error feedback** – Toasts or inline messages for save/load failures instead of only console.
5. **Workflow-runner service** - queue (BullMQ / SQS) and execution logs

## Challenge Requirements (Reference)

- **Frontend:** Node creation & editing modal; UI/UX improvements.
- **Backend:** Database + schema; CRUD API for workflows (`POST/GET/PUT/DELETE /api/automations`).
- **Bonus:** Extra node types, validation, undo/redo, templates, export/import, dark mode, shortcuts — as implemented.

See `README_CHALLENGE.md` for the full challenge brief.
