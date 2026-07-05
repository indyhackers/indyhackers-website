# GitHub Actions — maintainer notes

Repo admins configure secrets and workflows here. Contributors do not need this for local development.

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

- **Fork PRs:** GitHub does not expose repository secrets to `pull_request` workflows from forks. Tests still run; Slack notification is skipped. Same-repo branches work normally.
- **Cache expiry:** inactive PR caches may expire after ~7 days; a very stale PR could notify again on the next green CI run.

## Deploy notifications

Deploy jobs use a separate secret, `SLACK_NOTIFY_WEBHOOK`, passed into [`workflows/cd.yaml`](workflows/cd.yaml) on push to `main` or `dev`.
