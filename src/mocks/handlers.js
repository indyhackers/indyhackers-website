import { http, HttpResponse } from 'msw'

import * as mocks from './mocks.json'
import { eventMocks } from './eventMocks'

// Resolve a collection from the events mock data first, then mocks.json.
const collectionData = (name) => eventMocks[name] || mocks[name]

const mockCalendarEvents = {
  items: [
    {
      id: 'evt001',
      summary: 'IndyHackers Monthly Meetup',
      description: 'Our regular monthly meetup for Indianapolis tech folks. Come hang out, share what you\'re working on, and meet other developers.',
      location: 'Eleven Fifty Academy, 9100 Keystone Crossing, Indianapolis, IN 46240',
      start: { dateTime: '2026-04-08T18:00:00-05:00' },
      end: { dateTime: '2026-04-08T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-01T12:00:00Z',
      updated: '2026-03-01T12:00:00Z'
    },
    {
      id: 'evt002',
      summary: 'Indy AWS User Group',
      description: 'Monthly meeting of the Indianapolis AWS User Group. This month: deep dive into ECS Fargate and container orchestration.',
      location: 'Salesforce Tower, 111 Monument Cir, Indianapolis, IN 46204',
      start: { dateTime: '2026-04-14T17:30:00-05:00' },
      end: { dateTime: '2026-04-14T19:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-05T12:00:00Z',
      updated: '2026-03-05T12:00:00Z'
    },
    {
      id: 'evt003',
      summary: 'Vue.js Indy — Composition API Deep Dive',
      description: 'Hands-on workshop exploring Vue 3 Composition API patterns, composables, and best practices.',
      location: 'High Alpha, 830 Massachusetts Ave, Indianapolis, IN 46204',
      start: { dateTime: '2026-04-17T18:30:00-05:00' },
      end: { dateTime: '2026-04-17T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-08T12:00:00Z',
      updated: '2026-03-08T12:00:00Z'
    },
    {
      id: 'evt004',
      summary: 'IndyPy: Python in Production',
      description: 'Talks on deploying Python services: FastAPI microservices, async patterns, and observability with OpenTelemetry.',
      location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250',
      start: { dateTime: '2026-04-22T18:00:00-05:00' },
      end: { dateTime: '2026-04-22T20:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-10T12:00:00Z',
      updated: '2026-03-10T12:00:00Z'
    },
    {
      id: 'evt005',
      summary: 'DevOps Indy: GitOps & ArgoCD',
      description: 'Learn GitOps principles and walk through setting up ArgoCD for Kubernetes continuous delivery.',
      location: 'Cummins Inc., 500 Jackson St, Columbus, IN 47201',
      start: { dateTime: '2026-04-29T17:00:00-05:00' },
      end: { dateTime: '2026-04-29T19:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-12T12:00:00Z',
      updated: '2026-03-12T12:00:00Z'
    },
    {
      id: 'evt006',
      summary: 'Women in Tech Indy — Networking Night',
      description: 'A casual networking event for women in Indianapolis tech. All experience levels welcome.',
      location: 'The Spoke Club, 6 West Washington St, Indianapolis, IN 46204',
      start: { dateTime: '2026-05-06T18:00:00-05:00' },
      end: { dateTime: '2026-05-06T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-15T12:00:00Z',
      updated: '2026-03-15T12:00:00Z'
    },
    {
      id: 'evt007',
      summary: 'Indy Game Dev Jam Weekend',
      description: '48-hour game jam for indie game developers. Theme announced at kickoff. Prizes for top three games.',
      location: 'Launch Fishers, 12175 Visionary Way, Fishers, IN 46038',
      start: { dateTime: '2026-05-09T09:00:00-05:00' },
      end: { dateTime: '2026-05-11T17:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-18T12:00:00Z',
      updated: '2026-03-18T12:00:00Z'
    },
    {
      id: 'evt008',
      summary: 'IndyHackers Monthly Meetup',
      description: 'May edition of our monthly meetup. Lightning talks, project demos, and open discussion.',
      location: 'Eleven Fifty Academy, 9100 Keystone Crossing, Indianapolis, IN 46240',
      start: { dateTime: '2026-05-13T18:00:00-05:00' },
      end: { dateTime: '2026-05-13T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-20T12:00:00Z',
      updated: '2026-03-20T12:00:00Z'
    },
    {
      id: 'evt009',
      summary: 'Indy React Meetup: Server Components',
      description: 'Exploring React Server Components in depth — when to use them, trade-offs, and real-world migration stories.',
      location: 'Resultant, 201 N Illinois St, Indianapolis, IN 46204',
      start: { dateTime: '2026-05-19T18:30:00-05:00' },
      end: { dateTime: '2026-05-19T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-22T12:00:00Z',
      updated: '2026-03-22T12:00:00Z'
    },
    {
      id: 'evt010',
      summary: 'Indy .NET User Group',
      description: 'Monthly .NET user group. Topics: .NET 9 performance improvements and minimal API patterns.',
      location: 'Apex Benefits, 9200 Keystone Crossing, Indianapolis, IN 46240',
      start: { dateTime: '2026-05-21T17:30:00-05:00' },
      end: { dateTime: '2026-05-21T19:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-25T12:00:00Z',
      updated: '2026-03-25T12:00:00Z'
    },
    {
      id: 'evt011',
      summary: 'Indy Security & Privacy Forum',
      description: 'OWASP Indy chapter meeting. This month: threat modeling for web apps and API security best practices.',
      location: 'Purdue Polytechnic, 799 W Michigan St, Indianapolis, IN 46202',
      start: { dateTime: '2026-05-28T18:00:00-05:00' },
      end: { dateTime: '2026-05-28T20:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-03-28T12:00:00Z',
      updated: '2026-03-28T12:00:00Z'
    },
    {
      id: 'evt012',
      summary: 'Tech Diversity Indy — Hiring Panel',
      description: 'Panel discussion with engineering leaders on building inclusive hiring pipelines and growing diverse teams.',
      location: 'Hanapin Marketing, 55 Monument Cir, Indianapolis, IN 46204',
      start: { dateTime: '2026-06-03T17:00:00-05:00' },
      end: { dateTime: '2026-06-03T19:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-04-01T12:00:00Z',
      updated: '2026-04-01T12:00:00Z'
    },
    {
      id: 'evt013',
      summary: 'IndyHackers Monthly Meetup',
      description: 'June meetup — outdoor edition weather permitting. Project showcases and open hacking time.',
      location: 'Bottleworks District, 855 Virginia Ave, Indianapolis, IN 46203',
      start: { dateTime: '2026-06-10T18:00:00-05:00' },
      end: { dateTime: '2026-06-10T21:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-04-01T12:00:00Z',
      updated: '2026-04-01T12:00:00Z'
    },
    {
      id: 'evt014',
      summary: 'AI & ML Indy: Local LLM Deployment',
      description: 'Workshop on running large language models locally with Ollama, llama.cpp, and LM Studio. Bring your laptop.',
      location: 'Innovatemap, 1 W Court St, Indianapolis, IN 46204',
      start: { dateTime: '2026-06-16T18:30:00-05:00' },
      end: { dateTime: '2026-06-16T20:30:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-04-01T12:00:00Z',
      updated: '2026-04-01T12:00:00Z'
    },
    {
      id: 'evt015',
      summary: 'IndyHackers Summer Social',
      description: 'Annual summer social for the Indy tech community. Food, drinks, demos, and good company. Free to attend.',
      location: 'White River State Park, 801 W Washington St, Indianapolis, IN 46204',
      start: { dateTime: '2026-06-25T17:00:00-05:00' },
      end: { dateTime: '2026-06-25T21:00:00-05:00' },
      htmlLink: 'https://calendar.google.com',
      created: '2026-04-01T12:00:00Z',
      updated: '2026-04-01T12:00:00Z'
    }
  ]
}

// In-memory Slack invite queue for dev (seeded with a couple of pending rows).
const mockDisposable = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com']
const mockSlackInvites = [
  { id: 'inv1', email: 'newdev@gmail.com', status: 'pending', country: 'US', ip: '73.12.44.8', created: '2026-06-15T01:10:00Z' },
  { id: 'inv2', email: 'visitor@example.org', status: 'pending', country: 'CA', ip: '24.55.1.9', created: '2026-06-15T01:35:00Z' }
]

// Pending (unapproved) jobs for the job-approval admin screen in dev.
const mockPendingJobs = [
  { id: 'job-p1', collectionId: 'jobs', collectionName: 'jobs', title: 'Senior Rails Engineer', company: 'Acme Co', salary_min: 120, salary_max: 160, approved: false, created: '2026-06-15T00:30:00Z', description: '<p>Build things with Rails.</p>' },
  { id: 'job-p2', collectionId: 'jobs', collectionName: 'jobs', title: 'Frontend Developer (Vue)', company: 'Startup XYZ', salary_min: 90, salary_max: 120, approved: false, created: '2026-06-15T01:05:00Z', description: '<p>Make great UIs.</p>' }
]

// In-memory job used by the self-service manage endpoints during local dev.
let manageJob = {
  id: 'managejob1',
  title: 'Senior Frontend Engineer',
  company: 'Sample Co',
  salary_min: 90,
  salary_max: 140,
  description: '<p>Build delightful UIs with Vue.</p>',
  how_to_apply: '<p>Email jobs@sample.co</p>',
  approved: true,
  filled: false
}

export const handlers = [
  http.get('https://www.googleapis.com/calendar/v3/calendars/:calendarId/events', () => {
    return HttpResponse.json(mockCalendarEvents)
  }),
  // Slack join page + approval queue. No site key in dev, so the form skips
  // reCAPTCHA. With no Cloudflare country header in dev, requests aren't
  // auto-approved — they land in the pending queue, so you can exercise the
  // admin screen at /admin/slack-invites.
  http.get('/api/slack/config', () => {
    return HttpResponse.json({ org: 'indyhackers', siteKey: '' })
  }),
  http.post('/api/slack/invite', async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const email = (body.email || '').toLowerCase()
    // Honeypot filled → pretend success, create nothing.
    if (body.website) {
      return HttpResponse.json({ ok: true, pending: true, msg: 'Thanks! Your request is in.' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return HttpResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (mockDisposable.some((d) => email.endsWith('@' + d))) {
      return HttpResponse.json({ message: 'Please use a non-disposable email address.' }, { status: 400 })
    }
    mockSlackInvites.unshift({
      id: 'inv' + (mockSlackInvites.length + 1),
      email,
      status: 'pending',
      country: '',
      ip: '127.0.0.1',
      created: new Date().toISOString()
    })
    return HttpResponse.json({
      ok: true,
      pending: true,
      msg: 'Thanks! Your request is in. A board member will approve it shortly. (dev mock)'
    })
  }),
  // Topic-based event alert signup on the Calendar page. No real confirm
  // email in dev — just pretend the double opt-in step succeeded.
  http.post('/api/event-alerts/subscribe', async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const email = (body.email || '').toLowerCase()
    if (body.website) {
      return HttpResponse.json({ ok: true, pending: true, msg: 'Thanks! Check your email to confirm.' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return HttpResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!Array.isArray(body.topics) || body.topics.length === 0) {
      return HttpResponse.json({ message: 'Please select at least one topic.' }, { status: 400 })
    }
    return HttpResponse.json({
      ok: true,
      pending: true,
      msg: 'Thanks! Check your email to confirm. (dev mock)'
    })
  }),
  // Admin queue, served by the generic collection handlers below in production;
  // mocked here so the screen works without a backend.
  http.get('/api/collections/slack_invites/records', () => {
    const items = mockSlackInvites.filter((i) => i.status === 'pending')
    return HttpResponse.json({ page: 1, perPage: 100, totalItems: items.length, totalPages: 1, items })
  }),
  http.patch('/api/collections/slack_invites/records/:id', async ({ params, request }) => {
    const patch = await request.json().catch(() => ({}))
    const rec = mockSlackInvites.find((i) => i.id === params.id)
    if (!rec) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    Object.assign(rec, patch)
    if (patch.status === 'approved') rec.invited_at = new Date().toISOString()
    return HttpResponse.json(rec)
  }),
  // Auth (dev only): there is no real PocketBase in dev, so mock just enough for
  // the login page to work. Accepts any credentials and signs you in as a fake
  // admin so the /admin/slack-invites gate can be exercised.
  http.get('/api/collections/users/auth-methods', () => {
    return HttpResponse.json({
      mfa: { enabled: false, duration: 0 },
      otp: { enabled: false, duration: 0 },
      password: { enabled: true, identityFields: ['email'] },
      // Surface the Google button in dev. The real OAuth popup needs a backend,
      // so clicking it won't complete locally — it's here to preview the UI.
      oauth2: {
        enabled: true,
        providers: [{ name: 'google', displayName: 'Google', state: '', authURL: '' }]
      }
    })
  }),
  http.post('/api/collections/users/auth-with-password', async ({ request }) => {
    const body = await request.json().catch(() => ({}))
    const identity = body.identity || 'admin@indyhackers.org'
    // PocketBase's authStore.isValid decodes the JWT expiry, so the mock token
    // must be a real JWT with a future `exp` or the session won't stick.
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(
      JSON.stringify({ id: 'devadmin', type: 'auth', collectionId: '_pb_users_auth_', exp: 4102444800 })
    )
    return HttpResponse.json({
      token: `${header}.${payload}.dev-signature`,
      record: {
        id: 'devadmin',
        collectionId: '_pb_users_auth_',
        collectionName: 'users',
        email: identity,
        verified: true,
        expand: { roles: [{ id: 'roleadmin', name: 'admin' }] }
      }
    })
  }),
  // Jobs queue (dev): filter-aware so the public list (approved) and the admin
  // approval screen (pending) both work off the same mock data.
  http.get('/api/collections/jobs/records', ({ request }) => {
    const filter = new URL(request.url).searchParams.get('filter') || ''
    const base = (mocks['jobs'] && mocks['jobs'].items) || []
    const all = [...mockPendingJobs, ...base]
    let items = all
    if (/approved\s*=\s*false/.test(filter)) items = all.filter((j) => !j.approved)
    else if (/approved\s*=\s*true/.test(filter)) items = all.filter((j) => j.approved)
    return HttpResponse.json({ page: 1, perPage: 100, totalItems: items.length, totalPages: 1, items })
  }),
  http.get('/api/collections/jobs/records/:id', ({ params }) => {
    const base = (mocks['jobs'] && mocks['jobs'].items) || []
    const rec = mockPendingJobs.find((j) => j.id === params.id) || base.find((j) => j.id === params.id)
    if (!rec) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(rec)
  }),
  http.patch('/api/collections/jobs/records/:id', async ({ params, request }) => {
    const patch = await request.json().catch(() => ({}))
    const base = (mocks['jobs'] && mocks['jobs'].items) || []
    const rec = mockPendingJobs.find((j) => j.id === params.id) || base.find((j) => j.id === params.id)
    if (!rec) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    Object.assign(rec, patch)
    return HttpResponse.json(rec)
  }),
  http.delete('/api/collections/jobs/records/:id', ({ params }) => {
    const idx = mockPendingJobs.findIndex((j) => j.id === params.id)
    if (idx !== -1) mockPendingJobs.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/collections', () => {
    const paginated = {
      page: 1,
      perPage: 100,
      totalItems: Object.keys(mocks).length,
      totalPages: 1,
      items: mocks.map((c) => c.collection)
    }
    return HttpResponse.json(paginated)
  }),
  http.get('/api/collections/:collection', ({ params }) => {
    const { collection_name } = params

    const collection = mocks[collection_name].collection
    return HttpResponse.json(collection)
  }),
  http.get('/api/collections/:collection/records', ({ params }) => {
    const { collection } = params
    const items = collectionData(collection).items

    const paginated = {
      page: 1,
      perPage: 100,
      totalItems: items.length,
      totalPages: 1,
      items
    }
    return HttpResponse.json(paginated)
  }),
  http.get('/api/collections/:collection/records/:id', ({ params }) => {
    const { collection, id } = params
    const record = collectionData(collection).items.find((el) => el.id === id)
    if (!record) {
      return HttpResponse.json({ code: 404, message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(record)
  }),
  http.post('/api/collections/:collection/records', async ({ params, request }) => {
    const { collection } = params

    let body = await request.text()
    let newRecord = JSON.parse(body)

    collectionData(collection).items.push(newRecord)
    return HttpResponse.json(newRecord)
  }),
  http.patch('/api/collections/:collection/records/:id', async ({ params, request }) => {
    const { collection, id } = params

    let body = await request.text()
    let recordUpdate = JSON.parse(body)

    let recordToUpdate = collectionData(collection).items.find((el) => el.id === id)
    //merge fields of recordUpdate and recordToUpdate

    if (recordToUpdate) {
      // Merge fields of recordUpdate and recordToUpdate
      let updatedRecord = { ...recordToUpdate, ...recordUpdate }

      // Update the entry in mocks (assuming you want to save the updated record)
      let recordIndex = collectionData(collection).items.findIndex((el) => el.id === id)
      collectionData(collection).items[recordIndex] = updatedRecord

      return HttpResponse.json(updatedRecord)
    } else {
      return HttpResponse.json({ error: 'Record not found' }, { status: 404 })
    }
  }),
  http.delete('/api/collections/:collection/records/:id', ({ params }) => {
    const { collection, id } = params
    const items = collectionData(collection).items
    const idx = items.findIndex((el) => el.id === id)
    if (idx !== -1) items.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/jobs/manage/:token', () => {
    return HttpResponse.json(manageJob)
  }),
  http.patch('/api/jobs/manage/:token', async ({ request }) => {
    const body = JSON.parse(await request.text())
    manageJob = { ...manageJob, ...body }
    return HttpResponse.json(manageJob)
  })
]
