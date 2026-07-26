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

Copy `.env.example` to `.env`. The frontend itself needs no secrets, but the
variables in `.env` are loaded into the PocketBase container (`env_file` in
`docker-compose.yaml`) and read by the server-side hooks via `$os.getenv` —
`GOOGLE_API_KEY` for calendar sync, the `SLACK_*` vars for invites, and so on. A
hook that needs a missing variable fails at runtime, not at startup. Events are
synced from Google Calendar server-side, so there is no browser-side Google key.

### Compile and Hot-Reload for Development

There is one way to run the app locally: PocketBase on `:8090`, Vite on `:5173`.

```sh
docker-compose up -d          # PocketBase on :8090 (see Backend development below)
npm run dev                   # Vite + HMR on :5173
```

Open `http://localhost:5173`. Vite proxies `/api` and `/_` through to PocketBase,
so the frontend runs against real data with hot reload, and the admin UI stays at
`http://localhost:8090/_/`.

A fresh `pb/data` starts completely empty — no schema, no content. Bootstrapping
it takes two steps:

```sh
# 1. create the schema (30+ migrations)
docker exec -it pocketbase /usr/local/bin/pocketbase \
  migrate up --dir=/pb_data --migrationsDir=/pb_migrations

# 2. seed jobs, roles, and users
cp src/mocks/mocks.json pb/hooks/mocks.json      # see note below
docker exec -it pocketbase /usr/local/bin/pocketbase \
  --hooksDir /pb_hooks --dir /pb_data apply-mocks
```

**Step 1 is not automatic.** The image's `ENTRYPOINT` does not pass
`--migrationsDir`, so `docker-compose up` on an empty `pb/data` starts a server
with no collections at all — every `/api/collections/...` request returns 400.
Existing checkouts don't hit this because their `pb/data` already has the schema.

The `cp` in step 2 is likewise not optional on a fresh clone: `apply-mocks` reads
`pb/hooks/mocks.json`, which is gitignored (`.gitignore:10`) as `export-mocks`
output. The tracked copy is `src/mocks/mocks.json`.

`apply-mocks` reads `pb/hooks/mocks.json` and inserts records that don't already
exist, so it is safe to re-run. It seeds **`jobs`, `roles`, and `users` only** —
that is everything `mocks.json` contains.

**Events are not seeded.** They come from the `events` collection, which
`pb/hooks/calendar_sync.js` populates from Google Calendar, so an empty calendar
means `GOOGLE_API_KEY` and `GOOGLE_CALENDAR_ID` are missing or the sync has not
run yet. See [Environment Variables](#environment-variables).

You will see `[jobs] new-job email failed` lines during seeding. That is the
new-job notification hook finding no SMTP server configured locally; the records
still insert.

> **MSW is test-only.** [MSW](https://mswjs.io/) still backs Vitest and
> Playwright, but it no longer intercepts anything during normal development.
> `npm run dev:mock` starts Vite with `VITE_USE_MSW=true` if you need to
> reproduce an e2e failure by hand; it is not a development mode.

### Backend development (PocketBase)

PocketBase has to be running for `npm run dev` to work at all. Use Option A
unless you have a reason not to.

#### Option A — docker-compose (recommended)

Use this when you want parity with the project's Docker setup (dev hooks, volumes, same image as deploy). You may need to replace `docker-compose` with `docker compose`.

```sh
docker-compose up --build                  # --build only needed the first time
```

The image tag defaults to `dev` via `${VERSION:-dev}`; set `VERSION=` explicitly
only when building a tagged image to push. `--build` is needed after Dockerfile
or `PB_VERSION` changes — hooks, migrations, and `dist` are bind-mounted, so
edits to those take effect without rebuilding.

`./dist` is mounted as PocketBase's public dir, but you only need to
`npm run build` into it if you want PocketBase itself to serve the site at
`:8090`. For day-to-day work you use Vite on `:5173` and only PocketBase's `/api`
and `/_/` routes.

- Admin UI: `http://localhost:8090/_/` (**trailing slash required** — `/_` without it will not work)
- Port `8090`; mounts `pb/hooks`, `pb/migrations`, and `pb/data` (data persists in `./pb/data`)
- **Linux / amd64:** use the command above (`TARGETARCH` defaults to `amd64` in `docker-compose.yaml`)
- **Apple Silicon:** `task run-dev` / `task build-dev` work but hardcode `TARGETARCH=arm64` in `Taskfile.yml` — on Linux, use the `docker-compose` command above instead

#### Option B — bare PocketBase binary (alternative, no Docker, untested)

Use this for the fastest native backend loop when you don't want Docker — hook edits, migrations, admin UI, `apply-mocks`. Prefer Option A when you need dev-only hooks (`.pb.js.dev` → `.pb.js`), which run through the dev Docker image.

Download [PocketBase 0.39.4](https://github.com/pocketbase/pocketbase/releases/tag/v0.39.4) (matches `PB_VERSION` in the Dockerfile), then from the repo root:

```sh
set -a; source .env; set +a          # hooks read config via $os.getenv
pocketbase serve \
  --dir=pb/data \
  --hooksDir=pb/hooks \
  --migrationsDir=pb/migrations \
  --publicDir=dist
```

PocketBase does not read `.env` itself — the `env_file` entry in
`docker-compose.yaml` covers Option A, but running the binary directly means
exporting the variables into your shell first, as above. Without them, hooks like
`calendar_sync.js` throw `GOOGLE_API_KEY is not set`.

Admin UI: `http://127.0.0.1:8090/_/`

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
  `mocks.json` serves two purposes: `src/mocks/mocks.json` is the fixture set for
  Vitest and Playwright, and `pb/hooks/mocks.json` is what `apply-mocks` seeds a
  local database from. Keep them in sync so tests and local dev see the same data.
  For now, ignore `.dev` extension removals in git when committing hook changes.

  > **`export-mocks` output needs hand-editing before it will re-import.** It
  > serializes records with `publicExport()`, which omits fields the public API
  > hides — notably `email` on the `users` auth collection, which is required on
  > insert. A raw export therefore fails `apply-mocks` with
  > `email: cannot be blank`. The snapshot also goes stale whenever a migration
  > adds a required field, since the exported records predate it. After
  > exporting, re-run `apply-mocks` against an empty database to confirm the
  > snapshot still imports.

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
