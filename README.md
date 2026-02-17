# Senior Full-Stack Developer - Technical Challenge

## 🎯 Overview

This challenge involves building a **visual automation workflow builder** where users can create automation flows by connecting nodes (actions) together using a drag-and-drop interface.

Think of it as a simplified version of tools like n8n, where each node represents an action and edges define the flow between actions.

## 🚀 Tech Stack

This starter project includes:

- **[Next.js](https://nextjs.org/docs)** - React framework with App Router
- **[ReactFlow](https://reactflow.dev/learn)** - Visual node-based editor
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **CSS** - Styling (keep it simple, or use your preferred solution)
- **[Jest](https://jestjs.io/)** - Testing framework

**Feel free to add any libraries you need** - just document your reasoning for the choices you make.

## 📋 Challenge Requirements

### Frontend Tasks

#### 1. Node Creation & Editing
- [ ] Create a modal that allows users to edit node properties (at minimum: node name/label)
- [ ] The modal should open when:
  - A new node is dropped onto the canvas
  - An existing node is clicked/double-clicked
- [ ] Ensure the changes persist in the workflow state

#### 2. UI/UX Enhancement
- [ ] Improve the overall visual design and user experience
- [ ] Consider: color scheme, spacing, typography, node styling, controls placement
- [ ] Make it intuitive and pleasant to use

### Backend Tasks

#### 3. Data Persistence
- [ ] Choose and set up a database (PostgreSQL or MongoDB recommended)
- [ ] Design a schema for storing automation workflows
- [ ] Consider what data needs to be persisted: workflows, nodes, edges, metadata

#### 4. CRUD API
- [ ] Implement API endpoints for automation workflows:
  - `POST /api/automations` - Create new workflow
  - `GET /api/automations/:id` - Retrieve workflow
  - `PUT /api/automations/:id` - Update workflow
  - `DELETE /api/automations/:id` - Delete workflow

### Bonus: Be Creative! 🎨

Add features that showcase your skills and thinking:
- Different node types (email, webhook, delay, condition, etc.)
- Workflow validation (detect cycles, orphaned nodes)
- Undo/redo functionality
- Workflow templates or examples
- Export/import workflows
- Dark mode
- Keyboard shortcuts
- Or anything else you think would be valuable!

## ⚙️ Getting Started

### Prerequisites
- Node.js 22 (use `nvm use` to switch to the correct version)
- Database (PostgreSQL/MongoDB) - you can use Docker or a cloud service

### Installation

```bash
nvm use
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📝 What We're Looking For

**We're not expecting perfection!** This is about understanding your approach to software development and how you communicate in an asynchronous environment.

### Code Quality
- **Clean, readable code** with consistent style
- **Proper separation of concerns** (components, services, utilities)
- **Type safety** - leverage TypeScript effectively
- **Error handling** - both client and server-side
- **Sensible abstractions** - neither over-engineered nor overly simplistic

### Testing
- **Strategic testing** - focus on critical paths
- Unit tests for business logic
- Integration tests for API endpoints (optional but appreciated)
- If you don't have time for tests, **document your testing strategy**:
  - What would you test?
  - What testing approach would you take?
  - Where are the critical test areas?

### Documentation
- **Code comments** where the intent isn't obvious
- **README updates** if you add new setup steps
- **Architecture decisions** - explain your database schema, API design choices
- **Trade-offs** - what would you do differently with more time?

### UI/UX
- **Functional and intuitive** interface
- **Responsive** to different screen sizes (at least desktop)
- **Visual polish** - doesn't need to be fancy, but should be thoughtful

## 📤 Submission Guidelines

### Time Expectations
Spend **4-8 hours** on this challenge. We respect your time - if something isn't finished, that's completely fine! Just document what you would have done.

### What to Submit

1. **Code**: Push your solution to a Git repository (GitHub, GitLab, etc.)
2. **Documentation**: Update this README with:
   - Setup instructions (especially for database)
   - Architecture decisions and trade-offs
   - What you'd improve with more time
   - Testing strategy (if tests aren't included)
3. **Database**: Include schema/migrations or a setup script (if needed)
4. **Environment**: Provide `.env.example` file with required variables (if needed)

### How to Submit

1. **Create a private repository** with the shared code as your initial commit
2. **Commit your changes** as you would in a professional environment (meaningful commit messages, logical grouping, etc.)
3. **Share the repository** with `adrien.fischer@otera.ai`

### Evaluation Criteria

We'll assess your submission based on:

- Code Quality
- Functionality
- Full-Stack Skills
- Communication
- Testing

## 💡 Tips & Hints

- **Start simple** - get the core functionality working first, then enhance
- **Document as you go** - note your decisions and trade-offs
- **Don't over-engineer** - we value pragmatic solutions
- **Use AI tools** if you want - just be ready to discuss your choices
- **Ask questions** if requirements are unclear (in real work, you would!)

## 🤔 Questions?

If you have questions about the requirements or run into issues with the starter code, please reach out. We want you to succeed!

> **Have fun building!** We're excited to see your approach and creativity. 🚀

