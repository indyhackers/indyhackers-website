# PR Notes for working on [Fix tests and add to the CI
#73](https://github.com/orgs/indyhackers/projects/2/views/1?pane=issue&itemId=208853224&issue=indyhackers%7Cindyhackers-website%7C73)

:warning: Remove this pre-PR, but in the meantime record regularly 

# VS Code

- [ ] Add suggested plugins, etc.?

# Cursor Changes

- [ ] rules, skills, etc.

# First Time Setup Changes
- [x] added .example.env to readme

## CHANGELOG.md
- [ ] Decide: Should we keep this? Remove it? How out of date is it?

## CONTRIBUTING.md

- [x] add basic contributing steps + Testing section (co-located `*.test.js`, Vitest scripts, CI triggers)
- [x] Add a note about the new `[#community-projects] Website Project Board` github issues project
    - This centralizes the work the #community-projects slack group tackles for the website
    - Anyone is welcome to contribute and interact through issues or projects
    - You do not have to be a part of the #community-projects slack channel to make improvements
- [ ] What other best practices do we need to include here?

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
- [ ] fix all failing tests—Are these failing because my local isn't running correctly... or cause tests aren't part of CI and became stale
- [ ] Add to CI

# Lint, etc.

- [ ] Are there any existing lints, etc. setup? 
