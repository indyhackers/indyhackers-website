import { http, HttpResponse } from 'msw'

import * as mocks from './mocks.json'
import { eventMocks } from './eventMocks'

// Resolve a collection from the events mock data first, then mocks.json.
const collectionData = (name) => eventMocks[name] || mocks[name]

// In-memory Slack invite queue for dev (seeded with a couple of pending rows).
const mockDisposable = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com']
const mockSlackInvites = [
  { id: 'inv1', email: 'newdev@gmail.com', status: 'pending', country: 'US', ip: '73.12.44.8', created: '2026-06-15T01:10:00Z', first_name: 'Jordan', last_name: 'Lee', indiana_connection: 'Grew up in Bloomington, now building a startup in Indy.', city_region: 'Indianapolis, IN', linkedin: 'https://linkedin.com/in/jordanlee', github: 'https://github.com/jlee', coc_agreed: true, signals: { country: 'US', in_indiana: true, disposable: false, captcha_ok: true, captcha_score: 0.9, captcha_min_score: 0.5, browser_timezone: 'America/New_York', browser_same_tz_as_indy: true, tz_mismatch: false, geo: { city: 'Indianapolis', region: 'Indiana', region_code: 'IN', continent: 'NA', postal: '46204', metro_code: '527', metro_name: 'Indianapolis, IN', timezone: 'America/Indiana/Indianapolis', same_tz_as_indy: true, lat: '39.7684', lon: '-86.1581' } } },
  { id: 'inv2', email: 'visitor@example.org', status: 'pending', country: 'CA', ip: '24.55.1.9', created: '2026-06-15T01:35:00Z', first_name: 'Sam', last_name: 'Rivera', indiana_connection: 'Relocating to Fort Wayne next month for a new role.', city_region: 'Fort Wayne, IN', linkedin: '', github: 'github.com/srivera', coc_agreed: true, signals: { country: 'CA', in_indiana: false, disposable: false, captcha_ok: false, captcha_score: 0.3, captcha_min_score: 0.5, browser_timezone: 'America/New_York', browser_same_tz_as_indy: true, tz_mismatch: true, geo: { city: 'Vancouver', region: 'British Columbia', region_code: 'BC', continent: 'NA', postal: 'V6B', timezone: 'America/Vancouver', same_tz_as_indy: false, lat: '49.2827', lon: '-123.1207' } } },
  // Auto-eligible request whose Slack invite failed and fell back to the queue —
  // exercises the card's auto-invite error banner. `error` is what the backend
  // stores when slackInviteOutcome() comes back not-ok.
  { id: 'inv3', email: 'already.member@gmail.com', status: 'pending', auto: false, error: 'That email is already a member of the Slack workspace — no invite was sent.', country: 'US', ip: '99.8.7.6', created: '2026-06-15T02:05:00Z', first_name: 'Casey', last_name: 'Nguyen', indiana_connection: 'Longtime Indy resident, work downtown.', city_region: 'Indianapolis, IN', linkedin: '', github: '', coc_agreed: true, signals: { country: 'US', in_indiana: true, disposable: false, captcha_ok: true, captcha_score: 0.8, captcha_min_score: 0.5, browser_timezone: 'America/Indiana/Indianapolis', browser_same_tz_as_indy: true, tz_mismatch: false, geo: { city: 'Indianapolis', region: 'Indiana', region_code: 'IN', continent: 'NA', postal: '46202', timezone: 'America/Indiana/Indianapolis', same_tz_as_indy: true, lat: '39.7684', lon: '-86.1581' } } }
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
  filled: false,
  // ~53 days ago, so the manage page shows an expiry ~7 days out.
  approved_at: new Date(Date.now() - 53 * 24 * 60 * 60 * 1000).toISOString(),
  expiry_reminder_sent: false
}

export const handlers = [
  // Slack join page + approval queue. No site key in dev, so the form skips
  // reCAPTCHA. With no Cloudflare country header in dev, requests aren't
  // auto-approved — they land in the pending queue, so you can exercise the
  // admin screen at /admin/slack-invites.
  http.get('/api/slack/config', () => {
    return HttpResponse.json({ org: 'indyhackers', siteKey: '', autoApprove: true })
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
      created: new Date().toISOString(),
      first_name: body.first_name || '',
      last_name: body.last_name || '',
      indiana_connection: body.indiana_connection || '',
      city_region: body.city_region || '',
      linkedin: body.linkedin || '',
      github: body.github || '',
      coc_agreed: body.coc_agreed === true
    })
    return HttpResponse.json({
      ok: true,
      pending: true,
      msg: 'Thanks! Your request is in. Someone on staff will approve it shortly. (dev mock)'
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
    if (body.extend) {
      // Mirror the backend: extending resets the 60-day clock.
      manageJob = {
        ...manageJob,
        approved_at: new Date().toISOString(),
        expiry_reminder_sent: false
      }
    } else {
      manageJob = { ...manageJob, ...body }
    }
    return HttpResponse.json(manageJob)
  })
]
