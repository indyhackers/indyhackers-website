import { ref, inject } from 'vue'

// Reminder lead times offered in the subscribe UI (label -> minutes).
// Mirrors Rails Subscription::LEAD_TIMES.
export const LEAD_TIMES = [
  { label: '1 hour before', minutes: 60 },
  { label: '3 hours before', minutes: 180 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 days before', minutes: 2880 },
  { label: '1 week before', minutes: 10080 }
]

// Whether a record actually carries a map point.
//
// PocketBase serialises an unset number field as 0, not null, so an event that
// has never been geocoded arrives as { lat: 0, lng: 0 } — which is a real place
// in the Gulf of Guinea, and would drop a pin in the Atlantic. Nothing in
// Indiana is anywhere near it, and geocode_util.validPoint already refuses to
// store 0,0, so treat it as "no coordinates" rather than a location.
export function hasCoordinates(record) {
  const { lat, lng } = record || {}
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false
  return !(lat === 0 && lng === 0)
}

// Normalizes a PocketBase events record (with expanded topics/series) into the
// shape the calendar UI consumes. `fileUrl` resolves an uploaded file on the
// record to an absolute URL (pocketbase.files.getURL); events without a cover
// image get empty strings and the grid draws a generated cover instead.
function normalizeEvent(record, fileUrl) {
  const expand = record.expand || {}
  const topics = (expand.topics || []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color,
    kind: t.kind
  }))
  const series = expand.event_series || null

  return {
    id: record.id,
    googleEventId: record.google_event_id,
    title: record.title || '(untitled event)',
    description: record.description || '',
    location: record.location || '',
    url: record.url || '',
    // `link` alias: list/markdown views (ported from the old Google-Calendar
    // path) reference event.link; keep it working off the synced url.
    link: record.url || '',
    start: record.starts_at,
    end: record.ends_at || null,
    isAllDay: !!record.all_day,
    // Geocoded from `location` server-side (geocode.pb.js); null until the
    // address has been resolved, or when it has no match.
    lat: hasCoordinates(record) ? record.lat : null,
    lng: hasCoordinates(record) ? record.lng : null,
    // `geocoded_address` is set once an address has actually been looked up, so
    // it separates "we tried and found nothing" from "not looked up yet".
    geocodeAttempted: !!record.geocoded_address,
    image: record.image ? fileUrl(record, record.image) : '',
    // 16:9 thumb (declared by migration 034) so grid cards don't download the
    // full-size upload.
    imageThumb: record.image ? fileUrl(record, record.image, { thumb: '640x360f' }) : '',
    status: record.status || 'confirmed',
    // Undefined on legacy rows that predate the moderation field — treat those
    // as visible; only an explicit `false` hides an event.
    approved: record.approved !== false,
    seriesId: record.event_series || '',
    series: series
      ? { id: series.id, title: series.title, recurrence: series.recurrence || null }
      : null,
    topics
  }
}

export function useEvents() {
  const pocketbase = inject('pocketbase')

  // File URLs need the client's baseURL. Guard the call so a record with a
  // stale filename (or a test double without a file service) degrades to the
  // generated cover rather than throwing mid-render.
  function fileUrl(record, filename, queryParams) {
    try {
      return pocketbase.files.getURL(record, filename, queryParams) || ''
    } catch {
      return ''
    }
  }

  const events = ref([])
  const topics = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [eventRecords, topicRecords] = await Promise.all([
        pocketbase.collection('events').getFullList({
          sort: 'starts_at',
          expand: 'topics,event_series'
        }),
        pocketbase.collection('topics').getFullList({ sort: 'name' })
      ])

      events.value = eventRecords
        .map((record) => normalizeEvent(record, fileUrl))
        .filter((e) => e.status !== 'cancelled' && e.approved)
      topics.value = topicRecords.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        kind: t.kind
      }))
    } catch (err) {
      console.error('Error fetching events:', err)
      error.value = err.message || 'Failed to load events'
    } finally {
      loading.value = false
    }
  }

  return { events, topics, loading, error, fetchAll }
}

// --- Pure helpers (ported from the Rails EventsController) --------------------

// Local YYYY-MM-DD key for grouping events by the day they fall on.
export function dateKey(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Applies the active topic and search filters (port of EventsController#filtered).
export function filterEvents(list, { topicSlug, query } = {}) {
  let result = list
  if (topicSlug) {
    result = result.filter((e) => e.topics.some((t) => t.slug === topicSlug))
  }
  if (query && query.trim()) {
    const q = query.trim().toLowerCase()
    result = result.filter(
      (e) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
    )
  }
  return result
}

// Flat, chronologically sorted upcoming events — what the grid view paginates.
// Events stay visible for the whole day they fall on: the cutoff is the start of
// today rather than the current instant, so an event whose start time has
// already elapsed still shows until the day is over.
export function upcomingEvents(list) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return list
    .filter((e) => new Date(e.start) >= startOfToday)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
}

// Upcoming events grouped by the day they fall on, each group
// { key, date, label, events }. Every occurrence is kept: the list reads as an
// agenda, so a weekly meetup appears on each date it actually happens.
export function upcomingByDay(list) {
  const groups = []
  const index = {}
  upcomingEvents(list).forEach((event) => {
    const key = dateKey(event.start)
    if (!index[key]) {
      const date = new Date(event.start)
      index[key] = {
        key,
        date,
        label: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }),
        events: []
      }
      groups.push(index[key])
    }
    index[key].events.push(event)
  })
  return groups
}

// One entry per recurring series: a weekly meetup shouldn't fill the grid with
// twelve near-identical tiles. The occurrence kept is the soonest one, since
// that's the next chance to attend; the tile labels its cadence from the
// series' recurrence rule instead of repeating the series.
//
// Expects a chronologically sorted list (upcomingEvents gives one), so the
// first occurrence seen per series is the soonest. One-off events have no
// series and always pass through.
//
// Deliberately not applied to the month grid: a calendar should mark every date
// the event actually happens.
export function collapseSeries(list) {
  const seen = new Set()
  return list.filter((event) => {
    if (!event.seriesId) return true
    if (seen.has(event.seriesId)) return false
    seen.add(event.seriesId)
    return true
  })
}

// The box the map always keeps in frame: central Indiana, from roughly
// Danville/Franklin up to Noblesville/Greenfield. Nearly every event is inside
// it, and anchoring to it stops one outlying venue (Columbus, Bloomington) from
// dragging the view off the region.
export const CENTRAL_INDIANA_BOUNDS = [
  [39.55, -86.45], // south-west
  [40.05, -85.85] // north-east
]

// The [[south, west], [north, east]] box the map should fit: central Indiana,
// stretched to take in any marker outside it.
//
// Because the region is always included, the fitted zoom can never go closer
// than "the whole region fits" — which is what keeps a single downtown venue
// from landing at street level, with no need for a maxZoom cap.
export function mapBounds(markers) {
  const [[south, west], [north, east]] = CENTRAL_INDIANA_BOUNDS
  return markers.reduce(
    (box, marker) => [
      [Math.min(box[0][0], marker.lat), Math.min(box[0][1], marker.lng)],
      [Math.max(box[1][0], marker.lat), Math.max(box[1][1], marker.lng)]
    ],
    [
      [south, west],
      [north, east]
    ]
  )
}

// Splits events into map markers and the ones that can't be plotted.
//
// Events sharing a venue become one marker rather than overlapping pins, keyed
// by rounded coordinates so two addresses that geocode to nearly the same point
// (a building and its suite number) still land together. Each marker's events
// stay in the order given, so a chronologically sorted list yields a popup that
// reads next-first.
//
// Markers are lettered A, B, C... in that same order. The label is assigned
// here rather than in the view so the pin and its legend entry are guaranteed
// to agree — they're the same object.
//
// Spreadsheet-style marker labels: A, B, ... Z, AA, AB, ... The calendar rarely
// has more than a couple of dozen venues, but the map must not run out of
// letters or start repeating them if it ever does.
export function markerLabel(index) {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

// Events that aren't on the map split two ways, because the reasons read very
// differently to a visitor:
//
//   `unmapped` — looked up, no match. Worth showing: the address probably needs
//                fixing, and only a human can do that.
//   `pending`  — has an address that hasn't been looked up yet. Nothing is
//                wrong; the hourly backfill will get to it. Counted, not listed.
//
// Events with no location at all are in neither: an online or TBD event isn't a
// missing pin.
export function groupByVenue(list) {
  const markers = []
  const index = {}
  const unmapped = []
  const pending = []

  list.forEach((event) => {
    if (!hasCoordinates(event)) {
      if (!event.location) return
      if (event.geocodeAttempted) unmapped.push(event)
      else pending.push(event)
      return
    }
    // ~11 m of precision: close enough to merge a venue, far enough to keep
    // neighbouring buildings apart.
    const key = `${event.lat.toFixed(4)},${event.lng.toFixed(4)}`
    if (!index[key]) {
      index[key] = {
        key,
        label: markerLabel(markers.length),
        lat: event.lat,
        lng: event.lng,
        location: event.location,
        events: []
      }
      markers.push(index[key])
    }
    index[key].events.push(event)
  })

  return { markers, unmapped, pending }
}

// Builds the month grid (weeks of Date) and the events on each visible day.
// Port of EventsController#load_calendar.
export function buildMonthGrid(month, list) {
  const year = month.getFullYear()
  const m = month.getMonth()

  // First day of month back to Sunday.
  const gridStart = new Date(year, m, 1)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  // Last day of month forward to Saturday.
  const gridEnd = new Date(year, m + 1, 0)
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))

  const weeks = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  const eventsByDate = {}
  list.forEach((event) => {
    const key = dateKey(event.start)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(event)
  })
  Object.values(eventsByDate).forEach((evts) =>
    evts.sort((a, b) => new Date(a.start) - new Date(b.start))
  )

  return { weeks, eventsByDate }
}
