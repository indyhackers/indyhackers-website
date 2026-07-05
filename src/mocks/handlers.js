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
  http.get('/api/collections', ({}) => {
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
