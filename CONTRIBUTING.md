# Contributing to IndyHackers Website

Thanks for helping improve the site. This is a living document—update it when process changes.

## Getting started

1. Clone the repo.
    - No push access? Fork it on GitHub, then clone your fork.
2. Follow [README.md](README.md) for install, env setup, and local dev.
3. Branch from `dev` (ideally linked to a github issue)
4. Work locally until satisfied (don't forget tests!)
5. Open a PR agains `dev`

The [#community-projects Website Project Board](https://github.com/orgs/indyhackers/projects/2) is where that group tracks and prioritizes website work—you do not need to use it to contribute. Open an issue or PR anytime; Slack membership is not required.

## Pull requests

- Smaller PRs are easier to review, but use whatever scope fits your change.
- Run tests locally before opening a PR — commands in [README.md](README.md#run-tests-with-vitest).
- Ensure CI passes on your PR — see [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml) for what runs when.

## Testing

Commands: [README.md — Vitest](README.md#run-tests-with-vitest) and [Playwright](README.md#run-end-to-end-tests-with-playwright). CI: [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml).

**Vitest:** co-locate `*.test.js` beside the file under test (e.g. `LoginPage.vue` + `LoginPage.test.js`).

**Playwright e2e:** `e2e/*.spec.js` — different tool, different suffix.

**Date-sensitive tests:** calendar helpers and views assume “today” is mid-June 2026. Use `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2026-06-14T12:00:00-04:00'))` when testing upcoming-event logic (see `useEvents.test.js`).

**PocketBase in component tests:** use `fakePocketBase()` from `src/mocks/fakePocketBase.js` for calendar-related components, or mock `$pocketbase` / `inject('pocketbase')` as other job tests do.

