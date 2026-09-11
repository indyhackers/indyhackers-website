/// <reference path="../pb_data/types.d.ts" />

// Sweeps every subscription and emails a reminder for the next upcoming
// occurrence that falls inside the subscriber's lead-time window and hasn't
// already been sent. Idempotent: a reminder_deliveries row (unique per
// subscription + event) guards against duplicate emails across runs.
//
// Port of the Rails SendRemindersJob + ReminderMailer. Runs inside the
// PocketBase JSVM.

// Parse a PocketBase datetime string ("2026-06-14 12:00:00.000Z") into a JS
// Date. Replacing the space with "T" keeps goja's Date parser happy.
function toDate(value) {
  if (!value) return null
  const s = String(value).replace(' ', 'T')
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// --- iCalendar generation (port of ReminderMailer#ics_for) -------------------

function icsDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function icsFor(event) {
  const start = toDate(event.getString('starts_at'))
  let end = toDate(event.getString('ends_at'))
  if (!end) end = new Date(start.getTime() + 60 * 60 * 1000)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IndyHackers//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + (event.getString('google_event_id') || event.id),
    'DTSTAMP:' + icsDate(new Date()),
    'DTSTART:' + icsDate(start),
    'DTEND:' + icsDate(end),
    'SUMMARY:' + icsEscape(event.getString('title')),
    'DESCRIPTION:' + icsEscape(event.getString('description')),
    'LOCATION:' + icsEscape(event.getString('location')),
    'URL:' + icsEscape(event.getString('url')),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
}

// --- Mail --------------------------------------------------------------------

function parameterize(text) {
  return String(text || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'event'
}

function sendReminderEmail(user, event) {
  const settings = $app.settings()
  const message = new MailerMessage({
    from: {
      address: settings.meta.senderAddress,
      name: settings.meta.senderName
    },
    to: [{ address: user.getString('email') }],
    subject: 'Reminder: ' + event.getString('title'),
    html:
      '<p>Heads up — <strong>' +
      event.getString('title') +
      '</strong> is coming up.</p>' +
      (event.getString('location')
        ? '<p>📍 ' + event.getString('location') + '</p>'
        : '') +
      (event.getString('url')
        ? '<p><a href="' + event.getString('url') + '">View on Google Calendar</a></p>'
        : '') +
      '<p>An .ics file is attached so you can add it to your own calendar.</p>'
  })

  // Attach the .ics. Written to a temp file because MailerMessage attachments
  // need an io.Reader; $os.open returns one. Best-effort: a failure here must
  // not block the reminder email itself.
  try {
    const tmp = `${$os.tempDir()}/reminder-${event.id}.ics`
    $os.writeFile(tmp, icsFor(event), 0o644)
    message.attachments = {}
    message.attachments[parameterize(event.getString('title')) + '.ics'] = $os.open(tmp)
  } catch (err) {
    console.error('[reminders] could not attach .ics: ' + err)
  }

  $app.newMailClient().send(message)
}

// --- Sweep (port of SendRemindersJob) ----------------------------------------

function nextEventToRemind(subscription, now) {
  const seriesId = subscription.get('event_series')
  if (!seriesId) return null

  const leadMinutes = subscription.getInt('lead_time_minutes')
  const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000)

  let candidates = []
  try {
    candidates = $app.findRecordsByFilter(
      'events',
      'event_series = {:sid} && status != "cancelled"',
      '+starts_at',
      200,
      0,
      { sid: seriesId }
    )
  } catch (_) {
    return null
  }

  for (let i = 0; i < candidates.length; i++) {
    const event = candidates[i]
    const startsAt = toDate(event.getString('starts_at'))
    if (!startsAt) continue
    if (startsAt <= now || startsAt > windowEnd) continue

    // Skip if a reminder for this (subscription, event) was already sent.
    let delivered = false
    try {
      $app.findFirstRecordByFilter(
        'reminder_deliveries',
        'subscription = {:s} && event = {:e}',
        { s: subscription.id, e: event.id }
      )
      delivered = true
    } catch (_) {
      delivered = false
    }
    if (!delivered) return event
  }
  return null
}

function sendReminders() {
  const now = new Date()
  let sent = 0

  const subscriptions = $app.findAllRecords('subscriptions')
  const deliveriesCollection = $app.findCollectionByNameOrId('reminder_deliveries')

  subscriptions.forEach((subscription) => {
    try {
      const event = nextEventToRemind(subscription, now)
      if (!event) return

      // Claim the delivery first; the unique index makes this the dedup guard.
      const delivery = new Record(deliveriesCollection)
      delivery.set('subscription', subscription.id)
      delivery.set('event', event.id)
      delivery.set('sent_at', now.toISOString())
      try {
        $app.save(delivery)
      } catch (_) {
        return // already reminded for this occurrence (unique constraint)
      }

      $app.expandRecord(subscription, ['user'], null)
      const user = subscription.expandedOne('user')
      if (user) {
        sendReminderEmail(user, event)
        sent += 1
      }
    } catch (err) {
      console.error('[reminders] subscription ' + subscription.id + ' failed: ' + err)
    }
  })

  console.log('[reminders] sent ' + sent + ' reminder(s)')
  return sent
}

module.exports = { sendReminders }
