/// <reference path="../pb_data/types.d.ts" />

// Shared constants + helpers for slack.pb.js.
//
// PocketBase runs each hook handler (routerAdd / onRecord* callbacks) in an
// isolated JSVM runtime that CANNOT see the hook file's module scope. Anything
// a handler needs must therefore be pulled in via require() from inside the
// handler body (same pattern as calendar_sync.js). Keeping these here — instead
// of at the top of slack.pb.js — is what makes them reachable at runtime.

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

    // Absolute link to the review screen (same SITE_URL/appURL fallback the job
    // notification emails use). Empty if neither is configured — callers then
    // fall back to plain "the admin screen" text rather than a broken link.
    const base = ($os.getenv("SITE_URL") || $app.settings().meta.appURL || "").replace(/\/+$/, "")
    const adminUrl = base ? base + "/admin/slack-invites" : ""

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
                    (adminUrl
                        ? '<p>Approve or reject it on the <a href="' + esc(adminUrl) + '">Slack invites admin screen</a>.</p>'
                        : "<p>Approve or reject it on the Slack invites admin screen.</p>"),
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
            const cta = adminUrl
                ? "Approve or reject it: <" + adminUrl + "|Slack invites admin>"
                : "Approve or reject it on the Slack invites admin screen."
            const text =
                ":envelope_with_arrow: *New Slack invite request pending review*\n" +
                "Email: " + slackEsc(email) + "\n" +
                "Country: " + slackEsc(country) + "\n" +
                cta
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

module.exports = {
    EMAIL_RE,
    DISPOSABLE_DOMAINS,
    emailDomain,
    isDisposable,
    sendSlackInvite,
    notifyBoard,
}
