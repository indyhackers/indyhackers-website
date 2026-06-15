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
// Recipient comes from JOB_NOTIFY_EMAIL, falling back to the configured sender.
onRecordAfterCreateSuccess((e) => {
    try {
        const settings = $app.settings()
        const recipient = $os.getenv("JOB_NOTIFY_EMAIL") || settings.meta.senderAddress
        if (!recipient) {
            console.warn("[jobs] no JOB_NOTIFY_EMAIL or sender address set; skipping notification")
            e.next()
            return
        }

        const r = e.record
        const fmtSalary = (n) => (n ? "$" + n + "k" : "—")
        const salary =
            r.getInt("salary_min") || r.getInt("salary_max")
                ? fmtSalary(r.getInt("salary_min")) + " – " + fmtSalary(r.getInt("salary_max"))
                : "Not specified"

        const message = new MailerMessage({
            from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
            to: [{ address: recipient }],
            subject: "New job submitted: " + r.getString("title"),
            html:
                "<h2>A new job was submitted to the board</h2>" +
                "<p><strong>" + r.getString("title") + "</strong> at <strong>" + r.getString("company") + "</strong></p>" +
                "<ul>" +
                "<li>Salary: " + salary + "</li>" +
                "<li>Submitted by: " + (r.getString("name") || "—") + " (" + (r.getString("email") || "—") + ")</li>" +
                "<li>Status: " + (r.getBool("approved") ? "approved" : "pending approval") + "</li>" +
                "</ul>" +
                (r.getString("description") ? "<p>" + r.getString("description") + "</p>" : "") +
                "<p>Review it in the admin to approve.</p>"
        })

        $app.newMailClient().send(message)
        console.log("[jobs] new-job notification sent to " + recipient)
    } catch (err) {
        // Never let a notification failure block job creation.
        console.error("[jobs] new-job notification failed: " + err)
    }

    e.next()
}, "jobs")