# indy-hackers-redux

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Environment Variables

```sh
cp .env.example .env
```

See `.env.example` for what each variable does and which are optional.

#### Getting a Google Calendar API Key

> :warning: *Optional for dev unless directly testing Google Calendar features.*

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
  - Go to "APIs & Services" > "Library"
  - Search for "Google Calendar API"
  - Click "Enable"
4. Create credentials:
  - Go to "APIs & Services" > "Credentials"
  - Click "Create Credentials" > "API Key"
  - Copy the generated API key
5. (Optional) Restrict the API key:
  - Click on the API key you just created
  - Under "API restrictions", select "Restrict key"
  - Select "Google Calendar API" from the dropdown
  - Under "Website restrictions", add your domain(s)
6. Paste the API key into your `.env` file

### Compile and Hot-Reload for Development

```sh
npm run dev
```

By default, `npm run dev` uses [MSW](https://mswjs.io/) to mock PocketBase API calls — no backend container required. See [Backend development (PocketBase)](#backend-development-pocketbase) when you need a real PocketBase instance (hooks, migrations, roles, Slack, admin screens).

### Backend development (PocketBase)

Use real PocketBase when working on server-side hooks, schema migrations, collection rules, Slack invites, roles, or the admin UI. The Vite dev server with MSW never talks to PocketBase — it intercepts all `/api` calls with mocks.

#### Option A — docker-compose (recommended)

Use this when you want parity with the project's Docker setup (dev hooks, volumes, same image as deploy). You may need to replace `docker-compose` with `docker compose`.

```sh
npm run build                              # populates ./dist → PocketBase public dir
VERSION=dev docker-compose up --build
```

- Admin UI: `http://localhost:8090/_/` (**trailing slash required** — `/_` without it will not work)
- Port `8090`; mounts `pb/hooks`, `pb/migrations`, and `pb/data` (data persists in `./pb/data`)
- **Linux / amd64:** use the command above (`TARGETARCH` defaults to `amd64` in `docker-compose.yaml`)
- **Apple Silicon:** `task run-dev` / `task build-dev` work but hardcode `TARGETARCH=arm64` in `Taskfile.yml` — on Linux, use the `docker-compose` command above instead

#### Option B — bare PocketBase binary (alternative, no Docker, untested)

Use this for the fastest native backend loop when you don't want Docker — hook edits, migrations, admin UI, `apply-mocks`. Prefer Option A when you need dev-only hooks (`.pb.js.dev` → `.pb.js`), which run through the dev Docker image.

Download [PocketBase 0.39.4](https://github.com/pocketbase/pocketbase/releases/tag/v0.39.4) (matches `PB_VERSION` in the Dockerfile), then from the repo root (after `npm run build`):

```sh
pocketbase serve \
  --dir=pb/data \
  --hooksDir=pb/hooks \
  --migrationsDir=pb/migrations \
  --publicDir=dist
```

Admin UI: `http://127.0.0.1:8090/_/`

#### Option C — Vite hot reload against real PocketBase

For full-stack work with hot-reloading frontend pointed at real data:

1. Start PocketBase (Option A or B above)
2. Set `VITE_USE_MSW=false` in `.env` (or run `npm run dev:backend`)
3. Open `http://localhost:5173` — API calls proxy to PocketBase on `:8090`
4. PocketBase admin UI remains at `http://localhost:8090/_/` (not on the Vite port)

#### First-run admin login

On first boot, migrations auto-apply and seed a superuser ([`pb/migrations/001_add_admin.js`](pb/migrations/001_add_admin.js)):

- Email: `admin@indyhackers.org`
- Password: `go west, young hackie, hack the planet !`

Change that password immediately after first login. Assign roles via Collections → roles / users in the admin UI.

#### Dev hooks, migrations, and mock data

- **Dev hooks:** docker-compose sets `PB_ENV=development`; an entry hook renames `*.pb.js.dev` → `*.pb.js` in dev. Hooks with the `.dev` suffix are not installed in production (they can exfiltrate data).
- **Schema migrations:** editing the schema in the admin UI auto-generates migrations in `pb/migrations`.
- **Mock export workflow:** after adding test records in the admin UI, export and sync mock data:
  ```sh
  docker exec -it pocketbase /usr/local/bin/pocketbase --hooksDir /pb_hooks --dir /pb_data export-mocks
  cp pb/hooks/mocks.json src/mocks/mocks.json   # commit both to keep MSW in sync
  ```
  Import with the `apply-mocks` subcommand inside the container. For now, ignore `.dev` extension removals in git when committing hook changes.

### Compile and Minify for Production

```sh
npm run build
```

### Run Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:vitest      # watch mode
npm run test:vitest:ci   # single run (matches CI on PRs)

# one file
npx vitest run src/components/jobs/JobListing.test.js
```

Test conventions (co-located `*.test.js`, patterns): [CONTRIBUTING.md](CONTRIBUTING.md#testing).

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# Local: headless run (starts vite dev automatically; no build needed)
npm run test:e2e

# Local: interactive UI for writing/debugging tests
npm run test:e2e:ui

# Local: visible browser windows (debugging locators or visuals)
npm run test:e2e:headed

# Match CI: Chromium only (CI also sets this via playwright.config.js)
CI=true npm run test:e2e

# Runs the tests only on Chromium (local shortcut)
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- e2e/smoke.spec.js
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```