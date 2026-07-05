# PR Notes for working on [Fix tests and add to the CI
#73](https://github.com/orgs/indyhackers/projects/2/views/1?pane=issue&itemId=208853224&issue=indyhackers%7Cindyhackers-website%7C73)

:warning: Remove this pre-PR, but in the meantime record regularly 

# Cursor Changes

- [ ] rules, skills, etc.

# First Time Setup Changes
- [x] added .example.env to readme

## CHANGELOG.md
- [ ] Decide: Should we keep this? Remove it? How out of date is it?

## CONTRIBUTING.md

- [ ] add basic contribuing steps
- [ ] Add a note about the new `[#community-projects] Website Project Board` github issues project
    - This centralizes the work the #community-projects slack group tackles for the website
    - Anyone is welcome to contribute and interact through issues or projects
    - You do not have to be a part of the #community-projects slack channel to make improvements

# Add a Decisions directory

- [ ] Should we do this?
- [ ] Add a decisions directory to document the major decisions
- [ ] Add a template for major deciions

# Vitest changes

- [ ] fix all failing tests
- [ ] Refactor to co-location and document
- [ ] Add to CI

# Playwright changes

- [x] Add a `--ui` command for playwright (`test:e2e:ui` in package.json)
    - [x] Document its usage, and fix playwright instructions in README.md
- [x] Move to headless playwright, with an override command (`test:e2e:headed`)
    - Default `headless: true` in playwright.config.js; headed via `npm run test:e2e:headed`
    - README and CLAUDE.md updated with local vs CI workflows and new scripts
- [ ] fix all failing tests—Are these failing because my local isn't running correctly... or cause tests aren't part of CI and became stale
- [ ] Add to CI
