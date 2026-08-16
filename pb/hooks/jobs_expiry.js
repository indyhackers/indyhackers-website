/// <reference path="../pb_data/types.d.ts" />

// Emails job posters a heads-up ~10 days before their posting drops off the
// board, with instructions and their edit link so they can extend it.
//
// Expiry model: the public list shows a job while `approved_at` is within the
// last POSTING_DAYS days (see src/components/jobs/JobsList.vue and the manage
// "Extend for 60 days" action), so a posting expires POSTING_DAYS after its
// approval date. We remind once, REMIND_BEFORE_DAYS before that.
//
// Idempotent: `expiry_reminder_sent` is flipped true before the email goes out,
// and reset to false whenever the job is (re)approved or extended (jobs.pb.js /
// jobs_manage.pb.js) so each posting period gets exactly one reminder.
//
// Runs inside the PocketBase JSVM (see jobs_expiry.pb.js for the cron).

const POSTING_DAYS = 60
const REMIND_BEFORE_DAYS = 10
const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

// Parse a PocketBase datetime ("2026-06-14 12:00:00.000Z") into a JS Date.
// Replacing the space with "T" keeps goja's Date parser happy.
function toDate(value) {
  if (!value) return null
  const d = new Date(String(value).replace(" ", "T"))
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d) {
  return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear()
}

function sendExpiryEmail(job) {
  const submitter = job.getString("email")
  if (!submitter) return false

  const approvedAt = toDate(job.getString("approved_at"))
  if (!approvedAt) return false
  const expiresOn = new Date(approvedAt.getTime() + POSTING_DAYS * DAY_MS)

  const settings = $app.settings()
  const base = ($os.getenv("SITE_URL") || settings.meta.appURL || "").replace(/\/+$/, "")
  if (!base) {
    console.warn("[jobs] no SITE_URL/appURL; skipping expiry reminder for " + job.id)
    return false
  }
  const manageUrl = base + "/jobs/manage?token=" + job.getString("edit_token")

  const esc = (v) =>
    String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")

  const message = new MailerMessage({
    from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
    to: [{ address: submitter }],
    subject: "Your job post expires soon: " + job.getString("title"),
    html:
      "<h2>Your job post is expiring soon</h2>" +
      "<p><strong>" + esc(job.getString("title")) + "</strong> at <strong>" +
      esc(job.getString("company")) + "</strong> is scheduled to come down from the " +
      "IndyHackers job board on <strong>" + formatDate(expiresOn) + "</strong> " +
      "(about " + REMIND_BEFORE_DAYS + " days from now).</p>" +
      "<p>Still hiring? Open your management link and click " +
      "<strong>Extend for 60 days</strong> to keep it live for another " +
      POSTING_DAYS + " days:</p>" +
      '<p><a href="' + manageUrl + '">' + manageUrl + "</a></p>" +
      "<p>No longer hiring? You can ignore this — the post will be removed " +
      "automatically. Keep this email; anyone with that link can manage the post.</p>"
  })

  $app.newMailClient().send(message)
  return true
}

function sendExpiryReminders() {
  const now = new Date()

  // A posting expires POSTING_DAYS after approved_at. Remind once it is within
  // REMIND_BEFORE_DAYS of that, but before it has expired:
  //   approved_at <= now - (POSTING_DAYS - REMIND_BEFORE_DAYS)   (remind point reached)
  //   approved_at >  now - POSTING_DAYS                          (still live)
  const remindAfter = new Date(now.getTime() - (POSTING_DAYS - REMIND_BEFORE_DAYS) * DAY_MS).toISOString()
  const stillLive = new Date(now.getTime() - POSTING_DAYS * DAY_MS).toISOString()

  let candidates = []
  try {
    candidates = $app.findRecordsByFilter(
      "jobs",
      'approved = true && filled != true && expiry_reminder_sent != true && ' +
        'approved_at != "" && approved_at <= {:remindAfter} && approved_at > {:stillLive}',
      "+approved_at",
      200,
      0,
      { remindAfter, stillLive }
    )
  } catch (err) {
    console.error("[jobs] expiry-reminder query failed: " + err)
    return 0
  }

  let sent = 0
  candidates.forEach((job) => {
    try {
      // Claim first: flip the flag and persist before sending, so a crash mid-run
      // can't double-send. approved is unchanged, so approved_at is preserved.
      job.set("expiry_reminder_sent", true)
      $app.save(job)

      if (sendExpiryEmail(job)) {
        sent += 1
        console.log("[jobs] expiry reminder sent for " + job.id)
      }
    } catch (err) {
      console.error("[jobs] expiry reminder for " + job.id + " failed: " + err)
    }
  })

  console.log("[jobs] sent " + sent + " expiry reminder(s)")
  return sent
}

module.exports = { sendExpiryReminders }
