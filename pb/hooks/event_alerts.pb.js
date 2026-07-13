/// <reference path="../pb_data/types.d.ts" />

// Public, anonymous "email me when a new event matches these topics" signup,
// offered next to the topic filters on the Calendar page.
//
//   POST /api/event-alerts/subscribe   — create/update a pending alert, email
//                                        a confirm link (double opt-in).
//   GET  /api/event-alerts/confirm     — flips status to "confirmed".
//   GET  /api/event-alerts/unsubscribe — flips status to "unsubscribed".
//
// Delivery is a weekly digest: every Monday 8am Indiana local time (the
// Dockerfile sets TZ=America/Indiana/Indianapolis so this cron expression
// means what it says year-round, DST included), each confirmed subscriber
// gets one email covering that Monday-through-Sunday's events matching their
// selected topics.
//
// The event_alerts collection's create/updateRule are null (see the
// 025_create_event_alerts migration) — every write happens via $app in
// event_alerts.js so the honeypot + rate-limit checks there can't be bypassed
// through the REST API, same pattern as slack.pb.js / slack_invites.
//
// This file only registers thin routes — all logic lives in event_alerts.js.
// PocketBase bundles every *.pb.js file together at startup, and (verified
// against a real instance) a routerAdd callback registered here cannot see
// this file's own top-level declarations; only a require() called lazily
// *inside* the callback reaches a plain module's exports safely. Mirrors
// calendar_sync.pb.js / reminders.pb.js, which split the same way for the
// same reason.
//
// Env:
//   EVENT_ALERTS_RATE_PER_HOUR  max subscribe requests per IP per hour (default 5)

routerAdd('POST', '/api/event-alerts/subscribe', (e) => {
  return require(`${__hooks}/event_alerts.js`).handleSubscribe(e)
})

routerAdd('GET', '/api/event-alerts/confirm', (e) => {
  return require(`${__hooks}/event_alerts.js`).handleConfirm(e)
})

routerAdd('GET', '/api/event-alerts/unsubscribe', (e) => {
  return require(`${__hooks}/event_alerts.js`).handleUnsubscribe(e)
})

cronAdd('event-alerts-weekly', '0 8 * * 1', () => {
  try {
    require(`${__hooks}/event_alerts.js`).sendWeeklyDigest()
  } catch (err) {
    console.error('[event_alerts] weekly digest cron failed: ' + err)
  }
})

$app.rootCmd.addCommand(
  new Command({
    use: 'send-event-alerts',
    run: (cmd, args) => {
      const sent = require(`${__hooks}/event_alerts.js`).sendWeeklyDigest()
      console.log('sent ' + sent + ' digest(s)')
    }
  })
)