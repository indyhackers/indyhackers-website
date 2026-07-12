# Contributing to IndyHackers Website

Thanks for helping improve the site. This is a living document—update it when process changes.

## Getting started

1. Clone the repo.
    - No push access? Fork it on GitHub, then clone your fork.
2. Follow [README.md](README.md) for install, env setup, and local dev.
3. **Backend work** (hooks, migrations, roles, admin): see [README — Backend development (PocketBase)](README.md#backend-development-pocketbase). Default `npm run dev` uses MSW mocks — no PocketBase container needed for frontend-only changes.
4. Branch from `dev` (ideally linked to a GitHub issue)
5. Work locally until satisfied (don't forget tests!)
6. Open a PR against `dev`

The [#community-projects Website Project Board](https://github.com/orgs/indyhackers/projects/2) is where that group tracks and prioritizes website work—you do not need to use it to contribute. Open an issue or PR anytime; Slack membership is not required.

## Pull requests

- Smaller PRs are easier to review, but use whatever scope fits your change.
- Run tests locally before opening a PR — commands in [README.md](README.md#run-tests-with-vitest).
- Ensure CI passes on your PR — see [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml) for what runs when. Vitest and Playwright run on pull requests only; pushes to `main`/`dev` build and deploy without re-running those tests (details: [`.github/README.md`](.github/README.md#when-jobs-run)).
- PRs targeting `dev` that pass CI notify `#community-projects` once. Maintainers: see [`.github/README.md`](.github/README.md) for webhook setup.

## Testing

We use two complementary tools: **Vitest** for fast unit and component tests, **Playwright** for a small end-to-end smoke suite. They answer different questions—Vitest catches logic and component bugs in milliseconds; Playwright confirms the app boots, routes resolve, and public pages render in a real browser.

Commands: [README.md — Vitest](README.md#run-tests-with-vitest) and [Playwright](README.md#run-end-to-end-tests-with-playwright). CI on pull requests: [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml) runs Vitest and Playwright (Chromium smoke tests).

Vitest and Playwright currently use MSW — no Docker or PocketBase container is required to run tests locally or in CI. Containerized PocketBase integration tests are tracked in [#87](https://github.com/indyhackers/indyhackers-website/issues/87).

### Vitest — default for most tests

- **Where:** co-locate `*.test.js` beside the file under test under `src/` (e.g. `LoginPage.vue` + `LoginPage.test.js`).
- **How:** runs in jsdom with MSW ([`vitest.setup.js`](vitest.setup.js)) or a PocketBase stand-in (`createFakeEventsPocketBase()` / a per-file mock) for isolated components.
- **Use for:** utilities, composables, component render and interaction, form validation, API response handling, Pinia stores.
- **Runs in CI** on every pull request (`vitest` job).

Pure functions, single components, and anything you can mock with MSW or a PocketBase stand-in belong here. These tests should give sub-second feedback during development.

### Playwright — smoke and critical paths

- **Where:** `e2e/*.spec.js` (different tool, different suffix—[`vitest.config.js`](vitest.config.js) excludes `e2e/**`).
- **Use for:** app shell loads, Vue Router resolves URLs, MSW service worker intercepts API calls in a real browser, critical public pages render.
- **Do not use for:** logic already covered by Vitest, single-component CRUD, styling details, OAuth flows, or auth success/failure flows (until MSW auth handlers exist).
- **Local:** `npm run test:e2e` — Playwright starts the Vite dev server automatically; MSW is active; no PocketBase container needed.
- **CI:** `playwright` job on pull requests — Chromium only, same dev server + MSW setup as local.
- **Debug:** `npm run test:e2e:ui` (interactive) or `npm run test:e2e:headed` (visible browser).

The smoke suite ([`e2e/smoke.spec.js`](e2e/smoke.spec.js)) covers a curated set of public routes — that file is the source of truth. At the time of writing: home, login, signup, jobs, calendar, and slack. Keep e2e small; a flaky or duplicated e2e test is worse than none.

- **Runs in CI** on every pull request (`playwright` job, Chromium only).

### When to use which

| Question | If yes → |
|----------|----------|
| Pure function or single component? | Vitest |
| Needs mocked PocketBase or API responses? | Vitest + MSW or a PocketBase stand-in |
| Spans multiple routes or needs a real browser? | Playwright |
| Would duplicate an existing Vitest test? | Don't add Playwright |

### Conventions

**Date-sensitive tests:** calendar helpers and views assume “today” is mid-June 2026 in Vitest. Use `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2026-06-14T12:00:00-04:00'))` when testing upcoming-event logic (see `useEvents.test.js`). Playwright calendar smoke asserts page shell and static topic filters from MSW—not specific upcoming event titles.

**PocketBase in component tests:** how the component reads PocketBase decides the mount wiring; how much shared seed data you need decides the mock factory.

| Component style | Wire the fake via |
|-----------------|-------------------|
| Composition API (`inject('pocketbase')`) | `global.provide: { pocketbase: … }` |
| Options API (`this.pocketbase`) | `global.config.globalProperties.pocketbase` |

| Need | Prefer |
|------|--------|
| Calendar/events UI backed by [`eventMocks.js`](src/mocks/eventMocks.js) | [`createFakeEventsPocketBase()`](src/mocks/createFakeEventsPocketBase.js) — events/topics/subscriptions only |
| Specific return values for assertions (jobs, etc.) | Small per-file `createMockPocketBase()` (see `JobListing.test.js` / `JobsList.test.js`) |

Do not grow `createFakeEventsPocketBase` into a general PocketBase fake. New features get their own helper or an inline mock.

**Playwright selectors:** prefer `getByRole` and `getByText` (user-visible, resilient to refactors). Use `#id` locators only where forms already expose stable ids. Always use relative URLs (`page.goto('/jobs')`)—never hardcode ports; Playwright's `baseURL` in [`playwright.config.js`](playwright.config.js) handles that.

### Known gaps (follow-ups)

- Auth-flow e2e is deferred until MSW auth handlers exist; Vitest covers login/signup component behavior today.
- Expanded Vitest coverage is tracked separately.
- Containerized PocketBase test fixture for CI — [#87](https://github.com/indyhackers/indyhackers-website/issues/87)
