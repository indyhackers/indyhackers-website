# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IndyHackers Redux — a Vue 3 + PocketBase community site for Indianapolis tech. Frontend built with Vite, Bootstrap 5 / Bootstrap-Vue-Next, and Pinia. Backend is PocketBase (Go-based BaaS with SQLite). JavaScript only (no TypeScript).

## Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
npm run test:vitest      # Vitest watch mode
npm run test:vitest:ci   # Vitest single run (CI)
npm run test:e2e     # Playwright e2e tests headless (install browsers first: npx playwright install)
npm run test:e2e:ui  # Playwright interactive UI (local dev)
npm run test:e2e:headed  # Playwright with visible browser windows
```

Run a single Vitest file: `npx vitest run src/components/jobs/JobListing.test.js`
Run a single e2e test: `npm run test:e2e -- --project=chromium e2e/some.spec.js`

CI runs `vitest` and `playwright` jobs on pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md#testing).

Docker/Task commands for local PocketBase development:
```bash
task run-dev         # Run PocketBase + Vue with hot reload via docker-compose
task build-dev       # Build dev Docker image
```

## Architecture

### Dual-Mode Development (MSW Mocking)

The app runs in two modes:
- **Development**: MSW (Mock Service Worker) intercepts all PocketBase API calls. No backend needed.
- **Production**: Real PocketBase backend.

Mock data lives in `src/mocks/mocks.json`. To update it: edit data in PocketBase admin UI → run `export-mocks` command in the container → copy `pb/hooks/mocks.json` to `src/mocks/mocks.json`.

### Key Directories

- `src/components/` — Vue components organized by feature (`jobs/`, `sponsors/`, `about/`)
- `src/views/` — Route-level page components
- `src/composables/` — Vue composables (`useCalendar`, `useNewsletter`)
- `src/mocks/` — MSW handlers and shared mock data
- `src/stores/` — Pinia stores
- `pb/hooks/` — PocketBase server-side JS hooks (`.pb.js` files; `.pb.js.dev` suffix = dev-only, stripped in production)
- `pb/migrations/` — PocketBase schema migrations (auto-generated when editing schema in admin UI)

### Important Patterns

- **PocketBase client** is injected globally via `app.provide('pocketbase', pocketbase)` — access with `inject('pocketbase')` in Composition API or `this.pocketbase` in Options API
- **Component auto-import**: Bootstrap-Vue-Next components and Iconify icons (`~icons/fa/*`, `~icons/carbon/*`, `~icons/mdi/*`) are available without explicit imports via `unplugin-vue-components`
- **OmniController** (`src/components/OmniController.vue`): Generic CRUD controller for any PocketBase collection
- **TipTap editor**: Used for rich text job descriptions
- **Path alias**: `@/` maps to `./src/`

### Code Style

- No semicolons, single quotes, 100-char line width (see `.prettierrc.json`)
- Vue 3 Composition API preferred; some legacy Options API components exist
- SCSS for styling, organized by feature in `src/styles/`

### Environment Variables

- `VITE_GOOGLE_CALENDAR_API_KEY` — required for Google Calendar event fetching
- Copy `.env.example` to `.env` for local development
