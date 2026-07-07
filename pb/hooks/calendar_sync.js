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
  const text = [record.getString('title'), record.getString('description'), record.getString('location')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return topics
    .filter((topic) => matchTerms(topic).some((term) => termPresent(text, term)))
    .map((topic) => topic.id)
}

// --- Google Calendar fetch ---------------------------------------------------

function fetchItems(cfg, now) {
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + cfg.windowDays * 24 * 60 * 60 * 1000).toISOString()

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

function findOrCreateSeries(item, result) {
  const recurringId = item.recurringEventId
  if (!recurringId) return ''

  const collection = $app.findCollectionByNameOrId('event_series')
  let series
  try {
    series = $app.findFirstRecordByFilter('event_series', 'google_series_id = {:gid}', { gid: recurringId })
  } catch (_) {
    series = new Record(collection)
    series.set('google_series_id', recurringId)
    series.set('title', item.summary || '')
    $app.save(series)
    result.series += 1
    return series.id
  }
  if (!series.getString('title') && item.summary) {
    series.set('title', item.summary)
    $app.save(series)
  }
  return series.id
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
    $app.delete(r)
    removed += 1
  })
  return removed
}

function processItem(item, topics, eventsCollection, result) {
  if (item.status === 'cancelled') {
    result.deleted += deleteByGoogleId(item.id)
    return
  }

  const times = parseTimes(item)
  if (!times) return

  const seriesId = findOrCreateSeries(item, result)

  let record
  let wasNew = false
  try {
    record = $app.findFirstRecordByFilter('events', 'google_event_id = {:gid}', { gid: item.id })
  } catch (_) {
    record = new Record(eventsCollection)
    record.set('google_event_id', item.id)
    wasNew = true
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

  $app.save(record)
  if (wasNew) result.created += 1
  else result.updated += 1
}

// --- Entry point -------------------------------------------------------------

function syncCalendar() {
  const cfg = config()
  if (!cfg.apiKey) throw new Error('GOOGLE_API_KEY is not set')
  if (!cfg.calendarId) throw new Error('GOOGLE_CALENDAR_ID is not set')

  const now = new Date()
  const result = { created: 0, updated: 0, deleted: 0, series: 0 }
  const topics = $app.findAllRecords('topics')
  const eventsCollection = $app.findCollectionByNameOrId('events')

  fetchItems(cfg, now).forEach((item) => processItem(item, topics, eventsCollection, result))

  const summary =
    result.created +
    ' created, ' +
    result.updated +
    ' updated, ' +
    result.deleted +
    ' removed, ' +
    result.series +
    ' new series'
  console.log('[calendar_sync] ' + summary)
  return result
}

module.exports = { syncCalendar }
