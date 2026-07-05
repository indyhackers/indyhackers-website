/// <reference path="../pb_data/types.d.ts" />

// Slack community onboarding with a board-reviewed approval queue.
//
// Replaces the abandoned `slackin` Node service. Flow:
//   GET  /api/slack/config  — public, non-secret config for the join form.
//   POST /api/slack/invite  — runs spam filters + reCAPTCHA, then creates a
//                             `slack_invites` row. Low-risk requests (US IP +
//                             non-disposable email + captcha pass) are created
//                             "approved" and invited immediately; everything
//                             else is "pending" for a board member to review on
//                             the /admin/slack-invites screen.
// A hook below sends the actual Slack invite whenever a row becomes "approved"
// (whether auto-approved or approved by hand), so there's a single code path.
//
// Env:
//   SLACK_API_TOKEN     Slack token with admin scope (required to send invites)
//   SLACK_SUBDOMAIN     the *.slack.com subdomain, e.g. "indyhackers"
//   RECAPTCHA_SITE_KEY  Google reCAPTCHA v3 site key (public)
//   RECAPTCHA_SECRET    Google reCAPTCHA v3 secret (server-side verification)
//   RECAPTCHA_MIN_SCORE v3 score below which a request is treated as suspicious
//                       and sent to the review queue instead of auto-approved
//                       (default 0.5; range 0.0–1.0)
//   SLACK_REVIEW_EMAIL  where to email the board about pending requests
//                       (falls back to JOB_NOTIFY_EMAIL, then the sender)
//   SLACK_WEBHOOK_URL   optional Slack webhook for pending-request pings
//   SLACK_AUTOAPPROVE   "off" disables auto-approval (everything queues)
//   SLACK_RATE_PER_HOUR max invite requests per IP per hour (default 5)

// Constants and helpers (EMAIL_RE, isDisposable, sendSlackInvite, notifyBoard)
// live in slack_util.js and are require()'d INSIDE each handler below —
// PocketBase runs handlers in isolated runtimes that can't see this file's
// module scope, so top-level declarations aren't visible at request time.

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/slack/config", (e) => {
    return e.json(200, {
        org: $os.getenv("SLACK_SUBDOMAIN") || "",
        siteKey: $os.getenv("RECAPTCHA_SITE_KEY") || "",
    })
})

routerAdd("POST", "/api/slack/invite", (e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const info = e.requestInfo()
    const body = info.body || {}
    const email = String(body.email || "").trim().toLowerCase()
    const captchaResponse = String(body["g-recaptcha-response"] || "")
    const honeypot = String(body.website || "").trim()

    // Honeypot: real users never fill the hidden "website" field. Pretend it
    // worked so bots don't learn they were caught, but create nothing.
    if (honeypot) {
        return e.json(200, { ok: true, pending: true, msg: "Thanks! Your request is in." })
    }

    if (!util.EMAIL_RE.test(email)) {
        throw new BadRequestError("Please enter a valid email address.")
    }
    if (util.isDisposable(email)) {
        throw new BadRequestError("Please use a non-disposable email address.")
    }

    const ip = e.realIP()
    const headers = info.headers || {}
    const country = String(headers["cf-ipcountry"] || "").toUpperCase()
    const userAgent = String(headers["user_agent"] || headers["user-agent"] || "")

    // Rate limit per IP.
    const perHour = parseInt($os.getenv("SLACK_RATE_PER_HOUR") || "5", 10)
    if (ip) {
        const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        try {
            const recent = $app.findRecordsByFilter(
                "slack_invites",
                "ip = {:ip} && created >= {:cutoff}",
                "-created",
                perHour + 1,
                0,
                { ip, cutoff }
            )
            if (recent.length >= perHour) {
                throw new BadRequestError("Too many requests. Please try again later.")
            }
        } catch (err) {
            if (err instanceof BadRequestError) throw err
            console.error("[slack] rate-limit check failed: " + err)
        }
    }

    // Don't re-queue an email that's already approved/invited or waiting.
    try {
        const existing = $app.findFirstRecordByFilter("slack_invites", "email = {:email}", { email })
        if (existing) {
            const st = existing.getString("status")
            if (st === "approved") {
                return e.json(200, { ok: true, msg: "You've already been invited — check your email for an invitation, or email admin@indyhackers.org if you need assistance." })
            }
            if (st === "pending") {
                return e.json(200, {
                    ok: true,
                    pending: true,
                    msg: "Your request is already in the queue — hang tight for approval.",
                })
            }
            // rejected → fall through and let them try again
        }
    } catch (_) {
        // no existing record; continue
    }

    // reCAPTCHA v3 (only enforced when a secret is configured). Unlike v2,
    // v3 returns a risk `score` instead of a pass/fail checkbox: an invalid or
    // expired token (or the wrong action) is a hard reject, but a valid token
    // with a low score doesn't fail outright — it just loses the auto-approve
    // fast path and falls to the human review queue below.
    const secret = $os.getenv("RECAPTCHA_SECRET")
    let captchaOk = false
    if (secret) {
        if (!captchaResponse) {
            throw new BadRequestError("Captcha check failed. Please try again.")
        }
        const verify = $http.send({
            url: "https://www.google.com/recaptcha/api/siteverify",
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:
                "secret=" + encodeURIComponent(secret) +
                "&response=" + encodeURIComponent(captchaResponse) +
                "&remoteip=" + encodeURIComponent(ip),
            timeout: 15,
        })
        const result = verify.json || {}
        // Invalid/expired token, or a token minted for a different action → reject.
        if (!result.success || (result.action && result.action !== "slack_invite")) {
            throw new BadRequestError("Captcha verification failed. Please try again.")
        }
        // v3 always returns a score; v2 tokens (no score) still pass here so a
        // key swap doesn't hard-break. Low score → not "ok" → review queue.
        const rawMin = parseFloat($os.getenv("RECAPTCHA_MIN_SCORE"))
        const minScore = isNaN(rawMin) ? 0.5 : rawMin
        captchaOk = typeof result.score !== "number" || result.score >= minScore
    }

    // Risk signals → auto-approve decision. Auto-approve only low-risk requests;
    // everything else queues for a human. Auto-approval can be disabled via env.
    const autoApproveEnabled = String($os.getenv("SLACK_AUTOAPPROVE") || "").toLowerCase() !== "off"
    const signals = {
        country: country || "unknown",
        is_us: country === "US",
        disposable: false,
        captcha_ok: secret ? captchaOk : "not_configured",
    }
    const autoApprove =
        autoApproveEnabled && country === "US" && (!secret || captchaOk)

    const collection = $app.findCollectionByNameOrId("slack_invites")
    const record = new Record(collection)
    record.set("email", email)
    record.set("status", autoApprove ? "approved" : "pending")
    record.set("auto", autoApprove)
    record.set("ip", ip)
    record.set("country", country)
    record.set("user_agent", userAgent)
    record.set("signals", signals)
    $app.save(record)

    if (autoApprove) {
        return e.json(200, { ok: true, msg: "Invite sent — check your email!" })
    }
    return e.json(200, {
        ok: true,
        pending: true,
        msg: "Thanks! Your request is in. Someone on staff will approve it shortly and you'll receive an email invite from Slack.",
    })
})

// ---------------------------------------------------------------------------
// Invite delivery — single path, fired whenever a row becomes "approved".
// The sendSlackInvite / notifyBoard helpers live in slack_util.js and are
// require()'d inside each handler (see the scope note at the top of this file).
// ---------------------------------------------------------------------------

onRecordAfterCreateSuccess((e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const status = e.record.getString("status")
    if (status === "approved") {
        util.sendSlackInvite(e.record)
    } else if (status === "pending") {
        util.notifyBoard(e.record)
    }
    e.next()
}, "slack_invites")

onRecordAfterUpdateSuccess((e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const was = e.record.original().getString("status")
    const now = e.record.getString("status")
    // Send the invite the moment a board member flips a row to approved.
    if (was !== "approved" && now === "approved") {
        util.sendSlackInvite(e.record)
    }
    e.next()
}, "slack_invites")
