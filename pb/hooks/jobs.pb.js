/// <reference path="../pb_data/types.d.ts" />

onRecordEnrich((e) => {
    // hide name and email fields
    e.record.hide('name', 'email')

    e.next()
}, "jobs")

onRecordUpdate((e) => {
    const wasApproved = e.record.original().getBool("approved")
    const isApproved = e.record.getBool("approved")

    if (!wasApproved && isApproved) {
        // approved just flipped to true — stamp the time
        e.record.set("approved_at", new Date().toISOString())
    } else if (wasApproved && !isApproved) {
        // approved flipped back to false — clear the timestamp
        e.record.set("approved_at", "")
    }

    e.next()
}, "jobs")

// Notify the board moderators when a new job is submitted (so it can be
// reviewed/approved). Fires only after the record is successfully persisted.
// Sends an email (recipient from JOB_NOTIFY_EMAIL, falling back to the
// configured sender) and, if SLACK_WEBHOOK_URL is set, posts to Slack. Each
// channel is independent and best-effort: a failure in one never blocks the
// other or job creation.
onRecordAfterCreateSuccess((e) => {
    const r = e.record

    const status = r.getBool("approved") ? "approved" : "pending approval"
    const name = r.getString("name") || "—"
    const email = r.getString("email") || "—"
    const fmtSalary = (n) => (n ? "$" + n + "k" : "—")
    const salary =
        r.getInt("salary_min") || r.getInt("salary_max")
            ? fmtSalary(r.getInt("salary_min")) + " – " + fmtSalary(r.getInt("salary_max"))
            : "Not specified"

    // --- Email ---
    try {
        const settings = $app.settings()
        const recipient = $os.getenv("JOB_NOTIFY_EMAIL") || settings.meta.senderAddress
        if (recipient) {
            // Escape submitter-controlled values before interpolating into the
            // email HTML so a job submission can't inject markup.
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
                subject: "New job submitted: " + r.getString("title"),
                html:
                    "<h2>A new job was submitted to the board</h2>" +
                    "<p><strong>" + esc(r.getString("title")) + "</strong> at <strong>" + esc(r.getString("company")) + "</strong></p>" +
                    "<ul>" +
                    "<li>Salary: " + salary + "</li>" +
                    "<li>Submitted by: " + esc(name) + " (" + esc(email) + ")</li>" +
                    "<li>Status: " + status + "</li>" +
                    "</ul>" +
                    (r.getString("description") ? "<p>" + esc(r.getString("description")) + "</p>" : "") +
                    "<p>Review it in the admin to approve.</p>"
            })

            $app.newMailClient().send(message)
            console.log("[jobs] new-job email sent to " + recipient)
        } else {
            console.warn("[jobs] no JOB_NOTIFY_EMAIL or sender address set; skipping email")
        }
    } catch (err) {
        console.error("[jobs] new-job email failed: " + err)
    }

    // --- Slack ---
    try {
        const webhook = $os.getenv("SLACK_WEBHOOK_URL")
        if (webhook) {
            // Slack mrkdwn reserves &, <, > — escape them in submitted text.
            const slackEsc = (v) =>
                String(v == null ? "" : v)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")

            const text =
                ":briefcase: *New job submitted to the board*\n" +
                "*" + slackEsc(r.getString("title")) + "* at *" + slackEsc(r.getString("company")) + "*\n" +
                "Salary: " + salary + "\n" +
                "Submitted by: " + slackEsc(name) + " (" + slackEsc(email) + ")\n" +
                "Status: " + status + "\n" +
                "Review it in the admin to approve."

            const res = $http.send({
                url: webhook,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text }),
                timeout: 15
            })

            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log("[jobs] new-job Slack notification posted")
            } else {
                console.error("[jobs] Slack webhook returned " + res.statusCode + ": " + res.raw)
            }
        }
    } catch (err) {
        console.error("[jobs] new-job Slack notification failed: " + err)
    }

    e.next()
}, "jobs")