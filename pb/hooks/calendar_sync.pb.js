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

// Geocode events whose address has no coordinates yet, without pulling the
// calendar. The hourly sync does this too, but capped per run — this command
// drains a backlog on demand (e.g. right after enabling the Geocoding API,
// where every existing event needs resolving).
//
//   pocketbase backfill-geocodes              # up to GEOCODE_BACKFILL_LIMIT (50)
//   pocketbase backfill-geocodes 500          # one big pass
//   pocketbase backfill-geocodes 500 retry    # also re-ask addresses that
//                                             # previously came back no-match,
//                                             # e.g. after switching geocoders
$app.rootCmd.addCommand(
  new Command({
    use: 'backfill-geocodes [limit] [retry]',
    run: (cmd, args) => {
      const sync = require(`${__hooks}/calendar_sync.js`)
      const list = args || []
      const retry = list.indexOf('retry') !== -1
      const limit = list.length && list[0] !== 'retry' ? list[0] : ''
      const result = sync.geocodePendingEvents(limit, retry)
      console.log(JSON.stringify(result))
    }
  })
)
