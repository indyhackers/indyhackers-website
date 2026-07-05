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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A small starter list of throwaway/temp-mail domains. Extend as needed.
const DISPOSABLE_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
    "temp-mail.org", "throwawaymail.com", "yopmail.com", "getnada.com",
    "trashmail.com", "sharklasers.com", "guerrillamailblock.com", "maildrop.cc",
    "dispostable.com", "fakeinbox.com", "mailnesia.com", "mohmal.com",
    "spam4.me", "tempr.email", "discard.email", "mailcatch.com",
]

const emailDomain = (email) => String(email).toLowerCase().split("@")[1] || ""
const isDisposable = (email) => DISPOSABLE_DOMAINS.includes(emailDomain(email))

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

    if (!EMAIL_RE.test(email)) {
        throw new BadRequestError("Please enter a valid email address.")
    }
    if (isDisposable(email)) {
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
                return e.json(200, { ok: true, msg: "You've already been invited — check your email." })
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
        msg: "Thanks! Your request is in. A board member will approve it shortly and you'll get an email invite.",
    })
})

// ---------------------------------------------------------------------------
// Invite delivery — single path, fired whenever a row becomes "approved".
// ---------------------------------------------------------------------------

// Sends the Slack invite for an approved record and stamps invited_at (or
// records the error). Guarded by invited_at so it never double-sends.
function sendSlackInvite(record) {
    if (record.getString("status") !== "approved" || record.getString("invited_at")) {
        return
    }

    const token = $os.getenv("SLACK_API_TOKEN")
    const org = $os.getenv("SLACK_SUBDOMAIN")
    if (!token || !org) {
        console.error("[slack] SLACK_API_TOKEN / SLACK_SUBDOMAIN not configured")
        record.set("error", "Slack not configured (missing token/subdomain)")
        $app.save(record)
        return
    }

    const email = record.getString("email")
    const res = $http.send({
        url: "https://" + org + ".slack.com/api/users.admin.invite",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + token,
        },
        body: "email=" + encodeURIComponent(email) + "&resend=true",
        timeout: 15,
    })

    let outcome = "unknown"
    if (res.statusCode !== 200) {
        outcome = "http_" + res.statusCode
        console.error("[slack] invite HTTP " + res.statusCode + ": " + res.raw)
    } else {
        const data = res.json || {}
        if (data.ok || data.error === "already_invited" || data.error === "already_in_team") {
            outcome = data.ok ? "sent" : data.error
        } else {
            outcome = data.error || "unknown_error"
            console.error("[slack] invite error for " + email + ": " + outcome)
        }
    }

    if (outcome === "sent" || outcome === "already_invited" || outcome === "already_in_team") {
        record.set("invited_at", new Date().toISOString())
        record.set("error", "")
    } else {
        record.set("error", outcome)
    }
    $app.save(record)
}

// Notifies the board about a pending request (email + optional Slack webhook),
// reusing the same best-effort pattern as new-job notifications.
function notifyBoard(record) {
    const email = record.getString("email")
    const country = record.getString("country") || "unknown"

    try {
        const settings = $app.settings()
        const recipient =
            $os.getenv("SLACK_REVIEW_EMAIL") ||
            $os.getenv("JOB_NOTIFY_EMAIL") ||
            settings.meta.senderAddress
        if (recipient) {
            const esc = (v) =>
                String(v == null ? "" : v)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")
            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
                to: [{ address: recipient }],
                subject: "Slack invite request pending: " + email,
                html:
                    "<h2>A new Slack invite request needs review</h2>" +
                    "<ul>" +
                    "<li>Email: " + esc(email) + "</li>" +
                    "<li>Country: " + esc(country) + "</li>" +
                    "<li>IP: " + esc(record.getString("ip")) + "</li>" +
                    "</ul>" +
                    "<p>Approve or reject it on the Slack invites admin screen.</p>",
            })
            $app.newMailClient().send(message)
            console.log("[slack] pending-request email sent to " + recipient)
        }
    } catch (err) {
        console.error("[slack] pending-request email failed: " + err)
    }

    try {
        const webhook = $os.getenv("SLACK_WEBHOOK_URL")
        if (webhook) {
            const slackEsc = (v) =>
                String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            const text =
                ":envelope_with_arrow: *New Slack invite request pending review*\n" +
                "Email: " + slackEsc(email) + "\n" +
                "Country: " + slackEsc(country) + "\n" +
                "Approve or reject it on the admin screen."
            const res = $http.send({
                url: webhook,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                timeout: 15,
            })
            if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error("[slack] webhook returned " + res.statusCode + ": " + res.raw)
            }
        }
    } catch (err) {
        console.error("[slack] pending-request webhook failed: " + err)
    }
}

onRecordAfterCreateSuccess((e) => {
    const status = e.record.getString("status")
    if (status === "approved") {
        sendSlackInvite(e.record)
    } else if (status === "pending") {
        notifyBoard(e.record)
    }
    e.next()
}, "slack_invites")

onRecordAfterUpdateSuccess((e) => {
    const was = e.record.original().getString("status")
    const now = e.record.getString("status")
    // Send the invite the moment a board member flips a row to approved.
    if (was !== "approved" && now === "approved") {
        sendSlackInvite(e.record)
    }
    e.next()
}, "slack_invites")
