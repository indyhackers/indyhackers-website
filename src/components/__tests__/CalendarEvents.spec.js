import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { eventMocks } from '@/mocks/eventMocks'

// Pin "now" so these date-filtering tests are deterministic regardless of the
// real clock. The mock events span June 10 – July 28, 2026; we set now to the
// evening of June 16, i.e. AFTER the 18:30 "AI & ML Indy" event has started, so
// the suite also guards the "events stay visible for the whole day even once
// their start time has passed" behavior. Only Date is faked, leaving real
// timers/microtasks intact for MSW + flushPromises.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-06-16T19:00:00-04:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

// EventDetailView reads the id via useRoute(); stub it to a known recurring event.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRoute: () => ({ params: { id: 'evt_meetup_jun' } }) }
})

// A lightweight stand-in for the injected PocketBase client. (We don't use the
// real SDK + MSW here: undici's fetch in jsdom rejects the SDK's AbortSignal,
// a known test-harness quirk. The MSW handlers serve the same eventMocks data
// in the real browser.)
function fakePocketBase() {
  const data = {
    events: eventMocks.events.items,
    topics: eventMocks.topics.items,
    subscriptions: eventMocks.subscriptions.items
  }
  return {
    authStore: { isValid: false, record: null },
    collection(name) {
      return {
        getFullList: async () => data[name] || [],
        getOne: async (id) => {
          const rec = data.events.find((e) => e.id === id)
          if (!rec) throw new Error('not found')
          return rec
        },
        getFirstListItem: async () => {
          throw new Error('not found')
        },
        create: async (d) => d,
        update: async (id, d) => d,
        delete: async () => {}
      }
    }
  }
}
import CalendarView from '@/components/CalendarView.vue'
import EventDetailView from '@/views/EventDetailView.vue'
import {
  buildMonthGrid,
  upcomingByDay,
  filterEvents,
  dateKey
} from '@/composables/useEvents'

// --- Pure helpers (ported from the Rails EventsController) --------------------

describe('event grid/list helpers', () => {
  const sample = [
    { id: 'a', title: 'Ruby Night', description: 'rails talk', start: '2026-06-16T18:00:00-04:00', topics: [{ slug: 'ruby' }] },
    { id: 'b', title: 'Go Meetup', description: 'golang', start: '2026-06-18T18:00:00-04:00', topics: [{ slug: 'go' }] },
    { id: 'c', title: 'Ruby Brunch', description: 'more ruby', start: '2026-06-16T10:00:00-04:00', topics: [{ slug: 'ruby' }] }
  ]

  it('buildMonthGrid returns whole weeks starting Sunday', () => {
    const { weeks, eventsByDate } = buildMonthGrid(new Date(2026, 5, 1), sample)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    weeks.forEach((w) => expect(w).toHaveLength(7))
    expect(weeks[0][0].getDay()).toBe(0) // Sunday
    // Both June 16 events bucket on the same day, sorted by start time.
    const key = dateKey('2026-06-16T10:00:00-04:00')
    expect(eventsByDate[key].map((e) => e.id)).toEqual(['c', 'a'])
  })

  it('upcomingByDay groups by day and filterEvents honors topic + query', () => {
    const onlyRuby = filterEvents(sample, { topicSlug: 'ruby' })
    expect(onlyRuby.map((e) => e.id).sort()).toEqual(['a', 'c'])

    const search = filterEvents(sample, { query: 'golang' })
    expect(search.map((e) => e.id)).toEqual(['b'])

    // Both ruby events are on June 16 and their start times (10:00, 18:00) are
    // before now (19:00), yet they still group under today until the day ends.
    const groups = upcomingByDay(filterEvents(sample, { topicSlug: 'ruby' }))
    expect(groups).toHaveLength(1)
    expect(groups[0].events.map((e) => e.id)).toEqual(['c', 'a'])
  })
})

// --- Full path: SDK -> MSW handlers -> component render -----------------------

function mountWith(component, props = {}) {
  return mount(component, {
    props,
    global: {
      provide: { pocketbase: fakePocketBase() },
      stubs: { RouterLink: RouterLinkStub }
    }
  })
}

describe('CalendarView (SDK -> MSW -> render)', () => {
  it('renders upcoming events from the mocked events collection', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    const text = wrapper.text()
    // "AI & ML Indy" started at 18:30 on June 16; now is 19:00 the same day, so
    // it must still appear — events stay listed until their day is over.
    expect(text).toContain('AI & ML Indy: Local LLM Deployment')
    expect(text).toContain('Indy .NET User Group')
    // topic badges resolved via expand
    expect(text).toContain('AI/ML')
  })

  it('filters the list by search query', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('IndyPy')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('IndyPy: Python in Production')
    expect(text).not.toContain('Indy .NET User Group')
  })

  it('switches to the calendar grid view', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    const calendarTab = wrapper.findAll('button').find((b) => b.text() === 'Calendar')
    await calendarTab.trigger('click')
    await flushPromises()

    expect(wrapper.find('.cal').exists()).toBe(true)
    expect(wrapper.find('.cal__title').text()).toMatch(/\d{4}/) // "Month YYYY"
  })
})

describe('EventDetailView (recurring event -> reminder UI)', () => {
  it('loads a recurring event and shows the reminders panel', async () => {
    const wrapper = mount(EventDetailView, {
      global: {
        provide: { pocketbase: fakePocketBase() },
        stubs: { RouterLink: RouterLinkStub }
      }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('IndyHackers Monthly Meetup')
    expect(text).toContain('Reminders')
  })
})
