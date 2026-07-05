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

# Local: headless run (starts vite dev automatically; no build needed)
npm run test:e2e

# Local: interactive UI for writing/debugging tests
npm run test:e2e:ui

# Local: visible browser windows (debugging locators or visuals)
npm run test:e2e:headed

# CI: build first, then run against the production preview server
npm run build
CI=true npm run test:e2e

# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- e2e/vue.spec.js
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