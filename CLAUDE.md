# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IndyHackers Redux — a Vue 3 + PocketBase community site for Indianapolis tech. Frontend built with Vite, Bootstrap 5 / Bootstrap-Vue-Next, and Pinia. Backend is PocketBase (Go-based BaaS with SQLite). JavaScript only (no TypeScript).

## Commands

```bash
npm run dev          # Vite dev server (localhost:5173); proxies /api + /_ to PocketBase on :8090
npm run dev:mock     # Vite with VITE_USE_MSW=true — MSW fixtures; for reproducing e2e failures
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
# Linux / amd64 (default TARGETARCH in docker-compose.yaml):
docker-compose up -d      # required for `npm run dev` to have a backend

# Apple Silicon only — Taskfile hardcodes TARGETARCH=arm64:
task run-dev         # Run PocketBase + Vue with hot reload via docker-compose
task build-dev       # Build dev Docker image
```

See [README.md — Backend development (PocketBase)](README.md#backend-development-pocketbase) for bare-binary setup, admin login, and seeding a local database with `apply-mocks`.

## Architecture

### Local Development (single mode)

There is **one** way to develop: PocketBase on `:8090` (docker-compose) plus Vite on
`:5173`. Vite proxies `/api` and `/_` to PocketBase, so the frontend has HMR and real
data. `npm run dev` will not work without a running backend — that is intentional.

MSW is a **test fixture, not a development mode**. It only activates when
`VITE_USE_MSW=true`:
- Vitest — via the Node interceptor in `vitest.setup.js` (`src/mocks/server.js`), independent of the browser worker
- Playwright — its `webServer` runs `npm run dev:mock` on port **5174**, deliberately not 5173, so `reuseExistingServer` can't adopt a real-backend dev server and make the suite non-deterministic

Do not reintroduce a mock-by-default dev path. If a task seems to need one, the answer is
usually `apply-mocks` (seeds a real local database from the same `mocks.json`).

Mock data lives in `src/mocks/mocks.json`. To update it: edit data in PocketBase admin UI → run `export-mocks` command in the container → copy `pb/hooks/mocks.json` to `src/mocks/mocks.json`.

### Key Directories

- `src/components/` — Vue components organized by feature (`jobs/`, `sponsors/`, `about/`)
- `src/views/` — Route-level page components
- `src/composables/` — Vue composables (`useEvents`, `useNewsletter`)
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

- `VITE_USE_MSW` — `true` enables MSW. Set only by `npm run dev:mock` and Playwright; unset everywhere else.
- Events come from the PocketBase `events` collection (synced from Google
  Calendar by `pb/hooks/calendar_sync.js`), not a browser-side Google API key.
- Copy `.env.example` to `.env`. PocketBase does **not** read `.env` itself —
  `docker-compose.yaml` loads it via `env_file`, and hooks read values with
  `$os.getenv`. Running the bare binary requires `set -a; source .env; set +a` first.
