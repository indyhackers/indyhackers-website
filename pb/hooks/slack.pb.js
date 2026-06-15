/// <reference path="../pb_data/types.d.ts" />

// Slack community onboarding.
//
// Backs the /slack page on the website and replaces the old standalone
// `slackin` Node service (abandoned upstream, dozens of known CVEs in its
// dependency tree). Two routes:
//
//   GET  /api/slack/config  — public config the join form needs (org name,
//                             reCAPTCHA site key, permitted channels). No secrets.
//   POST /api/slack/invite  — verifies reCAPTCHA (when configured) and asks Slack
//                             to email the visitor an invite.
//
// Configure via env:
//   SLACK_API_TOKEN     Slack token with admin scope (required to send invites)
//   SLACK_SUBDOMAIN     the *.slack.com subdomain, e.g. "indyhackers"
//   SLACK_CHANNELS      optional comma-separated channel names to offer / allow
//   RECAPTCHA_SITE_KEY  Google reCAPTCHA v2 site key (public, sent to the browser)
//   RECAPTCHA_SECRET    Google reCAPTCHA v2 secret (server-side verification)
//
// When RECAPTCHA_SECRET is unset the captcha check is skipped — convenient for
// local dev, but set it in production or the invite endpoint can be abused to
// spam invitations.

const splitChannels = (v) =>
    String(v || "")
        .split(",")
        .map((s) => s.trim().replace(/^#/, ""))
        .filter(Boolean)

// Public config for the join form. Deliberately exposes only non-secret values.
routerAdd("GET", "/api/slack/config", (e) => {
    return e.json(200, {
        org: $os.getenv("SLACK_SUBDOMAIN") || "",
        siteKey: $os.getenv("RECAPTCHA_SITE_KEY") || "",
        channels: splitChannels($os.getenv("SLACK_CHANNELS")),
    })
})

routerAdd("POST", "/api/slack/invite", (e) => {
    const body = e.requestInfo().body || {}
    const email = String(body.email || "").trim()
    const channel = String(body.channel || "").trim().replace(/^#/, "")
    const captchaResponse = String(body["g-recaptcha-response"] || "")

    // Basic email-shape check (Slack does the authoritative validation).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestError("Please enter a valid email address.")
    }

    // If channels are configured, only allow ones on the list.
    const allowed = splitChannels($os.getenv("SLACK_CHANNELS"))
    if (channel && allowed.length && !allowed.includes(channel)) {
        throw new BadRequestError("That channel isn't available.")
    }

    // Verify reCAPTCHA when a secret is configured.
    const secret = $os.getenv("RECAPTCHA_SECRET")
    if (secret) {
        if (!captchaResponse) {
            throw new BadRequestError("Please complete the captcha.")
        }
        const verify = $http.send({
            url: "https://www.google.com/recaptcha/api/siteverify",
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:
                "secret=" + encodeURIComponent(secret) +
                "&response=" + encodeURIComponent(captchaResponse) +
                "&remoteip=" + encodeURIComponent(e.realIP()),
            timeout: 15,
        })
        if (!(verify.json && verify.json.success)) {
            throw new BadRequestError("Captcha verification failed. Please try again.")
        }
    }

    const token = $os.getenv("SLACK_API_TOKEN")
    const org = $os.getenv("SLACK_SUBDOMAIN")
    if (!token || !org) {
        console.error("[slack] SLACK_API_TOKEN / SLACK_SUBDOMAIN not configured")
        throw new BadRequestError(
            "Slack invites aren't set up yet. Please reach out to an organizer."
        )
    }

    // Ask Slack to email an invite. Uses the legacy users.admin.invite endpoint
    // (the same call the old slackin used) with the token in the Authorization
    // header; the token must belong to an admin account.
    let form = "email=" + encodeURIComponent(email) + "&resend=true"
    if (channel) {
        form +=
            "&channels=" + encodeURIComponent(channel) +
            "&ultra_restricted=1&set_active=true"
    }

    const res = $http.send({
        url: "https://" + org + ".slack.com/api/users.admin.invite",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + token,
        },
        body: form,
        timeout: 15,
    })

    if (res.statusCode !== 200) {
        console.error("[slack] invite HTTP " + res.statusCode + ": " + res.raw)
        throw new BadRequestError("Slack didn't accept the request. Please try again later.")
    }

    const data = res.json || {}
    if (data.ok) {
        return e.json(200, { ok: true, msg: "Invite sent — check your email!" })
    }

    // Slack returns HTTP 200 with ok:false + an error code; map the common ones.
    switch (data.error) {
        case "already_invited":
            return e.json(200, {
                ok: true,
                msg: "You've already been invited — check your email (and spam folder).",
            })
        case "already_in_team":
        case "already_in_team_invited_user":
            return e.json(200, {
                ok: true,
                alreadyMember: true,
                msg: "You're already on the team!",
                url: "https://" + org + ".slack.com",
            })
        case "missing_scope":
            console.error("[slack] token is missing the admin scope")
            throw new BadRequestError(
                "Slack invites are misconfigured (the token needs admin scope)."
            )
        default:
            console.error("[slack] invite error: " + data.error)
            throw new BadRequestError(
                "Couldn't send the invite: " + (data.error || "unknown error") + "."
            )
    }
})
