/// <reference path="../pb_data/types.d.ts" />

// Once a day, email posters whose job is ~10 days from dropping off the board,
// nudging them to extend it. Logic lives in jobs_expiry.js. Also exposes a
// `send-job-expiry-reminders` console command for manual runs / testing.

cronAdd("send-job-expiry-reminders", "0 14 * * *", () => {
  try {
    const jobsExpiry = require(`${__hooks}/jobs_expiry.js`)
    jobsExpiry.sendExpiryReminders()
  } catch (err) {
    console.error("[jobs] expiry-reminder cron failed: " + err)
  }
})

$app.rootCmd.addCommand(
  new Command({
    use: "send-job-expiry-reminders",
    run: (cmd, args) => {
      const jobsExpiry = require(`${__hooks}/jobs_expiry.js`)
      const sent = jobsExpiry.sendExpiryReminders()
      console.log("sent " + sent + " expiry reminder(s)")
    }
  })
)
