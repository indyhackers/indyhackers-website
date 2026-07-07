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

Copy `.env.example` to `.env`. The frontend needs no secrets for local
development — API calls are intercepted by MSW mocks (see `src/mocks/`). Events
are served by the PocketBase backend (synced from Google Calendar server-side),
so there is no browser-side Google API key. The variables in `.env.example` are
read by the PocketBase container in production; see the comments there.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Some neat things

- docker-compose sets developmentmode, build arg in Dockerfile defaults to production
- which a pocketbase entry hook detects and moves all pocketbase hooks hook.pb.js.dev => hook.pb.js in dev env
  - hooks with the dev prefix aren't installed in production (as they exfiltrate data potentially)
- while using docker-compose, you can add new test records using the pocketbase admin UI (user `admin@indyhackers.org` and password in `pb/migrations/1726527259_add_admin.js`)
- the pocketbase auto-migrate feature will create migrations in `pb/migrations` when you update the schema in the admin UI
- adding records is done by `export-mocks` and `import-mocks` subcommands
  - you can: `docker exec -it pocketbase /usr/local/bin/pocketbase --hooksDir /pb_hooks --dir /pb_data export-mocks` to dump the existing data records
  - I might be able to do this automatically, but for now if you want to commit the new mock state `cp pb/hooks/mocks.json src/mocks/mocks.json` and add to git
  - can manually run the importer with the `import-mocks` subcommand
- for now ignore `.dev` extension removals in git when time to commit

this should allow us to rapidly prototype our schemas and test data in a reliable fashion
