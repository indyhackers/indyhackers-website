# PR Notes for working on [Fix tests and add to the CI
#73](https://github.com/orgs/indyhackers/projects/2/views/1?pane=issue&itemId=208853224&issue=indyhackers%7Cindyhackers-website%7C73)

:warning: Remove this pre-PR, but in the meantime record regularly 

# VS Code

- [ ] Add suggested plugins, etc.?

# Documentation Changes

- [ ] Grab what Andrew sent in slack and update the first time setup for running with an actual pocketbase so backend work can happen

# Cursor Changes

- [ ] rules, skills, etc.

# First Time Setup Changes
- [x] added .example.env to readme

## CHANGELOG.md
- [x] **Removed** — see rationale below (for PR description)

### Rationale (for PR)

**What we did:** Deleted `CHANGELOG.md`.

**Why:**
- The file was written once at project bootstrap (Oct 2024) and never maintained. It described WIP/planning state ("working on OmniController", "TBD") rather than shipped changes.
- ~192 commits and dozens of merged PRs since then are undocumented (events/calendar, SEO, job emails, design refresh, PocketBase upgrades, etc.).
- This repo is a continuously deployed website, not a published library: no semver, no git tags, no GitHub Releases, deployments keyed to commit SHA.
- Nothing linked to the file (README, CI, CONTRIBUTING).
- For a volunteer community project, a stale doc creates false expectations and maintenance debt with no clear consumer.

**Where change history lives instead:**
- Git history and merged PR descriptions
- GitHub Issues and the [#community-projects Website Project Board](https://github.com/orgs/indyhackers/projects/2)
- (Future) `CONTRIBUTING.md` will point contributors to those sources

**If we need user-facing release notes later:** use GitHub Releases or Slack announcements tied to deploy milestones — not a hand-maintained dev changelog unless someone commits to owning it.

## CONTRIBUTING.md

- [x] add basic contributing steps + Testing section (co-located `*.test.js`, Vitest scripts, CI triggers)
- [x] Add a note about the new `[#community-projects] Website Project Board` github issues project
    - This centralizes the work the #community-projects slack group tackles for the website
    - Anyone is welcome to contribute and interact through issues or projects
    - You do not have to be a part of the #community-projects slack channel to make improvements
- [x] What other best practices do we need to include here?
    - Vitest vs Playwright guide added (when to use each, selectors, date-sensitive e2e vs Vitest, CI jobs)

# Add a Decisions directory

- [ ] Should we do this? Nothing we've done so far is large enough that it needs recorded; the rest are documented preferences in [CONTRIBUTING.md](./CONTRIBUTING.md)
    - [ ] Add a decisions directory to document the major decisions
    - [ ] Add a template for major deciions

# Vitest changes

- [x] fix all existing failing tests
- [x] Refactor to co-location (`*.test.js`) and document in CONTRIBUTING.md
- [x] Add to CI — `vitest` job on `pull_request` only; Docker build/deploy on push to `main`/`dev`
- [x] Deferring expanding coverage to follow-ups
- [ ] Refactor tests to use testing-library, reduce the brittle nature of tests, etc.
    - Add rationale to CONTRIBUTING, refactor existing tests

# Playwright changes

- [x] Add a `--ui` command for playwright (`test:e2e:ui` in package.json)
    - [x] Document its usage, and fix playwright instructions in README.md
- [x] Move to headless playwright, with an override command (`test:e2e:headed`)
    - Default `headless: true` in playwright.config.js; headed via `npm run test:e2e:headed`
    - README and CLAUDE.md updated with local vs CI workflows and new scripts
- [x] fix all failing tests — stale Vue-scaffold specs (`vue.spec.js`, `login.spec.js`, `signup.spec.js`) deleted; replaced with `e2e/smoke.spec.js` (5 smoke tests). Failures were wrong port/expectations, not missing local DB.
    - Calendar smoke test asserts page shell + static MSW topic filters (not upcoming event titles, which are date-sensitive)
- [x] Add to CI — `playwright` job on `pull_request`; Chromium only; uses `vite dev` (MSW required for jobs/calendar smoke tests, not `vite preview`)

# Lint, etc.

- [x] Are there any existing lints, etc. setup?
    - **Local only:** ESLint (`.eslintrc.cjs`) + Prettier (`.prettierrc.json`); `npm run lint` (with `--fix`) and `npm run format` (writes `src/` only). Documented in README.md and CLAUDE.md; VS Code recommends ESLint + Prettier extensions.
    - **Not enforced:** no CI lint step, no git hooks, no mention in CONTRIBUTING.md.
    - **Current violation count** (ESLint without `--fix`, same scope as `npm run lint`): **185 errors, 0 warnings**
        - `pb/hooks/` + `pb/migrations/` (~172): false positives — PocketBase globals (`$app`, `routerAdd`, `migrate`, etc.) not declared to ESLint
        - `scripts/` (7): `process` not defined in `lighthouse-*.mjs`
        - `src/` (6): real frontend issues — unused components in `AuthPageLayout.vue` (4), unused var in `SponsorList.vue` (1), empty destructuring in `handlers.js` (1)
- [ ] **Defer to a clean follow-up PR** — don't bundle with #73
    - [ ] Exclude or add PocketBase globals for `pb/hooks/` and `pb/migrations/` (or separate ESLint config)
    - [ ] Add `node` env for `scripts/` (or exclude)
    - [ ] Fix the 6 `src/` violations
    - [ ] Add `lint:ci` script (no `--fix`) and a CI job step
    - [ ] Document lint/format in CONTRIBUTING.md

# CI comms

- [ ] If a PR is opened against dev use a github incomming webhook to post a message to #committee-website channel  (maybe only do this once tests are passing? Think through this)
