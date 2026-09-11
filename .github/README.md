# GitHub Actions — maintainer notes

Repo admins configure secrets and workflows here. Contributors do not need this for local development.

## When jobs run

See [`workflows/ci.yaml`](workflows/ci.yaml):

- **Vitest and Playwright** run on `pull_request` only.
- **Docker build / deploy** runs on push to `main` or `dev` only — those pushes do not re-run the test jobs (tests are assumed green from the merged PR).

Direct pushes that bypass a PR therefore also bypass Vitest/Playwright.

## PR notifications (`#community-projects`)

When a pull request targets `dev`, is not a draft, and both CI test jobs (Vitest and Playwright) pass, the `notify-community-projects` job in [`workflows/ci.yaml`](workflows/ci.yaml) posts once to `#community-projects`.

### Setup

1. In Slack, create an [Incoming Webhook](https://api.slack.com/messaging/webhooks) scoped to `#community-projects`.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `SLACK_COMMUNITY_PROJECTS_WEBHOOK`
4. Value: the webhook URL from step 1

### Behavior

- Fires only after **both** `vitest` and `playwright` jobs succeed.
- Skips draft PRs until marked ready for review.
- Notifies **once per PR** (GitHub Actions cache keyed by PR number).
- PRs targeting branches other than `dev` are ignored.

### Limitations

- **Fork PRs / missing secret:** GitHub does not expose repository secrets to `pull_request` workflows from forks, so the webhook env is empty. The notify job succeeds but skips the Slack post (same when `SLACK_COMMUNITY_PROJECTS_WEBHOOK` is unset). Same-repo branches with the secret configured still fail the job if `curl` errors — that is a real delivery failure.
- **Cache expiry:** inactive PR caches may expire after ~7 days; a very stale PR could notify again on the next green CI run.

## Deploy notifications

Deploy jobs use a separate secret, `SLACK_NOTIFY_WEBHOOK`, passed into [`workflows/cd.yaml`](workflows/cd.yaml) on push to `main` or `dev`.
