/// <reference path="../pb_data/types.d.ts" />

onRecordEnrich((e) => {
    // hide submitter contact info and the manage token
    e.record.hide('name', 'email', 'edit_token')

    e.next()
}, "jobs")

// The jobs create rule is public (account-less submission). Make sure an
// anonymous request can't self-publish by POSTing approved=true — force the
// moderation state unless the requester is an admin/superuser. Approval happens
// later on the /admin/jobs screen, which flips `approved`. This is a request
// hook, so it sees the caller's auth and never fires for internal $app.save.
onRecordCreateRequest((e) => {
    const jobs = require(`${__hooks}/jobs_util.js`)
    if (!jobs.requestIsPrivileged(e)) {
        e.record.set("approved", false)
        e.record.set("approved_at", "")
        e.record.set("filled", false)
    }
    e.next()
}, "jobs")

// Generate the unguessable manage token server-side before the record is
// persisted, so the (account-less) submitter can later edit / take down their
// own post without anyone being able to forge the link. Also sanitize the
// rich-text fields on the way in (defense in depth beneath the render-time
// DOMPurify — see jobs_util.js).
onRecordCreate((e) => {
    const jobs = require(`${__hooks}/jobs_util.js`)
    if (!e.record.getString("edit_token")) {
        e.record.set("edit_token", $security.randomString(40))
    }
    jobs.sanitizeJobHtml(e.record)
    e.next()
}, "jobs")

onRecordUpdate((e) => {
    const jobs = require(`${__hooks}/jobs_util.js`)
    // Re-sanitize on every write — this also covers the /api/jobs/manage PATCH
    // route, which edits the body and persists via $app.save (firing this hook).
    jobs.sanitizeJobHtml(e.record)

    const wasApproved = e.record.original().getBool("approved")
    const isApproved = e.record.getBool("approved")

    if (!wasApproved && isApproved) {
        // approved just flipped to true — stamp the time and start a fresh
        // 60-day posting period (so the expiry-reminder cron can fire again).
        e.record.set("approved_at", new Date().toISOString())
        e.record.set("expiry_reminder_sent", false)
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

            // Link straight to the job-approval admin page. If neither SITE_URL nor
            // appURL is configured we can't build an absolute URL, so fall back to
            // plain text rather than emit a broken relative Slack link.
            const base = ($os.getenv("SITE_URL") || $app.settings().meta.appURL || "").replace(/\/+$/, "")
            const adminUrl = base + "/admin/jobs"
            const reviewLine = base
                ? "Review it: <" + adminUrl + "|Job approval admin>"
                : "Review it: Job approval admin"

            const text =
                ":briefcase: *New job submitted to the board*\n" +
                "*" + slackEsc(r.getString("title")) + "* at *" + slackEsc(r.getString("company")) + "*\n" +
                "Salary: " + salary + "\n" +
                "Submitted by: " + slackEsc(name) + " (" + slackEsc(email) + ")\n" +
                "Status: " + status + "\n" +
                reviewLine

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

    // --- Submitter confirmation ---
    // Let the person who posted the job know we received it. Best-effort: a
    // failure here must never block job creation.
    try {
        const settings = $app.settings()
        const submitter = r.getString("email")
        if (submitter) {
            const esc = (v) =>
                String(v == null ? "" : v)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")

            // `description` / `how_to_apply` are rich HTML that jobs_util.sanitizeJobHtml
            // already cleaned during onRecordCreate, so we embed them as-is to preserve
            // the poster's formatting — escaping would show raw tags. Every other field
            // is plain text and gets esc()'d. `name`, `salary` and `esc` are in scope
            // from the top of this handler.
            const richField = (field) => {
                const s = r.getString(field)
                return s && s.replace(/<[^>]*>/g, "").trim() ? s : "<p>—</p>"
            }

            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
                to: [{ address: submitter }],
                subject: "We received your job post: " + r.getString("title"),
                html:
                    "<h2>Thanks for posting to the IndyHackers job board!</h2>" +
                    "<p>We received your submission. A moderator will review it shortly — you'll " +
                    "get another email with a management link once it's approved and live on the " +
                    "board.</p>" +
                    "<h3>Here's what you submitted</h3>" +
                    "<ul>" +
                    "<li><strong>Job title:</strong> " + esc(r.getString("title")) + "</li>" +
                    "<li><strong>Company:</strong> " + esc(r.getString("company")) + "</li>" +
                    "<li><strong>Salary:</strong> " + salary + "</li>" +
                    "<li><strong>Contact name:</strong> " + esc(name) + "</li>" +
                    "<li><strong>Contact email:</strong> " + esc(submitter) + "</li>" +
                    "</ul>" +
                    "<h3>Description</h3>" +
                    "<div>" + richField("description") + "</div>" +
                    "<h3>How to apply</h3>" +
                    "<div>" + richField("how_to_apply") + "</div>" +
                    "<p>If anything looks off, reply to this email and we'll help you fix it.</p>"
            })

            $app.newMailClient().send(message)
            console.log("[jobs] submitter confirmation sent to " + submitter)
        }
    } catch (err) {
        console.error("[jobs] submitter confirmation failed: " + err)
    }

    e.next()
}, "jobs")

// When a moderator approves a job (approved flips false -> true), email the
// submitter that it's live and give them a self-service link to edit the post
// or mark it as filled. A plain edit keeps approved=true, so it won't re-fire.
onRecordAfterUpdateSuccess((e) => {
    const r = e.record

    try {
        const wasApproved = r.original().getBool("approved")
        const isApproved = r.getBool("approved")
        const submitter = r.getString("email")

        if (!wasApproved && isApproved && submitter) {
            const settings = $app.settings()
            const esc = (v) =>
                String(v == null ? "" : v)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")

            const base = ($os.getenv("SITE_URL") || settings.meta.appURL || "").replace(/\/+$/, "")
            const manageUrl = base + "/jobs/manage?token=" + r.getString("edit_token")

            const message = new MailerMessage({
                from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
                to: [{ address: submitter }],
                subject: "Your job post is live: " + r.getString("title"),
                html:
                    "<h2>Your job post is now live!</h2>" +
                    "<p><strong>" + esc(r.getString("title")) + "</strong> at <strong>" +
                    esc(r.getString("company")) + "</strong> has been approved and is now on the " +
                    "IndyHackers job board.</p>" +
                    "<p>Need to make a change, or has the role been filled? Use your private " +
                    "management link to edit the post or take it down:</p>" +
                    '<p><a href="' + manageUrl + '">' + manageUrl + "</a></p>" +
                    "<p>Your posting will stay on the board for <strong>60 days</strong>. " +
                    "Still hiring when that's up? Open the link above and click " +
                    "<strong>Extend for 60 days</strong> to keep it live — you can do this as " +
                    "many times as you need.</p>" +
                    "<p>Keep this email — anyone with that link can manage the post.</p>"
            })

            $app.newMailClient().send(message)
            console.log("[jobs] approval email sent to " + submitter)
        }
    } catch (err) {
        // Never let a notification failure block the approval.
        console.error("[jobs] approval email failed: " + err)
    }

    // Public announcement: when a job goes live (approved false→true), post to the
    // public #jobs Slack channel so members see the opening. Independent and
    // best-effort — uses its own SLACK_JOBS_WEBHOOK_URL (the public channel), not
    // the private moderator webhook. Needs an absolute base URL to build the link;
    // if none is configured we skip rather than post a useless relative link.
    try {
        const wasApproved = r.original().getBool("approved")
        const isApproved = r.getBool("approved")
        if (!wasApproved && isApproved) {
            const util = require(`${__hooks}/slack_util.js`)
            const base = ($os.getenv("SITE_URL") || $app.settings().meta.appURL || "").replace(/\/+$/, "")
            if (base) {
                const esc = util.slackEscape
                const jobUrl = base + "/job?id=" + r.id
                const text = [
                    ":briefcase: *New job on the board*",
                    "*" + esc(r.getString("title")) + "* at *" + esc(r.getString("company")) + "*",
                    "<" + jobUrl + "|View the posting>",
                ].join("\n")
                util.postJobsChannelWebhook(text)
                console.log("[jobs] public #jobs announcement posted for " + r.id)
            } else {
                console.warn("[jobs] no SITE_URL/appURL; skipping public #jobs announcement (need an absolute link)")
            }
        }
    } catch (err) {
        console.error("[jobs] public #jobs announcement failed: " + err)
    }

    e.next()
}, "jobs")

// Moderator decision → Slack webhook ping recording WHO did it. These run on the
// API request (not the model hooks above) because only the request event carries
// the acting admin as e.auth. In the admin UI, "approve" flips approved
// false→true (an update) and "reject" deletes the pending row (a delete), so we
// cover both. Each pings only after e.next() commits, and the webhook post is
// best-effort (util.postSlackWebhook never throws). Helpers live in slack_util.js
// (the Slack-webhook home) and are require()'d here per the isolated-runtime rule.

// Approve = approved flips false→true; un-publishing (true→false) is reported too.
onRecordUpdateRequest((e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const r = e.record
    const wasApproved = r.original().getBool("approved")
    e.next()
    const isApproved = r.getBool("approved")
    if (wasApproved === isApproved) return
    try {
        const esc = util.slackEscape
        const text = [
            isApproved
                ? ":white_check_mark: *Job approved & published*"
                : ":leftwards_arrow_with_hook: *Job un-published*",
            "*" + esc(r.getString("title")) + "* at *" + esc(r.getString("company")) + "*",
            "*" + (isApproved ? "Approved" : "Unapproved") + " by:* " + esc(util.adminLabel(e.auth)),
        ].join("\n")
        util.postSlackWebhook(text)
    } catch (err) {
        console.error("[jobs] decision webhook failed: " + err)
    }
}, "jobs")

// Reject = the pending row is deleted from the admin queue. Read the fields we
// need BEFORE e.next() removes the record. A delete of an already-approved job
// is a live-listing takedown rather than a rejection, so word it accordingly.
onRecordDeleteRequest((e) => {
    const util = require(`${__hooks}/slack_util.js`)
    const r = e.record
    const title = r.getString("title")
    const company = r.getString("company")
    const wasApproved = r.getBool("approved")
    e.next()
    try {
        const esc = util.slackEscape
        const text = [
            ":x: *Job " + (wasApproved ? "removed" : "rejected") + "*",
            "*" + esc(title) + "* at *" + esc(company) + "*",
            "*" + (wasApproved ? "Removed" : "Rejected") + " by:* " + esc(util.adminLabel(e.auth)),
        ].join("\n")
        util.postSlackWebhook(text)
    } catch (err) {
        console.error("[jobs] delete webhook failed: " + err)
    }
}, "jobs")