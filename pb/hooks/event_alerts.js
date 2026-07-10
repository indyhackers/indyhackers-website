/// <reference path="../pb_data/types.d.ts" />

// All logic for the event_alerts feature (topic-based "email me when a new
// event matches" signup on the Calendar page). event_alerts.pb.js only
// registers thin routes that call into this module — PocketBase bundles
// every *.pb.js file together at startup, and (verified against a real
// instance) a routerAdd/onRecord*/cronAdd callback cannot see its own file's
// top-level declarations, only a require() called lazily inside the callback
// reaches a plain module's exports safely. Mirrors calendar_sync.pb.js /
// reminders.pb.js, which split the same way for the same reason.
//
// sendWeeklyDigest() is the delivery half: run by the event-alerts-weekly
// cron in event_alerts.pb.js every Monday morning (Indiana local time — see
// the Dockerfile's TZ setting). It emails each confirmed subscriber one
// digest covering that Monday-through-Sunday's events matching their
// selected topics. Being a stateless sweep of "what's on the calendar this
// week" rather than a reaction to individual event writes, it needs no
// delivery-dedup table: re-running it mid-week would just resend the same
// week's list, which is why it's wired to a single weekly cron tick only.

const MAX_ALERTS_PER_RUN = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function baseUrl() {
  const settings = $app.settings()
  return ($os.getenv('SITE_URL') || settings.meta.appURL || '').replace(/\/+$/, '')
}

// Renders a standalone HTML page matching the site's design tokens (copied
// from src/assets/base.scss / src/styles/main.scss) for the confirm/
// unsubscribe links people land on straight from their inbox — this route
// isn't part of the Vue app, so it can't import the real stylesheet.
function statusPage(message) {
  const eventsUrl = baseUrl() + '/calendar'
  return (
    '<!doctype html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>IndyHackers</title>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0}' +
    'body{display:flex;align-items:center;justify-content:center;min-height:100vh;' +
    'background:#ffffff;color:#121212;font-family:"Space Grotesk",sans-serif;padding:1.5rem}' +
    '.card{max-width:28rem;text-align:center}' +
    'h1{font-family:"Space Mono",monospace;font-size:1.375rem;line-height:1.5;margin-bottom:2rem}' +
    '.btn{display:inline-flex;align-items:center;gap:0.5rem;background:#121212;color:#E2C044;' +
    'font-family:"Space Mono",monospace;font-weight:bold;font-size:0.875rem;letter-spacing:0.05em;' +
    'padding:0.875rem 2rem;border-radius:0.5rem;text-decoration:none}' +
    '.btn:hover{background:#7a5c2e}' +
    '.btn:focus-visible{outline:2px solid #4a7c7e;outline-offset:2px}' +
    '</style></head><body><div class="card">' +
    '<h1>' + esc(message) + '</h1>' +
    '<a class="btn" href="' + eventsUrl + '">Back to events page</a>' +
    '</div></body></html>'
  )
}

// --- Confirmation email (subscribe flow) -------------------------------------

function topicNamesFor(ids) {
  return ids
    .map((id) => {
      try {
        return $app.findRecordById('topics', id).getString('name')
      } catch (_) {
        return null
      }
    })
    .filter(Boolean)
}

function sendConfirmEmail(record, topicNames) {
  const settings = $app.settings()
  const confirmUrl =
    baseUrl() + '/api/event-alerts/confirm?token=' + encodeURIComponent(record.getString('token'))

  const message = new MailerMessage({
    from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
    to: [{ address: record.getString('email') }],
    subject: 'Confirm your IndyHackers event alerts',
    html:
      '<h2>One more step</h2>' +
      '<p>Confirm this address to get an email whenever a new event matches: <strong>' +
      esc(topicNames.join(', ')) +
      '</strong>.</p>' +
      '<p><a href="' + confirmUrl + '">Confirm my alerts</a></p>' +
      "<p>Didn't request this? Ignore this email and you won't hear from us.</p>"
  })
  $app.newMailClient().send(message)
}

// --- Route handlers, called from the thin routerAdd wrappers in event_alerts.pb.js

function handleSubscribe(e) {
  const info = e.requestInfo()
  const body = info.body || {}
  const email = String(body.email || '').trim().toLowerCase()
  const honeypot = String(body.website || '').trim()
  const requestedTopics = Array.isArray(body.topics) ? body.topics.map(String) : []

  // Honeypot: pretend success so bots don't learn they were caught.
  if (honeypot) {
    return e.json(200, { ok: true, pending: true, msg: 'Thanks! Check your email to confirm.' })
  }

  if (!EMAIL_RE.test(email)) {
    throw new BadRequestError('Please enter a valid email address.')
  }

  const allTopics = $app.findAllRecords('topics')
  const validIds = new Set(allTopics.map((t) => t.id))
  const topicIds = requestedTopics.filter((id) => validIds.has(id))
  if (topicIds.length === 0) {
    throw new BadRequestError('Please select at least one topic.')
  }

  const ip = e.realIP()
  const perHour = parseInt($os.getenv('EVENT_ALERTS_RATE_PER_HOUR') || '5', 10)
  if (ip) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    try {
      const recent = $app.findRecordsByFilter(
        'event_alerts',
        'ip = {:ip} && created >= {:cutoff}',
        '-created',
        perHour + 1,
        0,
        { ip, cutoff }
      )
      if (recent.length >= perHour) {
        throw new BadRequestError('Too many requests. Please try again later.')
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
      console.error('[event_alerts] rate-limit check failed: ' + err)
    }
  }

  const collection = $app.findCollectionByNameOrId('event_alerts')
  let record
  try {
    record = $app.findFirstRecordByFilter('event_alerts', 'email = {:email}', { email })
  } catch (_) {
    record = null
  }

  if (record) {
    // Already confirmed: just refresh their topic selection, no need to make
    // them reconfirm. Pending/unsubscribed: issue a fresh token and re-send.
    record.set('topics', topicIds)
    record.set('ip', ip)
    if (record.getString('status') === 'confirmed') {
      $app.save(record)
      return e.json(200, { ok: true, msg: 'Your alert preferences were updated.' })
    }
    record.set('status', 'pending')
    record.set('token', $security.randomString(40))
  } else {
    record = new Record(collection)
    record.set('email', email)
    record.set('topics', topicIds)
    record.set('status', 'pending')
    record.set('token', $security.randomString(40))
    record.set('ip', ip)
  }

  $app.save(record)

  // The record is already saved at this point — a mail outage shouldn't turn
  // into a false "something went wrong" for a subscribe that actually
  // succeeded. Matches the try/catch-around-send pattern in slack.pb.js /
  // jobs.pb.js.
  try {
    sendConfirmEmail(record, topicNamesFor(topicIds))
  } catch (err) {
    console.error('[event_alerts] confirm email failed for ' + email + ': ' + err)
  }

  return e.json(200, { ok: true, pending: true, msg: 'Thanks! Check your email to confirm.' })
}

function handleConfirm(e) {
  const token = e.request.url.query().get('token') || ''
  let record
  try {
    record = $app.findFirstRecordByFilter('event_alerts', 'token = {:token}', { token })
  } catch (_) {
    return e.html(400, statusPage('That confirmation link is invalid or has expired.'))
  }

  record.set('status', 'confirmed')
  $app.save(record)
  return e.html(200, statusPage("You're confirmed — we'll email you when a new event matches your topics."))
}

function handleUnsubscribe(e) {
  const token = e.request.url.query().get('token') || ''
  let record
  try {
    record = $app.findFirstRecordByFilter('event_alerts', 'token = {:token}', { token })
  } catch (_) {
    return e.html(400, '<p>That unsubscribe link is invalid.</p>')
  }

  record.set('status', 'unsubscribed')
  $app.save(record)
  return e.html(200, "<p>You've been unsubscribed from event alerts.</p>")
}

// --- Delivery: weekly digest, run by the event-alerts-weekly cron ----------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse a PocketBase datetime string ("2026-06-14 12:00:00.000Z") into a JS
// Date. Replacing the space with "T" keeps goja's Date parser happy (same
// approach as reminders.js).
function toDate(value) {
  if (!value) return null
  const s = String(value).replace(' ', 'T')
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Inverse of toDate()'s separator swap — formats a Date back into
// PocketBase's stored/compared datetime string shape so filter params sort
// correctly against `starts_at` (see the comment in sendWeeklyDigest).
function toApiDateString(date) {
  return date.toISOString().replace('T', ' ')
}

// Formatted in the container's local time zone (Indiana, per the Dockerfile's
// TZ setting) rather than via Intl/toLocaleString — goja doesn't ship a full
// ECMA-402 implementation, so this is hand-rolled to avoid depending on it.
function formatEventWhen(dateStr) {
  const d = toDate(dateStr)
  if (!d) return ''
  const pad = (n) => String(n).padStart(2, '0')
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return (
    WEEKDAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() +
    ' at ' + hours + ':' + pad(d.getMinutes()) + ' ' + ampm
  )
}

// Monday 00:00:00 of the week containing `now` (local time).
function startOfWeek(now) {
  const d = new Date(now)
  const day = d.getDay() // 0 = Sun ... 6 = Sat
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Sunday 23:59:59.999 of the same week as `weekStart`.
function endOfWeek(weekStart) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function sendDigestEmail(alert, events) {
  const settings = $app.settings()
  const unsubUrl =
    baseUrl() + '/api/event-alerts/unsubscribe?token=' + encodeURIComponent(alert.getString('token'))

  const items = events
    .map((ev) => {
      const when = formatEventWhen(ev.getString('starts_at'))
      return (
        '<li><strong>' + esc(ev.getString('title')) + '</strong> — ' + esc(when) +
        (ev.getString('location') ? ' — ' + esc(ev.getString('location')) : '') +
        (ev.getString('url') ? ' — <a href="' + ev.getString('url') + '">details</a>' : '') +
        '</li>'
      )
    })
    .join('')

  const message = new MailerMessage({
    from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
    to: [{ address: alert.getString('email') }],
    subject: 'This week\'s IndyHackers events matching your topics',
    html:
      '<h2>This week\'s events matching your topics</h2>' +
      '<ul>' + items + '</ul>' +
      '<p style="font-size:0.8em;color:#888;"><a href="' +
      unsubUrl +
      '">Unsubscribe from event alerts</a></p>'
  })
  $app.newMailClient().send(message)
}

// Emails every confirmed alert one digest of this week's (Mon-Sun) events
// whose topics overlap their selected topics. Subscribers with zero matches
// this week get no email.
function sendWeeklyDigest() {
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(weekStart)

  let events = []
  try {
    events = $app.findRecordsByFilter(
      'events',
      'starts_at >= {:start} && starts_at <= {:end} && status != "cancelled"',
      '+starts_at',
      500,
      0,
      // PocketBase stores/compares `starts_at` as a space-separated string
      // ("2026-06-29 18:00:00.000Z"); filter params are compared as plain
      // text, not parsed dates, so a "T"-separated .toISOString() value sorts
      // wrong here (space < "T" in ASCII breaks the ordering) — verified
      // against a real instance, where it silently dropped/leaked events at
      // the week boundary. toApiDateString() matches the stored format.
      { start: toApiDateString(weekStart), end: toApiDateString(weekEnd) }
    )
  } catch (err) {
    console.error('[event_alerts] weekly digest event lookup failed: ' + err)
    return 0
  }
  if (!events.length) return 0

  let alerts = []
  try {
    alerts = $app.findRecordsByFilter(
      'event_alerts',
      'status = "confirmed"',
      '',
      MAX_ALERTS_PER_RUN,
      0
    )
  } catch (err) {
    console.error('[event_alerts] weekly digest subscriber lookup failed: ' + err)
    return 0
  }

  let sent = 0
  alerts.forEach((alert) => {
    try {
      const selected = new Set(alert.get('topics') || [])
      const matches = events.filter((ev) => (ev.get('topics') || []).some((id) => selected.has(id)))
      if (!matches.length) return
      sendDigestEmail(alert, matches)
      sent += 1
    } catch (err) {
      console.error('[event_alerts] digest for ' + alert.id + ' failed: ' + err)
    }
  })
  return sent
}

module.exports = { handleSubscribe, handleConfirm, handleUnsubscribe, sendWeeklyDigest }