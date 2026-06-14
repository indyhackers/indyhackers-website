/// <reference path="../pb_data/types.d.ts" />

// Registers the reminder sweep: every 15 minutes, plus a `send-reminders`
// console command for manual runs. Logic lives in reminders.js.

cronAdd('send-reminders', '*/15 * * * *', () => {
  try {
    const reminders = require(`${__hooks}/reminders.js`)
    reminders.sendReminders()
  } catch (err) {
    console.error('[reminders] cron failed: ' + err)
  }
})

$app.rootCmd.addCommand(
  new Command({
    use: 'send-reminders',
    run: (cmd, args) => {
      const reminders = require(`${__hooks}/reminders.js`)
      const sent = reminders.sendReminders()
      console.log('sent ' + sent + ' reminder(s)')
    }
  })
)
