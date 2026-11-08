# Lekvanta Project Structure

## Overview
This document outlines the proposed folder layout and key modules for the **Lekvanta** business management application.

---

## Root Directory (`Lekvanta/`)
```
Lekvanta/
├─ .git/                # Git repository
├─ .vscode/            # VS Code settings (recommended extensions)
├─ README.md            # Project overview (this file)
├─ package.json         # Monorepo root dependencies & scripts
├─ tsconfig.json        # TypeScript configuration (base)
├─ lerna.json           # (optional) if using Lerna/Yarn workspaces
├─ electron/            # Electron main process code
│   ├─ main.ts          # Entry point for Electron
│   ├─ preload/        # Preload scripts exposing safe APIs to renderer
│   └─ builder/         # electron‑builder configuration
├─ backend/             # Express API server (local & optional cloud sync)
│   ├─ src/
│   │   ├─ index.ts
│   │   ├─ routes/
│   │   └─ middlewares/
│   └─ prisma/          # Prisma schema & migrations
├─ frontend/            # React renderer (web & Electron UI)
│   ├─ src/
│   │   ├─ index.tsx
│   │   ├─ App.tsx
│   │   ├─ routes/      # React Router routes per module
│   │   ├─ components/  # Shared UI components (layout, tables, charts)
│   │   ├─ pages/       # Page‑level components (Dashboard, Invoices…)
│   │   ├─ store/       # Zustand stores (auth, business, UI state)
│   │   ├─ hooks/       # TanStack Query hooks for API calls
│   │   └─ utils/       # Helpers (validation, formatting)
│   ├─ public/          # Static assets (icons, images)
│   └─ tailwind.config.js
├─ prisma/               # Prisma schema for SQLite (local) & PostgreSQL (cloud)
│   └─ schema.prisma
├─ scripts/              # Helper scripts (db seed, build, lint)
├─ tests/                # Jest / React Testing Library tests
├─ .env.example          # Example environment variables
└─ docs/                 # Optional design docs, API specs
    └─ architecture.md   # High‑level architecture description
```

---

## Key Concepts
- **Monorepo**: Both Electron, backend and frontend live in the same repo for easy coordination.
- **Offline‑first**: The Electron renderer talks to a local Express server that uses SQLite via Prisma. When a cloud sync token is present the server can proxy to a remote PostgreSQL instance.
- **Shared Types**: Types for API contracts, Prisma models, and client‑side DTOs are stored under `packages/types/` (if using a workspace) to guarantee type safety across layers.
- **State Management**: Global UI state (theme, sidebar collapse) lives in a Zustand store. Business data is fetched via TanStack Query with caching and automatic retries.
- **Styling**: Tailwind CSS with `shadcn/ui` components for a consistent, accessible UI. Lucide icons for visual cues.

---

## Next Steps
1. Initialise the repository and install base dependencies.
2. Scaffold the Electron main process (`electron/main.ts`).
3. Scaffold the Express backend with Prisma‑SQLite configuration.
4. Scaffold the React frontend with routing and a basic layout (sidebar + top bar).
5. Add shared TypeScript types.
6. Commit the initial project structure.

---

*This file will be kept up‑to‑date as the project evolves.*
