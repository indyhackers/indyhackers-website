/// <reference path="../pb_data/types.d.ts" />

// Pulls events from a public Google Calendar (via API key) into local `events`
// records, grouping recurring occurrences under an `event_series` and tagging
// each event with matching `topics`. Safe to run repeatedly: events are upserted
// by their Google id and cancelled occurrences are removed.
//
// Port of the Rails CalendarSyncService + TopicTagger. Runs inside the
// PocketBase JSVM, so it uses the $app / $http / $os globals.

const WINDOW_DAYS_DEFAULT = 90
const PAGE_SIZE = 250

function config() {
  const apiKey = $os.getenv('GOOGLE_API_KEY')
  const calendarId = $os.getenv('GOOGLE_CALENDAR_ID')
  const windowDays = parseInt($os.getenv('CALENDAR_SYNC_WINDOW_DAYS'), 10) || WINDOW_DAYS_DEFAULT
  return { apiKey, calendarId, windowDays }
}

// --- Topic tagging (port of TopicTagger) -------------------------------------

// Alphanumeric terms ("ruby", "go") match on word boundaries to avoid false
// hits ("go" inside "going"). Terms with symbols (".net", "c#", "node.js")
// fall back to a substring check since \b doesn't apply.
function termPresent(text, term) {
  if (!term) return false
  const t = term.toLowerCase()
  if (/^[a-z0-9]+$/.test(t)) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp('\\b' + escaped + '\\b').test(text)
  }
  return text.indexOf(t) !== -1
}

function matchTerms(topic) {
  const terms = [topic.getString('name')]
  let keywords = topic.get('keywords')
  if (typeof keywords === 'string') {
    try {
      keywords = JSON.parse(keywords)
    } catch (_) {
      keywords = []
    }
  }
  if (Array.isArray(keywords)) {
    keywords.forEach((k) => terms.push(k))
  }
  return terms.filter(Boolean).map((s) => String(s).toLowerCase())
}

function topicsForEvent(record, topics) {
  const text = [
    record.getString('title'),
    record.getString('description'),
    record.getString('location')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return topics
    .filter((topic) => matchTerms(topic).some((term) => termPresent(text, term)))
    .map((topic) => topic.id)
}

// --- Google Calendar fetch ---------------------------------------------------

// The range the sync is responsible for.
//
// It starts at the first of the current month, not at `now`: the month grid
// shows a whole month at a time, and anchoring to the current instant left
// every day before today empty. The end stays `windowDays` ahead of now.
//
// fetchItems and pruneMissingEvents share this so they cannot drift — a feed
// wider than the prune window would strand deleted events, and a narrower one
// would delete events the feed never had a chance to return.
function syncWindow(cfg, now) {
  return {
    timeMin: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    timeMax: new Date(now.getTime() + cfg.windowDays * 24 * 60 * 60 * 1000).toISOString()
  }
}

function fetchItems(cfg, now) {
  const { timeMin, timeMax } = syncWindow(cfg, now)

  const items = []
  let pageToken = ''
  do {
    const params = [
      'key=' + encodeURIComponent(cfg.apiKey),
      'singleEvents=true',
      'orderBy=startTime',
      'timeMin=' + encodeURIComponent(timeMin),
      'timeMax=' + encodeURIComponent(timeMax),
      'maxResults=' + PAGE_SIZE
    ]
    if (pageToken) params.push('pageToken=' + encodeURIComponent(pageToken))

    const url =
      'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(cfg.calendarId) +
      '/events?' +
      params.join('&')

    const res = $http.send({ url: url, method: 'GET', timeout: 30 })
    if (res.statusCode !== 200) {
      throw new Error('Google Calendar API returned ' + res.statusCode + ': ' + res.raw)
    }
    const data = res.json || {}
    ;(data.items || []).forEach((item) => items.push(item))
    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return items
}

// Returns { startsAt, endsAt, allDay }. All-day events carry a `date` instead
// of a `dateTime`.
function parseTimes(item) {
  const start = item.start
  const finish = item.end
  if (!start) return null

  if (start.date) {
    return {
      startsAt: new Date(start.date + 'T00:00:00Z').toISOString(),
      endsAt: finish && finish.date ? new Date(finish.date + 'T00:00:00Z').toISOString() : '',
      allDay: true
    }
  }
  if (start.dateTime) {
    return {
      startsAt: new Date(start.dateTime).toISOString(),
      endsAt: finish && finish.dateTime ? new Date(finish.dateTime).toISOString() : '',
      allDay: false
    }
  }
  return null
}

// The instance items we sync carry no RRULE — `singleEvents=true` expands a
// recurring event and the rule stays on the master. Fetch the master once per
// series to read it. A failure here is not fatal: the series simply keeps no
// recurrence and the UI falls back to a plain "Recurring" badge.
function fetchRecurrence(cfg, recurringId) {
  const url =
    'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(cfg.calendarId) +
    '/events/' +
    encodeURIComponent(recurringId) +
    '?key=' +
    encodeURIComponent(cfg.apiKey)

  try {
    const res = $http.send({ url: url, method: 'GET', timeout: 30 })
    if (res.statusCode !== 200) {
      console.log(
        '[calendar_sync] recurrence lookup for ' + recurringId + ' returned ' + res.statusCode
      )
      return null
    }
    const recurrence = (res.json || {}).recurrence
    return Array.isArray(recurrence) && recurrence.length ? recurrence : null
  } catch (err) {
    console.log('[calendar_sync] recurrence lookup for ' + recurringId + ' failed: ' + err)
    return null
  }
}

function findOrCreateSeries(cfg, item, result) {
  const recurringId = item.recurringEventId
  if (!recurringId) return ''

  const collection = $app.findCollectionByNameOrId('event_series')
  let series
  try {
    series = $app.findFirstRecordByFilter('event_series', 'google_series_id = {:gid}', {
      gid: recurringId
    })
  } catch (_) {
    series = new Record(collection)
    series.set('google_series_id', recurringId)
    series.set('title', item.summary || '')
    const recurrence = fetchRecurrence(cfg, recurringId)
    if (recurrence) series.set('recurrence', recurrence)
    $app.save(series)
    result.series += 1
    return series.id
  }

  let dirty = false
  if (!series.getString('title') && item.summary) {
    series.set('title', item.summary)
    dirty = true
  }
  // Backfill rows that predate the recurrence field, and retry series whose
  // earlier lookup failed. One extra request per series per sync until it
  // sticks; series that already have a rule cost nothing.
  if (!seriesHasRecurrence(series)) {
    const recurrence = fetchRecurrence(cfg, recurringId)
    if (recurrence) {
      series.set('recurrence', recurrence)
      dirty = true
    }
  }
  if (dirty) $app.save(series)
  return series.id
}

// The JSON field reads back as an array, or as its raw string on some driver
// paths; treat anything non-empty as present.
function seriesHasRecurrence(series) {
  const value = series.get('recurrence')
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value !== '' && value !== 'null' && value !== '[]'
  return !!value
}

function deleteByGoogleId(gid) {
  let removed = 0
  let records = []
  try {
    records = $app.findRecordsByFilter('events', 'google_event_id = {:gid}', '', 0, 0, { gid })
  } catch (_) {
    records = []
  }
  records.forEach((r) => {
    // The database is authoritative for locked (owned/edited) rows — leave them
    // alone even if Google reports the occurrence cancelled.
    if (r.getBool('locked')) return
    $app.delete(r)
    removed += 1
  })
  return removed
}

function processItem(cfg, item, topics, eventsCollection, result) {
  if (item.status === 'cancelled') {
    result.deleted += deleteByGoogleId(item.id)
    return
  }

  const times = parseTimes(item)
  if (!times) return

  const seriesId = findOrCreateSeries(cfg, item, result)

  let record
  let wasNew = false
  try {
    record = $app.findFirstRecordByFilter('events', 'google_event_id = {:gid}', { gid: item.id })
  } catch (_) {
    record = new Record(eventsCollection)
    record.set('google_event_id', item.id)
    wasNew = true
  }

  // The database is the source of truth for locked (owned/edited) rows: skip
  // them so human edits and topic assignments survive the hourly sync.
  if (!wasNew && record.getBool('locked')) {
    result.skipped += 1
    return
  }

  record.set('event_series', seriesId || null)
  record.set('title', item.summary || '(untitled event)')
  record.set('description', item.description || '')
  record.set('location', item.location || '')
  record.set('url', item.htmlLink || '')
  record.set('starts_at', times.startsAt)
  record.set('ends_at', times.endsAt)
  record.set('all_day', times.allDay)
  record.set('status', item.status || 'confirmed')
  record.set('raw', item)
  record.set('synced_at', new Date().toISOString())
  record.set('topics', topicsForEvent(record, topics))

  if (wasNew) {
    // Synced Google events are pre-vetted and public; they stay unlocked so
    // future syncs keep them current until someone edits or claims them.
    record.set('source', 'google')
    record.set('approved', true)
    record.set('locked', false)
  }

  $app.save(record)
  if (wasNew) result.created += 1
  else result.updated += 1
}

// --- Geocoding backfill ------------------------------------------------------

// How many addresses one run may resolve. Bounded so a large first-time backlog
// is spread over several hourly runs rather than making one of them enormous —
// which matters most with the Nominatim provider, capped at one request per
// second.
const GEOCODE_BACKFILL_DEFAULT = 50

// Events whose address still has no coordinates, soonest first.
//
// processItem() only geocodes rows the sync itself writes, which leaves two
// permanent gaps: `locked` rows (claimed or edited in-app) are skipped by the
// sync entirely, and user-submitted events never appear in the Google feed at
// all. Neither would ever pick up coordinates without someone re-saving it by
// hand, so the sync sweeps for them directly.
//
// Scoped to upcoming events, since those are the only ones the map plots.
// Addresses that came back as a definitive miss are not retried: needsGeocode()
// is false once the attempt is recorded, and the map lists them under "Not on
// the map" so the address can be corrected — which re-arms this on its own.
// `retryMisses` also re-asks for addresses that previously came back with no
// match. Those are cached deliberately (so a bad address isn't re-queried every
// hour), but a miss is only as good as the geocoder that produced it — after
// switching providers or enabling a Google key, they deserve another look.
function pendingGeocodes(limit, retryMisses) {
  const geo = require(`${__hooks}/geocode_util.js`)

  // Cheap filter in SQL; the address-vs-resolved-address comparison is done in
  // JS so it stays in one place (geocode_util.needsGeocode).
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let candidates = []
  try {
    candidates = $app.findRecordsByFilter(
      'events',
      "location != '' && starts_at >= {:from}",
      'starts_at',
      // Over-fetch so rows already resolved don't crowd out unresolved ones.
      limit * 10,
      0,
      { from: startOfToday.toISOString() }
    )
  } catch (err) {
    console.log('[calendar_sync] geocode backfill query failed: ' + err)
    return []
  }

  return candidates
    .filter((record) => {
      if (geo.needsGeocode(record)) return true
      // A resolved address with no point is a remembered miss. lat is never
      // legitimately 0 here — null island is rejected as invalid.
      return retryMisses && !record.get('lat')
    })
    .slice(0, limit)
}

// `limitOverride` lets the `backfill-geocodes` console command drain a large
// backlog in one go instead of waiting out the per-run cap.
function backfillGeocodes(result, limitOverride, retryMisses) {
  const geo = require(`${__hooks}/geocode_util.js`)

  const configured = parseInt(limitOverride || $os.getenv('GEOCODE_BACKFILL_LIMIT'), 10)
  const limit = configured > 0 ? configured : GEOCODE_BACKFILL_DEFAULT

  const pending = pendingGeocodes(limit, retryMisses)
  if (!pending.length) return

  pending.forEach((record) => {
    const beforeAddress = record.getString('geocoded_address')
    const beforeLat = record.get('lat')

    // Re-asking a remembered miss leaves the resolved address identical, so it
    // can't act as the "did anything happen?" signal on its own. Clearing it
    // first turns it into one: applyGeocode writes it back on any settled
    // outcome and leaves it empty when it couldn't reach the provider.
    if (retryMisses) record.set('geocoded_address', '')

    try {
      geo.applyGeocode(record)
    } catch (err) {
      console.log('[calendar_sync] geocode failed for ' + record.id + ': ' + err)
      record.set('geocoded_address', beforeAddress)
      return
    }

    // Couldn't reach the provider: put the cache key back and leave the row for
    // a later run, rather than saving and having the record hook spend a second
    // request on the same address.
    if (record.getString('geocoded_address') === '') {
      record.set('geocoded_address', beforeAddress)
      return
    }

    // Nothing actually moved — a miss that is still a miss. Skip the write.
    const changed =
      record.getString('geocoded_address') !== beforeAddress || record.get('lat') !== beforeLat
    if (!changed) return

    try {
      $app.save(record)
      result.geocoded += 1
    } catch (err) {
      console.log('[calendar_sync] could not save coordinates for ' + record.id + ': ' + err)
    }
  })

  if (pending.length === limit) {
    console.log('[calendar_sync] geocode backfill hit its ' + limit + '-per-run cap; more remain')
  }
}

// --- Reconciliation ----------------------------------------------------------

// Delete synced rows the calendar no longer has.
//
// processItem's `status === 'cancelled'` branch only fires for events Google
// actively reports as cancelled — and it never does here. With
// `singleEvents=true` and `showDeleted` unset (its default is false), a deleted
// event is omitted from the feed entirely rather than returned as cancelled. So
// without this pass, anything removed from the Google Calendar lingers in the
// database forever and keeps showing on the site.
//
// Scoped tightly, because this is the one part of the sync that destroys data:
//
//   - `source = 'google'`  — never touches events submitted through the app,
//                            which were never in the feed to begin with.
//   - `locked = false`     — a claimed or edited row is database-authoritative,
//                            the same rule processItem and deleteByGoogleId use.
//   - inside the window    — an event outside syncWindow() was never a candidate
//                            for this feed, so its absence means nothing. Note
//                            timeMin filters Google on *end* time, so an event
//                            already under way can have a starts_at below the
//                            window and is left alone.
//
// `CALENDAR_PRUNE=off` disables it.
function pruneMissingEvents(cfg, now, seenIds, feedSize, result) {
  if ($os.getenv('CALENDAR_PRUNE') === 'off') {
    console.log('[calendar_sync] CALENDAR_PRUNE=off — skipping reconciliation')
    return
  }

  // An empty feed is indistinguishable from a wrong calendar id, a revoked key,
  // or an API hiccup that answered 200 with nothing. Declining to prune costs a
  // stale row; pruning on a bad response would empty the calendar.
  if (!feedSize) {
    console.log('[calendar_sync] feed returned no events — skipping reconciliation')
    return
  }

  const { timeMin, timeMax } = syncWindow(cfg, now)

  let candidates = []
  try {
    candidates = $app.findRecordsByFilter(
      'events',
      "source = 'google' && locked = false && starts_at >= {:from} && starts_at <= {:to}",
      'starts_at',
      0,
      0,
      { from: timeMin, to: timeMax }
    )
  } catch (err) {
    console.log('[calendar_sync] reconciliation query failed: ' + err)
    return
  }

  candidates.forEach((record) => {
    const gid = record.getString('google_event_id')
    // A synced row with no Google id can't be matched against the feed, so it
    // is never a prune candidate.
    if (!gid || seenIds[gid]) return
    try {
      $app.delete(record)
      result.pruned += 1
    } catch (err) {
      console.log('[calendar_sync] could not remove stale event ' + record.id + ': ' + err)
    }
  })
}

// --- Entry point -------------------------------------------------------------

function syncCalendar() {
  const cfg = config()
  if (!cfg.apiKey) throw new Error('GOOGLE_API_KEY is not set')
  if (!cfg.calendarId) throw new Error('GOOGLE_CALENDAR_ID is not set')

  const now = new Date()
  const result = {
    created: 0,
    updated: 0,
    deleted: 0,
    pruned: 0,
    skipped: 0,
    series: 0,
    geocoded: 0
  }
  const topics = $app.findAllRecords('topics')
  const eventsCollection = $app.findCollectionByNameOrId('events')

  const items = fetchItems(cfg, now)
  // The ids the calendar currently holds, used to spot rows it no longer has.
  const seenIds = {}
  items.forEach((item) => {
    if (item.status !== 'cancelled') seenIds[item.id] = true
    processItem(cfg, item, topics, eventsCollection, result)
  })

  pruneMissingEvents(cfg, now, seenIds, items.length, result)

  // Runs after the feed so freshly created events are included, and outside the
  // per-item path so it also reaches locked and user-submitted events.
  backfillGeocodes(result)

  const summary =
    result.created +
    ' created, ' +
    result.updated +
    ' updated, ' +
    result.deleted +
    ' cancelled, ' +
    result.pruned +
    ' pruned, ' +
    result.skipped +
    ' skipped (locked), ' +
    result.series +
    ' new series, ' +
    result.geocoded +
    ' geocoded'
  console.log('[calendar_sync] ' + summary)
  return result
}

// Resolve addresses that still have no coordinates, without touching the
// Google feed. Backs the `backfill-geocodes` console command.
function geocodePendingEvents(limitOverride, retryMisses) {
  const result = { geocoded: 0 }
  backfillGeocodes(result, limitOverride, retryMisses)
  console.log('[calendar_sync] geocode backfill: ' + result.geocoded + ' geocoded')
  return result
}

module.exports = { syncCalendar, geocodePendingEvents, pruneMissingEvents }
