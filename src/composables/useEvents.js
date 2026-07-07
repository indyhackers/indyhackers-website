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

// Normalizes a PocketBase events record (with expanded topics/series) into the
// shape the calendar UI consumes.
function normalizeEvent(record) {
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
    status: record.status || 'confirmed',
    seriesId: record.event_series || '',
    series: series ? { id: series.id, title: series.title } : null,
    topics
  }
}

export function useEvents() {
  const pocketbase = inject('pocketbase')

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
        .map(normalizeEvent)
        .filter((e) => e.status !== 'cancelled')
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

// Upcoming events grouped by day, each group { key, date, label, events }.
// Port of the list view branch of EventsController#index.
export function upcomingByDay(list) {
  const now = new Date()
  const upcoming = list
    .filter((e) => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  const groups = []
  const index = {}
  upcoming.forEach((event) => {
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
