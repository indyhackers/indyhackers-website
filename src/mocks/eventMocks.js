// Dev-mode mock data for the events feature. MSW serves these for the
// `events`, `topics`, `event_series`, and `subscriptions` collections so the
// calendar works without a live PocketBase. Mirrors what the Google->PocketBase
// sync hook would produce in production (events pre-tagged with topics).

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
  summary: 'Our regular monthly meetup for Indianapolis tech folks.'
}

// --- Events ------------------------------------------------------------------
// June 2026 onward (today in dev is 2026-06-14). Times use EDT (-04:00).

function iso(dateStr, time) {
  return `${dateStr}T${time}:00.000-04:00`
}

const EVENT_DEFS = [
  {
    id: 'evt_meetup_jun',
    date: '2026-06-10',
    start: '18:00',
    end: '21:00',
    title: 'IndyHackers Monthly Meetup',
    description: 'June meetup — outdoor edition weather permitting. Project showcases and open hacking time.',
    location: 'Bottleworks District, 855 Virginia Ave, Indianapolis, IN 46203',
    series: meetupSeries.id,
    topics: ['top_startup']
  },
  {
    id: 'evt_llm',
    date: '2026-06-16',
    start: '18:30',
    end: '20:30',
    title: 'AI & ML Indy: Local LLM Deployment',
    description: 'Workshop on running large language models locally with Ollama, llama.cpp, and LM Studio. Bring your laptop.',
    location: 'Innovatemap, 1 W Court St, Indianapolis, IN 46204',
    topics: ['top_ai_ml', 'top_python']
  },
  {
    id: 'evt_dotnet',
    date: '2026-06-18',
    start: '17:30',
    end: '19:30',
    title: 'Indy .NET User Group',
    description: 'Monthly .NET user group. Topics: .NET 9 performance improvements and minimal API patterns.',
    location: 'Apex Benefits, 9200 Keystone Crossing, Indianapolis, IN 46240',
    topics: ['top_c_net']
  },
  {
    id: 'evt_security',
    date: '2026-06-23',
    start: '18:00',
    end: '20:00',
    title: 'Indy Security & Privacy Forum',
    description: 'OWASP Indy chapter meeting. This month: threat modeling for web apps and API security best practices.',
    location: 'Purdue Polytechnic, 799 W Michigan St, Indianapolis, IN 46202',
    topics: ['top_security', 'top_web']
  },
  {
    id: 'evt_summer_social',
    date: '2026-06-25',
    start: '17:00',
    end: '21:00',
    title: 'IndyHackers Summer Social',
    description: 'Annual summer social for the Indy tech community. Food, drinks, demos, and good company. Free to attend.',
    location: 'White River State Park, 801 W Washington St, Indianapolis, IN 46204',
    topics: ['top_startup']
  },
  {
    id: 'evt_aws',
    date: '2026-06-30',
    start: '17:30',
    end: '19:30',
    title: 'Indy AWS User Group',
    description: 'Monthly meeting of the Indianapolis AWS User Group. This month: deep dive into ECS Fargate and container orchestration.',
    location: 'Salesforce Tower, 111 Monument Cir, Indianapolis, IN 46204',
    topics: ['top_cloud', 'top_devops']
  },
  {
    id: 'evt_vue',
    date: '2026-07-09',
    start: '18:30',
    end: '20:30',
    title: 'Vue.js Indy — Composition API Deep Dive',
    description: 'Hands-on workshop exploring Vue 3 Composition API patterns, composables, and best practices.',
    location: 'High Alpha, 830 Massachusetts Ave, Indianapolis, IN 46204',
    topics: ['top_javascript', 'top_web']
  },
  {
    id: 'evt_meetup_jul',
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
    date: '2026-07-15',
    start: '18:00',
    end: '20:00',
    title: 'IndyPy: Python in Production',
    description: 'Talks on deploying Python services: FastAPI microservices, async patterns, and observability with OpenTelemetry.',
    location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250',
    topics: ['top_python', 'top_web']
  },
  {
    id: 'evt_devops',
    date: '2026-07-22',
    start: '17:00',
    end: '19:30',
    title: 'DevOps Indy: GitOps & ArgoCD',
    description: 'Learn GitOps principles and walk through setting up ArgoCD for Kubernetes continuous delivery.',
    location: 'Cummins Inc., 500 Jackson St, Columbus, IN 47201',
    topics: ['top_devops', 'top_cloud']
  },
  {
    id: 'evt_data',
    date: '2026-07-28',
    start: '18:00',
    end: '20:00',
    title: 'Indy Data Engineering Night',
    description: 'Postgres at scale, dbt pipelines, and analytics engineering war stories.',
    location: 'Resultant, 201 N Illinois St, Indianapolis, IN 46204',
    topics: ['top_data']
  }
]

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
    topics,
    raw: {},
    synced_at: iso(e.date, '00:00'),
    expand: {
      topics: topics.map((id) => topicById[id])
    }
  }
  if (e.series) {
    record.expand.event_series = meetupSeries
  }
  return record
})

// Keyed exactly like mocks.json entries: { collection, items }.
export const eventMocks = {
  topics: { collection: { name: 'topics' }, items: topicRecords },
  event_series: { collection: { name: 'event_series' }, items: [meetupSeries] },
  events: { collection: { name: 'events' }, items: eventRecords },
  subscriptions: { collection: { name: 'subscriptions' }, items: [] }
}
