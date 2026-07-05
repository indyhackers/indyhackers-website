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

// Cloudflare's cf-ipcontinent is a 2-letter code; spell it out for humans.
const CONTINENTS = {
    AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe",
    NA: "North America", OC: "Oceania", SA: "South America",
}
const continentName = (code) => CONTINENTS[String(code || "").toUpperCase()] || String(code || "")

// Profile links are stored as free text, so a user may omit the scheme.
const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "https://" + u)

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
    // Everything the /admin/slack-invites review card shows, so a reviewer can
    // triage straight from the notification.
    const email = record.getString("email")
    const name = [record.getString("first_name"), record.getString("last_name")]
        .filter(Boolean).join(" ") || "(no name given)"
    const country = record.getString("country") || "unknown"
    const cityRegion = record.getString("city_region")
    const ip = record.getString("ip")
    const connection = record.getString("indiana_connection")
    const linkedin = record.getString("linkedin")
    const github = record.getString("github")
    const cocAgreed = record.getBool("coc_agreed")

    // Approximate IP geolocation (Cloudflare headers) stashed under signals.geo.
    let geo = {}
    try {
        const s = record.get("signals")
        geo = (s && s.geo) || {}
    } catch (_) {
        geo = {}
    }
    const hasGeo = !!(geo.city || geo.region || geo.continent || (geo.lat && geo.lon))
    const approxLocation = hasGeo
        ? [
            [geo.city, geo.region].filter(Boolean).join(", "),
            [continentName(geo.continent), country].filter(Boolean).join(" · "),
          ].filter(Boolean).join(" · ")
        : ""
    const coords = geo.lat && geo.lon ? geo.lat + ", " + geo.lon : ""
    const mapUrl = geo.lat && geo.lon
        ? "https://www.google.com/maps?q=" + encodeURIComponent(geo.lat) + "," + encodeURIComponent(geo.lon)
        : ""

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
            const row = (label, value) =>
                value ? "<li><strong>" + esc(label) + ":</strong> " + esc(value) + "</li>" : ""
            const linkRow = (label, url) =>
                url
                    ? '<li><strong>' + esc(label) + ':</strong> <a href="' + esc(normalizeUrl(url)) + '">' + esc(url) + "</a></li>"
                    : ""

            let html = "<h2>A new Slack invite request needs review</h2><ul>"
            html += row("Name", name)
            html += row("Email", email)
            html += row("Based in", cityRegion)
            html += row("Approx. location (IP)", approxLocation)
            if (coords) {
                html += "<li><strong>Coordinates:</strong> " + esc(coords) +
                    (mapUrl ? ' (<a href="' + esc(mapUrl) + '">map</a>)' : "") + "</li>"
            }
            html += row("IP", ip)
            html += linkRow("LinkedIn", linkedin)
            html += linkRow("GitHub", github)
            html += row("Code of conduct", cocAgreed ? "agreed" : "not agreed")
            html += "</ul>"
            if (connection) {
                html += "<p><strong>Connection to Indiana:</strong><br>" + esc(connection) + "</p>"
            }
            html += adminUrl
                ? '<p>Approve or reject it on the <a href="' + esc(adminUrl) + '">Slack invites admin screen</a>.</p>'
                : "<p>Approve or reject it on the Slack invites admin screen.</p>"

            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
                to: [{ address: recipient }],
                subject: "Slack invite request pending: " + email,
                html: html,
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
            const line = (label, value) => (value ? "*" + label + ":* " + slackEsc(value) : "")
            const linkLine = (label, url) =>
                url ? "*" + label + ":* <" + normalizeUrl(url) + "|" + slackEsc(url) + ">" : ""

            const lines = [
                ":envelope_with_arrow: *New Slack invite request pending review*",
                line("Name", name),
                line("Email", email),
                line("Based in", cityRegion),
                line("Approx. location (IP)", approxLocation),
                coords ? "*Coordinates:* " + slackEsc(coords) + (mapUrl ? " (<" + mapUrl + "|map>)" : "") : "",
                line("IP", ip),
                line("Connection to Indiana", connection),
                linkLine("LinkedIn", linkedin),
                linkLine("GitHub", github),
                line("Code of conduct", cocAgreed ? "agreed" : "not agreed"),
                adminUrl
                    ? "Review it: <" + adminUrl + "|Slack invites admin>"
                    : "Approve or reject it on the Slack invites admin screen.",
            ].filter(Boolean)

            const res = $http.send({
                url: webhook,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: lines.join("\n") }),
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
