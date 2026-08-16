/// <reference path="../pb_data/types.d.ts" />

// Self-service job management for account-less submitters. Authority is the
// unguessable `edit_token` minted on create (see jobs.pb.js) and delivered in
// the approval email. These endpoints look the job up by that token and never
// expose the submitter's name/email or the token itself.
//
// NOTE: PocketBase runs each routerAdd handler in an isolated JSVM runtime, so
// helpers cannot be shared from the file scope — they are inlined per handler.

routerAdd("GET", "/api/jobs/manage/{token}", (e) => {
    const publicView = (r) => ({
        id: r.id,
        title: r.getString("title"),
        company: r.getString("company"),
        salary_min: r.getInt("salary_min"),
        salary_max: r.getInt("salary_max"),
        description: r.getString("description"),
        how_to_apply: r.getString("how_to_apply"),
        approved: r.getBool("approved"),
        filled: r.getBool("filled"),
        // Drives the "expires on / extend" UI on the manage page. The public
        // list hides a job 60 days after approved_at, so that's its expiry.
        approved_at: r.getString("approved_at")
    })

    const token = e.request.pathValue("token")
    let job = null
    if (token) {
        try {
            job = $app.findFirstRecordByData("jobs", "edit_token", token)
        } catch (err) {
            job = null
        }
    }
    if (!job) {
        throw new NotFoundError("No job matches that link.")
    }
    return e.json(200, publicView(job))
})

routerAdd("PATCH", "/api/jobs/manage/{token}", (e) => {
    const EDITABLE = ["title", "company", "salary_min", "salary_max", "description", "how_to_apply"]
    const stripTags = (v) => String(v == null ? "" : v).replace(/<[^>]*>/g, "").trim()
    const publicView = (r) => ({
        id: r.id,
        title: r.getString("title"),
        company: r.getString("company"),
        salary_min: r.getInt("salary_min"),
        salary_max: r.getInt("salary_max"),
        description: r.getString("description"),
        how_to_apply: r.getString("how_to_apply"),
        approved: r.getBool("approved"),
        filled: r.getBool("filled"),
        // Drives the "expires on / extend" UI on the manage page. The public
        // list hides a job 60 days after approved_at, so that's its expiry.
        approved_at: r.getString("approved_at")
    })

    const token = e.request.pathValue("token")
    let job = null
    if (token) {
        try {
            job = $app.findFirstRecordByData("jobs", "edit_token", token)
        } catch (err) {
            job = null
        }
    }
    if (!job) {
        throw new NotFoundError("No job matches that link.")
    }

    const body = e.requestInfo().body || {}

    // Editable text/number fields (only those actually provided).
    let edited = false
    for (const key of EDITABLE) {
        if (body[key] === undefined) continue
        edited = true

        if (key === "salary_min" || key === "salary_max") {
            const n = Number(body[key])
            if (isNaN(n) || n < 0 || n > 1000) {
                throw new BadRequestError("Salary must be a number between 0 and 1000.")
            }
            job.set(key, n)
        } else if (key === "description" || key === "how_to_apply") {
            if (stripTags(body[key]).length === 0) {
                throw new BadRequestError("Description and how-to-apply cannot be empty.")
            }
            job.set(key, String(body[key]))
        } else {
            if (String(body[key]).trim().length === 0) {
                throw new BadRequestError("Title and company cannot be empty.")
            }
            job.set(key, String(body[key]))
        }
    }

    const min = job.getInt("salary_min")
    const max = job.getInt("salary_max")
    if (max > 0 && max < min) {
        throw new BadRequestError("Minimum salary is greater than maximum.")
    }

    // Soft take-down. Edits otherwise leave `approved` untouched, so they stay
    // live without re-triggering moderation or the approval email.
    if (body.filled !== undefined) {
        job.set("filled", !!body.filled)
    }

    // "Extend for 60 days": reset approved_at to now so the 60-day visibility
    // window (JobsList's approved_at >= now-60d filter) restarts. Only an
    // already-approved, live posting can be extended. Resetting the reminder
    // flag lets the expiry-reminder cron fire again for the new period.
    if (body.extend === true) {
        if (!job.getBool("approved")) {
            throw new BadRequestError("Only an approved, live posting can be extended.")
        }
        job.set("approved_at", new Date().toISOString())
        job.set("expiry_reminder_sent", false)
    }

    $app.save(job)

    // Tell the moderator channel (SLACK_WEBHOOK_URL) when a poster self-manages
    // their post via the edit link. Best-effort — postSlackWebhook no-ops with no
    // webhook and never throws, but guard the require/build too so a notification
    // failure can never fail the poster's edit. Extend/take-down/re-list are
    // mutually exclusive from the frontend; classify by priority just in case.
    let action = null
    let emoji = ":pencil2:"
    if (body.extend === true) {
        action = "extended for 60 days"
        emoji = ":calendar:"
    } else if (body.filled === true) {
        action = "taken down"
        emoji = ":outbox_tray:"
    } else if (body.filled === false) {
        action = "re-listed"
        emoji = ":inbox_tray:"
    } else if (edited) {
        action = "edited"
        emoji = ":pencil2:"
    }
    if (action) {
        try {
            const util = require(`${__hooks}/slack_util.js`)
            const esc = util.slackEscape
            const base = ($os.getenv("SITE_URL") || $app.settings().meta.appURL || "").replace(/\/+$/, "")
            const link = base ? "\n<" + base + "/job?id=" + job.id + "|View posting>" : ""
            util.postSlackWebhook(
                emoji + " *Job " + action + " by the poster*\n" +
                "*" + esc(job.getString("title")) + "* at *" + esc(job.getString("company")) + "*" + link
            )
        } catch (err) {
            console.error("[jobs] manage webhook failed: " + err)
        }
    }

    return e.json(200, publicView(job))
})
