/// <reference path="../pb_data/types.d.ts" />

// Legacy slack.indyhackers.org -> www.indyhackers.org/slack redirect.
//
// The Slack-invite functionality used to live in a separate `slackin` Node app
// behind slack.indyhackers.org. It now lives at /slack in this site (see
// slack.pb.js + the SPA route). Once the Cloudflare tunnel for that subdomain
// is re-pointed at this app, this global middleware catches any request whose
// Host is the slack subdomain and redirects it to the canonical /slack page so
// old links keep working.
//
// Env (both optional):
//   SLACK_REDIRECT_HOST    Host that should be redirected
//                          (default "slack.indyhackers.org")
//   SLACK_REDIRECT_TARGET  Absolute URL to redirect to
//                          (default "https://www.indyhackers.org/slack")

routerUse((e) => {
    const fromHost = ($os.getenv("SLACK_REDIRECT_HOST") || "slack.indyhackers.org").toLowerCase()
    const target = $os.getenv("SLACK_REDIRECT_TARGET") || "https://www.indyhackers.org/slack"

    // e.request.host may include a port (e.g. in local testing); strip it and
    // compare case-insensitively.
    const host = (e.request.host || "").toLowerCase().split(":")[0]

    if (host === fromHost) {
        // 302 (temporary) so browsers don't cache the mapping — makes it easy to
        // change or retire this redirect later. Switch to 301 if it's permanent.
        return e.redirect(302, target)
    }

    return e.next()
})
