# Configuration required before deploy

This covers everything the Slack join page, the invite approval queue, the admin
tools, and Google login need in order to work in a deployed environment. All of
it is environment/admin configuration — the code and schema migrations ship in
this PR and apply automatically.

> All `SLACK_*`, `RECAPTCHA_*`, `GOOGLE_OAUTH_*` and notification variables are
> read by the **PocketBase backend** (the `pb/hooks/*.pb.js` files), not the Vite
> frontend. Set them on the PocketBase container/service environment.

## 1. Slack invites

| Variable          | Required | Purpose |
| ----------------- | -------- | ------- |
| `SLACK_API_TOKEN` | yes      | Slack token with **admin** scope; used to send `users.admin.invite`. |
| `SLACK_SUBDOMAIN` | yes      | The `*.slack.com` subdomain, e.g. `indyhackers`. |

Without these, approved invites record an error instead of sending.

## 2. Anti-spam: reCAPTCHA + rate limiting

| Variable             | Required | Purpose |
| -------------------- | -------- | ------- |
| `RECAPTCHA_SITE_KEY` | prod     | Google reCAPTCHA **v2** site key (public, sent to the browser). |
| `RECAPTCHA_SECRET`   | prod     | reCAPTCHA v2 secret (server-side verification). |
| `SLACK_RATE_PER_HOUR`| no       | Max invite requests per IP per hour (default `5`). |
| `SLACK_AUTOAPPROVE`  | no       | `off` routes **every** request to the review queue. |

**If `RECAPTCHA_SECRET` is unset the captcha check is skipped** (handy in dev,
unsafe in prod). Get keys at https://www.google.com/recaptcha/admin (reCAPTCHA v2
"I'm not a robot").

### Auto-approval note
Low-risk requests (US country via Cloudflare's `CF-IPCountry` header +
non-disposable email + captcha pass) are invited immediately; everything else is
queued. Country detection relies on the site being served **behind Cloudflare**.
Indiana state-level auto-approval is intentionally **not** implemented (it needs a
paid geo-IP API and is unreliable at state granularity).

## 3. Board notifications (optional)

| Variable             | Purpose |
| -------------------- | ------- |
| `SLACK_REVIEW_EMAIL` | Email address that gets pending-request notifications (falls back to `JOB_NOTIFY_EMAIL`, then the configured sender). |
| `SLACK_WEBHOOK_URL`  | Optional Slack incoming-webhook URL to ping the board about pending requests. |

Email delivery requires PocketBase's mail settings (sender address) to be
configured in the admin console.

## 4. Admin access (board members)

Admin tools live under `/admin` (`/admin/slack-invites`, `/admin/jobs`). Access is
gated to signed-in users who have the **`admin` role**:

1. The user signs up / logs in at `/login`.
2. In the PocketBase admin console, give that user the `admin` role (the `roles`
   relation on the `users` collection — the same role the job rules already use).

Logged-out users are sent to `/login`; logged-in non-admins to `/not-authorized`.

## 5. Google login (OAuth2)

| Variable                     | Required | Purpose |
| ---------------------------- | -------- | ------- |
| `GOOGLE_OAUTH_CLIENT_ID`     | for Google login | OAuth 2.0 client ID. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | for Google login | OAuth 2.0 client secret. |

Setup steps:

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID**
   → Application type **Web application**.
2. Add an **Authorized redirect URI**: `https://<your-domain>/api/oauth2-redirect`
   (PocketBase serves this callback). One entry per deployed domain.
3. Put the client ID/secret in the env vars above. `pb/hooks/oauth.pb.js` wires the
   provider into the `users` collection at startup; the login page shows the Google
   button automatically once `auth-methods` reports it.

> The redirect URI must match exactly, so Google login can only be tested on a
> stable domain — not the rotating preview tunnel.

## 6. Migrations (automatic)

These apply on PocketBase startup; no manual step:

- `019_create_slack_invites.js` — the invite approval queue collection.
- `020_add_meta_to_users.js` — `meta` JSON field on users (stores OAuth profile;
  required for Google login to complete).
