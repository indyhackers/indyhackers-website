import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CalendarView from '@/components/CalendarView.vue'
import { createFakeEventsPocketBase } from '@/mocks/createFakeEventsPocketBase'

// EventMap calls useRouter() to route its popup links client-side, so the
// component tree needs a real router instance rather than just a RouterLink
// stub.
function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }]
  })
}

function mountCalendarView(props = {}) {
  return mount(CalendarView, {
    props,
    global: {
      plugins: [testRouter()],
      provide: { pocketbase: createFakeEventsPocketBase() },
      stubs: { RouterLink: RouterLinkStub }
    }
  })
}

const tabButton = (wrapper, label) => wrapper.findAll('button').find((b) => b.text() === label)

// The page lands on the month grid; map tests switch over first.
async function openMap(wrapper) {
  await tabButton(wrapper, 'Map').trigger('click')
  await flushPromises()
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00-04:00'))
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders upcoming events from the mocked events collection', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('AI & ML Indy: Local LLM Deployment')
    expect(text).toContain('Indy .NET User Group')
  })

  it('lands on the month calendar on a wide screen', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    expect(wrapper.find('.cal').exists()).toBe(true)
    expect(wrapper.find('.event-map__canvas').exists()).toBe(false)
    expect(tabButton(wrapper, 'Calendar').classes()).toContain('tabs__btn--active')
  })

  it('offers List, Calendar and Map tabs, in that order', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    expect(wrapper.findAll('.tabs__btn').map((b) => b.text())).toEqual(['List', 'Calendar', 'Map'])
  })

  describe('list view', () => {
    // A phone-width screen: jsdom has no matchMedia, so each test stubs one.
    function stubScreen(narrow) {
      window.matchMedia = vi.fn((query) => ({
        matches: narrow && query.includes('max-width: 639px'),
        media: query
      }))
    }

    afterEach(() => {
      delete window.matchMedia
    })

    it('lands on the list on a narrow screen', async () => {
      stubScreen(true)
      const wrapper = mountCalendarView()
      await flushPromises()

      expect(tabButton(wrapper, 'List').classes()).toContain('tabs__btn--active')
      expect(wrapper.find('.event-list').exists()).toBe(true)
      expect(wrapper.find('.cal').exists()).toBe(false)
    })

    it('still lands on the calendar on a wide screen', async () => {
      stubScreen(false)
      const wrapper = mountCalendarView()
      await flushPromises()

      expect(tabButton(wrapper, 'Calendar').classes()).toContain('tabs__btn--active')
      expect(wrapper.find('.event-list').exists()).toBe(false)
    })

    it('groups upcoming events under their day, linking each to its page', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      await tabButton(wrapper, 'List').trigger('click')

      const days = wrapper.findAll('.event-list__day-label')
      expect(days.length).toBeGreaterThan(0)
      const card = wrapper
        .findAllComponents(RouterLinkStub)
        .find((l) => l.classes().includes('event-card'))
      expect(card.props().to).toMatch(/^\/event\//)
    })

    it('honours the search box and the recurring checkbox', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      await tabButton(wrapper, 'List').trigger('click')

      const titles = () => wrapper.findAll('.event-card__title').map((t) => t.text())
      expect(titles()).toContain('Hackers Coffee')

      await wrapper.find('.calendar-recurring__box').setValue(false)
      expect(titles()).not.toContain('Hackers Coffee')
      await wrapper.find('.calendar-recurring__box').setValue(true)

      await wrapper.find('.search').setValue('zzz-no-such-event')
      expect(wrapper.find('.event-list__empty').exists()).toBe(true)
    })

    it('offers the calendar subscription', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      await tabButton(wrapper, 'List').trigger('click')

      expect(wrapper.find('.calendar-subscribe__link').exists()).toBe(true)
    })
  })

  it('no longer shows the topic filter sidebar', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    expect(wrapper.find('.topic-filters').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('All events')
  })

  it('gives the page a single top-level heading', async () => {
    // Styled down to sit under the map visually, but still an h1 — the page
    // needs one for search engines and screen-reader outlines.
    const wrapper = mountCalendarView()
    await flushPromises()

    const h1s = wrapper.findAll('h1')
    expect(h1s).toHaveLength(1)
    expect(h1s[0].text()).toBe('Indy Tech Events')
  })

  it('puts the submit call to action at the top', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    const cta = wrapper.findComponent('.calendar-hero__cta')
    expect(cta.text()).toBe('Submit an Event')
    expect(cta.props().to).toBe('/events/submit')
  })

  it('no longer offers "Recommend an Event"', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Recommend an Event')
  })

  it('offers the calendar subscription on the month view but not the map', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    // On the month view, which is where the page lands.
    const link = wrapper.find('.calendar-subscribe__link')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('Subscribe to this calendar')
    // A webcal: URL is what hands the feed to a calendar app.
    expect(link.attributes('href')).toMatch(/^webcal:\/\//)

    // Not on the map.
    await openMap(wrapper)
    expect(wrapper.find('.calendar-subscribe').exists()).toBe(false)
  })

  describe('show recurring events', () => {
    const checkbox = (wrapper) => wrapper.find('.calendar-recurring__box')

    it('is on by default, so nothing is hidden until asked', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()

      expect(checkbox(wrapper).element.checked).toBe(true)
      expect(wrapper.find('.calendar-recurring').text()).toBe('Show recurring events')
    })

    it('sits above both views, not just one', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      expect(checkbox(wrapper).exists()).toBe(true)

      await openMap(wrapper)
      expect(checkbox(wrapper).exists()).toBe(true)
    })

    it('drops recurring events from the map, keeping one-offs', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      await openMap(wrapper)

      const titles = () => wrapper.findAll('.event-map__legend-title').map((t) => t.text())
      expect(titles()).toContain('Hackers Coffee')

      await checkbox(wrapper).setValue(false)
      await flushPromises()

      // Recurring gone...
      expect(titles()).not.toContain('Hackers Coffee')
      expect(titles()).not.toContain('IndyHackers Monthly Meetup')
      // ...one-offs still there.
      expect(titles()).toContain('AI & ML Indy: Local LLM Deployment')
    })

    it('drops recurring events from the month grid too', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()

      const chips = () => wrapper.findAll('.cal__chip').map((c) => c.text())
      expect(chips().some((c) => c.includes('Hackers Coffee'))).toBe(true)

      await checkbox(wrapper).setValue(false)
      await flushPromises()

      expect(chips().some((c) => c.includes('Hackers Coffee'))).toBe(false)
      expect(chips().some((c) => c.includes('AI & ML Indy'))).toBe(true)
    })

    it('brings them back when re-checked', async () => {
      const wrapper = mountCalendarView()
      await flushPromises()
      await openMap(wrapper)

      await checkbox(wrapper).setValue(false)
      await flushPromises()
      await checkbox(wrapper).setValue(true)
      await flushPromises()

      const titles = wrapper.findAll('.event-map__legend-title').map((t) => t.text())
      expect(titles).toContain('Hackers Coffee')
    })
  })

  it('filters the map by search query', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()
    await openMap(wrapper)

    await wrapper.find('input[type="search"]').setValue('IndyPy')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('IndyPy: Python in Production')
    expect(text).not.toContain('Indy .NET User Group')
  })

  it('collapses a recurring series to one legend entry, labelled with its cadence', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()
    await openMap(wrapper)

    // The seed has two upcoming "Hackers Coffee" occurrences (Jun 17 and 24)
    // and two "IndyHackers Monthly Meetup" ones (Jun 10 past, Jul 8 upcoming).
    const titles = wrapper.findAll('.event-map__legend-title').map((t) => t.text())
    expect(titles.filter((t) => t === 'Hackers Coffee')).toHaveLength(1)
    expect(titles.filter((t) => t === 'IndyHackers Monthly Meetup')).toHaveLength(1)

    // Monthly meetup has a stored RRULE; the coffee series does not.
    const when = wrapper.findAll('.event-map__legend-when').map((w) => w.text())
    expect(when.some((w) => w.startsWith('Every 2nd Wednesday'))).toBe(true)
    expect(when.some((w) => w.startsWith('Recurring'))).toBe(true)
  })

  it('lists events whose address could not be geocoded under the map', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()
    await openMap(wrapper)

    // evt_security is seeded without coordinates.
    expect(wrapper.find('.event-map__unmapped').text()).toContain('Indy Security & Privacy Forum')
  })

  it('keeps every occurrence on the month grid', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    // June 2026 holds both weekly coffee occurrences (the 17th and 24th),
    // unlike the collapsed map legend.
    const coffee = wrapper
      .findAll('.cal__chip')
      .filter((chip) => chip.text().includes('Hackers Coffee'))
    expect(coffee).toHaveLength(2)
  })

  it('shows every event on a day, with no hidden "+N more"', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    // Nothing is truncated behind a counter a reader cannot open.
    expect(wrapper.text()).not.toContain('more')
    expect(wrapper.find('.cal__more').exists()).toBe(false)
  })

  it('will not navigate back past the current month', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    // June 2026 is "now" under the fake timer.
    expect(wrapper.find('.cal__title').text()).toMatch(/June 2026/)

    const prev = wrapper.find('[aria-label="Previous month"]')
    expect(prev.attributes('disabled')).toBeDefined()

    // Even if something fires the event anyway, the month must not move.
    await wrapper.findComponent({ name: 'CalendarGrid' }).vm.$emit('prev')
    await flushPromises()
    expect(wrapper.find('.cal__title').text()).toMatch(/June 2026/)
  })

  it('navigates forward and back again, re-enabling the arrow', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    await wrapper.find('[aria-label="Next month"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.cal__title').text()).toMatch(/July 2026/)

    const prev = wrapper.find('[aria-label="Previous month"]')
    expect(prev.attributes('disabled')).toBeUndefined()

    await prev.trigger('click')
    await flushPromises()
    expect(wrapper.find('.cal__title').text()).toMatch(/June 2026/)
  })

  it('switches to the map and back to the month calendar', async () => {
    const wrapper = mountCalendarView()
    await flushPromises()

    await openMap(wrapper)
    expect(wrapper.find('.event-map__canvas').exists()).toBe(true)
    expect(wrapper.find('.cal').exists()).toBe(false)

    await tabButton(wrapper, 'Calendar').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cal').exists()).toBe(true)
    expect(wrapper.find('.cal__title').text()).toMatch(/\d{4}/)
    expect(wrapper.find('.event-map__canvas').exists()).toBe(false)
  })
})
