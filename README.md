# Visual Automation Workflow Builder

> A node-based automation flow builder (inspired by tools like n8n). Built for the Senior Full-Stack Developer technical challenge.

## Overview

<!-- Briefly describe what the app does and the main features implemented. -->

## Tech Stack

<!-- List core technologies: Next.js, ReactFlow, database choice, etc. Add any libraries you introduced and why. -->

## Getting Started

### Prerequisites

- Node.js 22 (use `nvm use`)
- <!-- Database: PostgreSQL / MongoDB + any other requirements -->

### Installation & Setup

```bash
nvm use
npm i
# Database setup: <!-- e.g. Docker, migrations, or connection steps -->
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy `.env.example` to `.env` and fill in the values. Required variables:

<!-- e.g. DATABASE_URL, NEXT_PUBLIC_*, etc. -->

## Architecture & Design

### Database

<!-- Schema overview: workflows, nodes, edges, metadata. Why this structure? -->

### API

<!-- Endpoints and design choices: POST/GET/PUT/DELETE /api/automations, request/response shapes, error handling. -->

### Frontend

<!-- Key components, state management, how node editing and persistence work. -->

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
