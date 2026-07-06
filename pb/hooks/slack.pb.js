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
//   RECAPTCHA_SECRET    Google reCAPTCHA v3 secret (server-side verification).
//                       Required for auto-approval: with no secret configured
//                       every request goes to the human review queue.
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
        // Whether low-risk requests are auto-invited (default on; only "off"
        // disables). Surfaced so the admin queue can show the current mode.
        autoApprove: String($os.getenv("SLACK_AUTOAPPROVE") || "").toLowerCase() !== "off",
    })
})

routerAdd("POST", "/api/slack/invite", (e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const info = e.requestInfo()
    const body = info.body || {}
    const email = String(body.email || "").trim().toLowerCase()
    const captchaResponse = String(body["g-recaptcha-response"] || "")
    const honeypot = String(body.website || "").trim()
    const firstName = String(body.first_name || "").trim()
    const lastName = String(body.last_name || "").trim()
    const indianaConnection = String(body.indiana_connection || "").trim()
    const cityRegion = String(body.city_region || "").trim()
    const linkedin = String(body.linkedin || "").trim()
    const github = String(body.github || "").trim()
    const cocAgreed = body.coc_agreed === true || body.coc_agreed === "true"
    // The browser's own IANA time zone (OS locale, not the IP) — survives a
    // VPN/proxy that masks the IP, so it's a stronger locale signal.
    const browserTimezone = String(body.browser_timezone || "").trim()

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
    if (!firstName || !lastName) {
        throw new BadRequestError("Please enter your first and last name.")
    }
    if (!indianaConnection) {
        throw new BadRequestError("Please tell us your connection to Indiana.")
    }
    if (!cityRegion) {
        throw new BadRequestError("Please enter the city or region you're based in.")
    }
    if (!cocAgreed) {
        throw new BadRequestError("Please agree to the code of conduct to continue.")
    }

    const ip = e.realIP()
    const headers = info.headers || {}
    // PocketBase normalizes request header keys to lowercase with hyphens turned
    // into underscores (e.g. "CF-IPCity" -> "cf_ipcity"). Read both forms so the
    // Cloudflare headers match regardless — the previous hyphenated lookups never
    // hit, which is why country and geolocation came back empty.
    const header = (name) => {
        const key = name.toLowerCase()
        return String(headers[key.replace(/-/g, "_")] || headers[key] || "")
    }
    const country = header("cf-ipcountry").toUpperCase()
    const userAgent = header("user-agent")

    // Approximate IP geolocation from Cloudflare. These headers are only present
    // when the "Add visitor location headers" managed transform is enabled in
    // the Cloudflare dashboard (cf-ipcountry is always sent; the rest are not).
    // All empty locally / off Cloudflare — the admin card just hides what's blank.
    const geo = {
        city: header("cf-ipcity"),
        region: header("cf-region"),
        region_code: header("cf-region-code"),
        continent: header("cf-ipcontinent"),
        postal: header("cf-postal-code"),
        metro_code: header("cf-metro-code"),
        timezone: header("cf-timezone"),
        lat: header("cf-iplatitude"),
        lon: header("cf-iplongitude"),
    }
    // Whether the visitor shares Indianapolis's clock (US/Canada Eastern).
    geo.same_tz_as_indy = util.sameTimezoneAsIndy(geo.timezone)
    // Resolve the Nielsen DMA (metro) code to a market name where known.
    geo.metro_name = util.metroName(geo.metro_code)

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
                    msg: "Your request is already in the queue — hang tight for approval. You can email admin@indyhackers.org if you need assistance.",
                })
            }
            // rejected → fall through and let them try again
        }
    } catch (_) {
        // no existing record; continue
    }

    // reCAPTCHA v3 (only verified when a secret is configured). Unlike v2,
    // v3 returns a risk `score` instead of a pass/fail checkbox: an invalid or
    // expired token (or the wrong action) is a hard reject, but a valid token
    // with a low score doesn't fail outright — it just loses the auto-approve
    // fast path and falls to the human review queue below. When no secret is
    // configured the check is skipped and NOTHING auto-approves: every request
    // queues for review (captchaOk stays false; see the autoApprove gate below).
    const secret = $os.getenv("RECAPTCHA_SECRET")
    let captchaOk = false
    let captchaScore = null
    let captchaMinScore = null
    if (secret) {
        if (!captchaResponse) {
            throw new BadRequestError("Captcha check failed. Please try again.")
        }
        // A transport failure (network/timeout, Google unreachable) must not
        // hard-fail the request and must not auto-approve — leave result null so
        // captchaOk stays false and the request drops to the review queue.
        let result = null
        try {
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
            result = verify.json || {}
        } catch (err) {
            console.error("[slack] reCAPTCHA verify request failed: " + err)
        }
        if (result) {
            // A definitive answer that the token is invalid/expired or was minted
            // for a different action → hard reject (a forged/stale token is a bad
            // request). A missing answer (transport error above) instead falls
            // through with captchaOk = false → review queue, never auto-approved.
            if (!result.success || (result.action && result.action !== "slack_invite")) {
                throw new BadRequestError("Captcha verification failed. Please try again.")
            }
            // v3 always returns a score; v2 tokens (no score) still pass here so a
            // key swap doesn't hard-break. Low score → not "ok" → review queue.
            const rawMin = parseFloat($os.getenv("RECAPTCHA_MIN_SCORE"))
            captchaMinScore = isNaN(rawMin) ? 0.5 : rawMin
            captchaScore = typeof result.score === "number" ? result.score : null
            captchaOk = captchaScore === null || captchaScore >= captchaMinScore
        }
    }

    // Risk signals → auto-approve decision. Auto-approve only low-risk requests;
    // everything else queues for a human. Auto-approval can be disabled via env.
    const autoApproveEnabled = String($os.getenv("SLACK_AUTOAPPROVE") || "").toLowerCase() !== "off"
    // Location + timezone-consistency signals feeding the auto-approve decision.
    const inIndiana =
        country === "US" &&
        (geo.region_code === "IN" || String(geo.region).toLowerCase() === "indiana")
    const browserSameIndy = util.sameTimezoneAsIndy(browserTimezone)
    const tzKnown = !!(browserTimezone && geo.timezone)
    // Two Eastern zones count as matching (e.g. browser America/New_York vs IP
    // America/Indiana/Indianapolis) — the JSVM can't compare UTC offsets, so we
    // lean on the Eastern classification rather than exact-string equality.
    const bothEastern = browserSameIndy === true && geo.same_tz_as_indy === true
    const tzMatch = tzKnown && (browserTimezone === geo.timezone || bothEastern)

    const signals = {
        country: country || "unknown",
        in_indiana: inIndiana,
        disposable: false,
        captcha_ok: secret ? captchaOk : "not_configured",
        captcha_score: secret ? captchaScore : null,
        captcha_min_score: secret ? captchaMinScore : null,
        browser_timezone: browserTimezone,
        browser_same_tz_as_indy: browserSameIndy,
        // Browser zone disagreeing with the IP zone is a classic VPN/proxy tell.
        tz_mismatch: tzKnown && !tzMatch,
        geo,
    }
    // Auto-approve only low-risk Indiana requests whose browser & IP zones agree
    // AND that passed a configured reCAPTCHA. Without a working captcha — secret
    // unset, verification unreachable, or a below-threshold score — we never
    // auto-invite; the request drops to the human review queue instead.
    const autoApprove =
        autoApproveEnabled && inIndiana && tzMatch && !!secret && captchaOk

    // For an auto-approvable request, attempt the Slack invite up front so the
    // outcome decides the row's initial state. If Slack can't deliver it (not
    // configured, HTTP error, or the email is already invited / in the
    // workspace) we don't fake a success — the request falls back into the
    // review queue as "pending" with the reason recorded, so a board member can
    // take a look. A non-auto request just queues as normal, no invite attempt.
    let status = autoApprove ? "approved" : "pending"
    let invitedAt = ""
    let inviteError = ""
    if (autoApprove) {
        const { ok, outcome } = util.slackInviteOutcome(email)
        if (ok) {
            invitedAt = new Date().toISOString()
        } else {
            status = "pending"
            inviteError = util.inviteErrorMessage(outcome)
        }
    }

    const collection = $app.findCollectionByNameOrId("slack_invites")
    const record = new Record(collection)
    record.set("email", email)
    record.set("first_name", firstName)
    record.set("last_name", lastName)
    record.set("indiana_connection", indianaConnection)
    record.set("city_region", cityRegion)
    record.set("linkedin", linkedin)
    record.set("github", github)
    record.set("coc_agreed", cocAgreed)
    record.set("status", status)
    // `auto` marks a row that was auto-approved AND delivered without a human. An
    // eligible request whose invite failed and fell back to the queue is not
    // auto-approved, so it records auto=false.
    record.set("auto", status === "approved")
    record.set("invited_at", invitedAt)
    record.set("error", inviteError)
    record.set("ip", ip)
    record.set("country", country)
    record.set("user_agent", userAgent)
    record.set("signals", signals)
    $app.save(record)

    if (status === "approved") {
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
    // The invite (if any) was already attempted synchronously in the POST handler
    // before this record was saved, so here we only notify the board.
    if (status === "approved") {
        // Auto-approved and delivered — notify the board, framed as auto-approved.
        util.notifyBoard(e.record, true)
    } else if (status === "pending") {
        // Either a normal review request or an auto-eligible one whose invite
        // failed and fell back to the queue — both get pending-review framing.
        util.notifyBoard(e.record, false)
    }
    e.next()
}, "slack_invites")

// Manual approval. This runs BEFORE the update is committed: when a board member
// flips a row to "approved" we attempt the Slack invite first, and only let the
// status change persist (calling e.next()) if the invite actually went out. If
// Slack fails — not configured, HTTP error, or the email is already invited / in
// the workspace — we throw, which aborts the transaction: the row stays
// "pending" and the admin UI shows the specific reason. This is deliberately the
// only place a hand-approval turns into an invite (the after-create hook above
// handles auto-approval), so an approval can never be recorded without a
// successful send.
onRecordUpdate((e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const was = e.record.original().getString("status")
    const now = e.record.getString("status")
    if (was !== "approved" && now === "approved" && !e.record.getString("invited_at")) {
        const { ok, outcome } = util.slackInviteOutcome(e.record.getString("email"))
        if (!ok) {
            // Abort before e.next(): nothing is written, so status stays "pending".
            throw new BadRequestError(util.inviteErrorMessage(outcome))
        }
        e.record.set("invited_at", new Date().toISOString())
        e.record.set("error", "")
    }
    e.next()
}, "slack_invites")
