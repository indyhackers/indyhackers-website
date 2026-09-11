/// <reference path="../pb_data/types.d.ts" />

// Registers the Google Calendar -> PocketBase sync: an hourly cron job plus a
// `sync-calendar` console command for manual runs. The actual logic lives in
// calendar_sync.js (required so it isn't auto-loaded as its own hook file).

// Hourly, on the hour. Matches the Rails recurring sync job.
cronAdd('calendar-sync', '0 * * * *', () => {
  try {
    const sync = require(`${__hooks}/calendar_sync.js`)
    sync.syncCalendar()
  } catch (err) {
    console.error('[calendar_sync] cron failed: ' + err)
  }
})

$app.rootCmd.addCommand(
  new Command({
    use: 'sync-calendar',
    run: (cmd, args) => {
      const sync = require(`${__hooks}/calendar_sync.js`)
      const result = sync.syncCalendar()
      console.log(JSON.stringify(result))
    }
  })
)
