// Dev-mode mock data for the events feature. MSW serves these for the
// `events`, `topics`, `event_series`, `subscriptions`, and `newsletters`
// collections so the UI works without a live PocketBase. Mirrors what the
// Google->PocketBase sync hook would produce in production (events pre-tagged
// with topics).

// --- Topics (subset of pb/migrations/024_seed_topics.js) ---------------------

const TOPIC_DEFS = [
  { slug: 'python', name: 'Python', kind: 'language', color: '#3776ab' },
  { slug: 'javascript', name: 'JavaScript', kind: 'language', color: '#f7df1e' },
  { slug: 'go', name: 'Go', kind: 'language', color: '#00add8' },
  { slug: 'rust', name: 'Rust', kind: 'language', color: '#dea584' },
  { slug: 'c-net', name: 'C#/.NET', kind: 'language', color: '#512bd4' },
  { slug: 'ruby', name: 'Ruby', kind: 'language', color: '#cc342d' },
  { slug: 'ai-ml', name: 'AI/ML', kind: 'area', color: '#10a37f' },
  { slug: 'data', name: 'Data', kind: 'area', color: '#e0245e' },
  { slug: 'devops', name: 'DevOps', kind: 'area', color: '#326ce5' },
  { slug: 'cloud', name: 'Cloud', kind: 'area', color: '#ff9900' },
  { slug: 'security', name: 'Security', kind: 'area', color: '#1f2937' },
  { slug: 'web', name: 'Web', kind: 'area', color: '#2563eb' },
  { slug: 'startup', name: 'Startup', kind: 'area', color: '#7c3aed' }
]

const topicRecords = TOPIC_DEFS.map((t) => ({
  id: `top_${t.slug.replace(/-/g, '_')}`,
  collectionId: 'topics',
  collectionName: 'topics',
  name: t.name,
  slug: t.slug,
  kind: t.kind,
  color: t.color,
  keywords: []
}))

const topicById = {}
topicRecords.forEach((t) => {
  topicById[t.id] = t
})

// --- Recurring series --------------------------------------------------------

const meetupSeries = {
  id: 'ser_monthly_meetup',
  collectionId: 'event_series',
  collectionName: 'event_series',
  google_series_id: 'gcal-monthly-meetup',
  title: 'IndyHackers Monthly Meetup',
  summary: 'Our regular monthly meetup for Indianapolis tech folks.',
  // As Google returns it on the master event (migration 035). Drives the
  // "Every 2nd Wednesday" label on the collapsed tile.
  recurrence: ['RRULE:FREQ=MONTHLY;BYDAY=2WE']
}

// A weekly series with no recurrence rule stored — the state every series is in
// until a sync backfills it. Exercises the plain "Recurring" fallback.
const coffeeSeries = {
  id: 'ser_weekly_coffee',
  collectionId: 'event_series',
  collectionName: 'event_series',
  google_series_id: 'gcal-weekly-coffee',
  title: 'Hackers Coffee',
  summary: 'Informal weekly coffee meetup.'
}

// --- Events ------------------------------------------------------------------
// June 2026 onward (today in dev is 2026-06-14). Times use EDT (-04:00).

function iso(dateStr, time) {
  return `${dateStr}T${time}:00.000-04:00`
}

const EVENT_DEFS = [
  {
    id: 'evt_meetup_jun',
    lat: 39.7745,
    lng: -86.148,
    date: '2026-06-10',
    start: '18:00',
    end: '21:00',
    title: 'IndyHackers Monthly Meetup',
    description:
      'June meetup — outdoor edition weather permitting. Project showcases and open hacking time.',
    location: 'Bottleworks District, 855 Virginia Ave, Indianapolis, IN 46203',
    series: meetupSeries.id,
    topics: ['top_startup']
  },
  ...[17, 24].map((day) => ({
    id: `evt_coffee_jun_${day}`,
    date: `2026-06-${day}`,
    start: '08:00',
    end: '09:00',
    title: 'Hackers Coffee',
    description: 'Informal coffee meetup before work. No agenda, just conversation.',
    location: "Calvin Fletcher's Coffee Co, 647 Virginia Ave, Indianapolis, IN 46203",
    lat: 39.7538,
    lng: -86.143,
    series: coffeeSeries.id,
    topics: ['top_startup']
  })),
  {
    id: 'evt_llm',
    lat: 39.7691,
    lng: -86.1583,
    date: '2026-06-16',
    start: '18:30',
    end: '20:30',
    title: 'AI & ML Indy: Local LLM Deployment',
    description:
      'Workshop on running large language models locally with Ollama, llama.cpp, and LM Studio. Bring your laptop.',
    location: 'Innovatemap, 1 W Court St, Indianapolis, IN 46204',
    topics: ['top_ai_ml', 'top_python'],
    // One seeded cover so the grid view exercises both card states: an uploaded
    // image here, generated covers on every other event.
    image: 'local_llm_workshop.jpg'
  },
  {
    id: 'evt_dotnet',
    lat: 39.9106,
    lng: -86.118,
    date: '2026-06-18',
    start: '17:30',
    end: '19:30',
    title: 'Indy .NET User Group',
    description:
      'Monthly .NET user group. Topics: .NET 9 performance improvements and minimal API patterns.',
    location: 'Apex Benefits, 9200 Keystone Crossing, Indianapolis, IN 46240',
    topics: ['top_c_net']
  },
  {
    id: 'evt_security',
    date: '2026-06-23',
    start: '18:00',
    end: '20:00',
    title: 'Indy Security & Privacy Forum',
    description:
      'OWASP Indy chapter meeting. This month: threat modeling for web apps and API security best practices.',
    location: 'Purdue Polytechnic, 799 W Michigan St, Indianapolis, IN 46202',
    topics: ['top_security', 'top_web']
  },
  {
    id: 'evt_summer_social',
    lat: 39.7674,
    lng: -86.178,
    date: '2026-06-25',
    start: '17:00',
    end: '21:00',
    title: 'IndyHackers Summer Social',
    description:
      'Annual summer social for the Indy tech community. Food, drinks, demos, and good company. Free to attend.',
    location: 'White River State Park, 801 W Washington St, Indianapolis, IN 46204',
    topics: ['top_startup']
  },
  {
    id: 'evt_aws',
    lat: 39.7684,
    lng: -86.1581,
    date: '2026-06-30',
    start: '17:30',
    end: '19:30',
    title: 'Indy AWS User Group',
    description:
      'Monthly meeting of the Indianapolis AWS User Group. This month: deep dive into ECS Fargate and container orchestration.',
    location: 'Salesforce Tower, 111 Monument Cir, Indianapolis, IN 46204',
    topics: ['top_cloud', 'top_devops']
  },
  {
    id: 'evt_vue',
    lat: 39.7754,
    lng: -86.147,
    date: '2026-07-09',
    start: '18:30',
    end: '20:30',
    title: 'Vue.js Indy — Composition API Deep Dive',
    description:
      'Hands-on workshop exploring Vue 3 Composition API patterns, composables, and best practices.',
    location: 'High Alpha, 830 Massachusetts Ave, Indianapolis, IN 46204',
    topics: ['top_javascript', 'top_web']
  },
  {
    id: 'evt_meetup_jul',
    lat: 39.9106,
    lng: -86.118,
    date: '2026-07-08',
    start: '18:00',
    end: '21:00',
    title: 'IndyHackers Monthly Meetup',
    description: 'July meetup. Lightning talks, project demos, and open discussion.',
    location: 'Eleven Fifty Academy, 9100 Keystone Crossing, Indianapolis, IN 46240',
    series: meetupSeries.id,
    topics: ['top_startup']
  },
  {
    id: 'evt_python',
    lat: 39.9,
    lng: -86.067,
    date: '2026-07-15',
    start: '18:00',
    end: '20:00',
    title: 'IndyPy: Python in Production',
    description:
      'Talks on deploying Python services: FastAPI microservices, async patterns, and observability with OpenTelemetry.',
    location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250',
    topics: ['top_python', 'top_web'],
    // A user-owned, published event: the dev admin owns it, so it shows up
    // editable under /events/mine.
    source: 'user',
    owner: 'devadmin',
    submitted_by: 'devadmin',
    locked: true
  },
  {
    id: 'evt_devops',
    lat: 39.2014,
    lng: -85.9214,
    date: '2026-07-22',
    start: '17:00',
    end: '19:30',
    title: 'DevOps Indy: GitOps & ArgoCD',
    description:
      'Learn GitOps principles and walk through setting up ArgoCD for Kubernetes continuous delivery.',
    location: 'Cummins Inc., 500 Jackson St, Columbus, IN 47201',
    topics: ['top_devops', 'top_cloud']
  },
  {
    id: 'evt_data',
    lat: 39.7715,
    lng: -86.159,
    date: '2026-07-28',
    start: '18:00',
    end: '20:00',
    title: 'Indy Data Engineering Night',
    description: 'Postgres at scale, dbt pipelines, and analytics engineering war stories.',
    location: 'Resultant, 201 N Illinois St, Indianapolis, IN 46204',
    topics: ['top_data'],
    // A user submission awaiting board approval: hidden from the public
    // calendar, shown as "Pending review" under /events/mine and in the admin
    // approvals queue.
    source: 'user',
    submitted_by: 'devadmin',
    approved: false
  }
]

const allSeries = [meetupSeries, coffeeSeries]
const seriesById = {}
allSeries.forEach((s) => {
  seriesById[s.id] = s
})

// evt_security deliberately has no lat/lng: its address was geocoded and came
// back with no match, which is what drives the map's "Not on the map" list.
const eventRecords = EVENT_DEFS.map((e) => {
  const topics = (e.topics || []).filter((id) => topicById[id])
  const record = {
    id: e.id,
    collectionId: 'events',
    collectionName: 'events',
    google_event_id: `gcal-${e.id}`,
    event_series: e.series || '',
    title: e.title,
    description: e.description || '',
    location: e.location || '',
    url: 'https://calendar.google.com',
    starts_at: iso(e.date, e.start),
    ends_at: e.end ? iso(e.date, e.end) : '',
    all_day: false,
    status: 'confirmed',
    image: e.image || '',
    // Geocoded server-side by geocode.pb.js (migration 036). PocketBase reports
    // an unset number field as 0, so mirror that rather than using null —
    // otherwise the fixtures wouldn't exercise the 0,0 filtering the real API
    // makes necessary.
    lat: e.lat ?? 0,
    lng: e.lng ?? 0,
    geocoded_address: e.location || '',
    // Ownership / moderation fields (added by migration 031). Default to a
    // vetted, published Google event unless the def overrides.
    source: e.source || 'google',
    approved: e.approved !== undefined ? e.approved : true,
    owner: e.owner || '',
    submitted_by: e.submitted_by || '',
    locked: e.locked || false,
    topics,
    raw: {},
    synced_at: iso(e.date, '00:00'),
    expand: {
      topics: topics.map((id) => topicById[id])
    }
  }
  if (e.series) {
    record.expand.event_series = seriesById[e.series]
  }
  return record
})

// A pending ownership claim so the /admin/events "Ownership claims" section has
// something to grant/deny in dev. Expanded so the admin table shows names.
const ownershipRequests = [
  {
    id: 'oreq_llm',
    collectionId: 'event_ownership_requests',
    collectionName: 'event_ownership_requests',
    event: 'evt_llm',
    requested_by: 'user_planner',
    status: 'pending',
    note: "I run the AI & ML Indy group and would like to keep this event's details current.",
    created: '2026-06-15T14:00:00Z',
    expand: {
      event: eventRecords.find((e) => e.id === 'evt_llm'),
      requested_by: { id: 'user_planner', name: 'Pat Planner', email: 'pat@example.com' }
    }
  }
]

// Keyed exactly like mocks.json entries: { collection, items }.
export const eventMocks = {
  topics: { collection: { name: 'topics' }, items: topicRecords },
  event_series: { collection: { name: 'event_series' }, items: allSeries },
  events: { collection: { name: 'events' }, items: eventRecords },
  subscriptions: { collection: { name: 'subscriptions' }, items: [] },
  event_ownership_requests: {
    collection: { name: 'event_ownership_requests' },
    items: ownershipRequests
  }
}
