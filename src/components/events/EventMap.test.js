import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import EventMap from '@/components/events/EventMap.vue'

function makeEvent(overrides = {}) {
  return {
    id: 'evt_1',
    title: 'IndyPy: Python in Production',
    location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250',
    start: '2026-07-15T18:00:00.000-04:00',
    isAllDay: false,
    lat: 39.9,
    lng: -86.067,
    geocodeAttempted: true,
    seriesId: '',
    series: null,
    ...overrides
  }
}

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }]
  })
}

// Leaflet renders popups into the map container, so every query is scoped to
// the wrapper — a document-wide lookup would find a previous test's leftovers.
let mounted = []

async function mountMap(events) {
  const router = testRouter()
  const wrapper = mount(EventMap, {
    props: { events },
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: { RouterLink: RouterLinkStub }
    }
  })
  mounted.push(wrapper)
  // Leaflet is imported lazily (it touches `window`, so it can't load during
  // the SSG prerender), which means the map appears a few ticks after mount.
  await settle(wrapper)
  return { wrapper, router }
}

// Flush until the map has initialised, or until it's clear it never will (the
// empty state renders no canvas at all).
async function settle(wrapper) {
  for (let i = 0; i < 20; i++) {
    await flushPromises()
    if (!wrapper.find('.event-map__canvas').exists()) return
    if (wrapper.find('.leaflet-container').exists()) return
    // Resolving the dynamic import needs a macrotask, not just microtasks.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('map never initialised')
}

// Opens the first pin's popup and returns its root node.
async function openPopup(wrapper) {
  await wrapper.find('.event-map__pin-wrap').trigger('click')
  await flushPromises()
  return wrapper.element.querySelector('.event-map__popup')
}

// A prop change re-renders pins on the next tick; give it one flush.
async function setEvents(wrapper, events) {
  await wrapper.setProps({ events })
  await settle(wrapper)
}

describe('EventMap', () => {
  beforeEach(() => {
    // Leaflet sizes its viewport from clientWidth/clientHeight (and positions
    // from getBoundingClientRect); jsdom reports every element as 0x0, which
    // would make fitBounds resolve to max zoom on a degenerate viewport.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 500,
      top: 0,
      left: 0,
      right: 800,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    })
  })

  afterEach(() => {
    mounted.forEach((wrapper) => wrapper.unmount())
    mounted = []
  })

  it('renders a map canvas with OpenStreetMap attribution', async () => {
    const { wrapper } = await mountMap([makeEvent()])

    expect(wrapper.find('.event-map__canvas').exists()).toBe(true)
    expect(wrapper.find('.leaflet-container').exists()).toBe(true)
    expect(wrapper.html()).toContain('openstreetmap.org/copyright')
  })

  it('letters each pin and lists it in the legend', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'b', lat: 39.7691, lng: -86.1583, location: 'Innovatemap' })
    ])

    expect(wrapper.findAll('.event-map__pin').map((p) => p.text())).toEqual(['A', 'B'])
    expect(wrapper.findAll('.event-map__legend-letter').map((l) => l.text())).toEqual(['A', 'B'])
  })

  it('keeps the address out of the legend, but reachable from it', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250' })
    ])

    // The address belongs to the popup — the legend is just name and time.
    expect(wrapper.find('.event-map__legend').text()).not.toContain('Allisonville')
    // It still names the row for assistive tech and on hover.
    const row = wrapper.find('.event-map__legend-item')
    expect(row.attributes('aria-label')).toContain('Formstack, 8604 Allisonville Rd')
    expect(row.attributes('title')).toContain('Formstack, 8604 Allisonville Rd')
  })

  it('still shows the address in the popup', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', location: 'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250' })
    ])

    const popup = await openPopup(wrapper)
    expect(popup.querySelector('.event-map__popup-venue').textContent).toBe(
      'Formstack, 8604 Allisonville Rd, Indianapolis, IN 46250'
    )
  })

  it('shows the recurrence cadence and start time instead of a date', async () => {
    const { wrapper } = await mountMap([
      makeEvent({
        id: 'weekly',
        title: 'Zionsville Code and Coffee',
        // 8am local, so the assertion holds in any timezone.
        start: new Date(2026, 6, 15, 8),
        seriesId: 'ser_1',
        series: {
          id: 'ser_1',
          title: 'Code and Coffee',
          recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE']
        }
      })
    ])

    expect(wrapper.find('.event-map__legend-when').text()).toBe('Every Wednesday at 8am')
  })

  it('falls back to "Recurring" when the series has no rule stored', async () => {
    const { wrapper } = await mountMap([
      makeEvent({
        id: 'weekly',
        start: new Date(2026, 6, 15, 8),
        seriesId: 'ser_1',
        series: { id: 'ser_1', recurrence: null }
      })
    ])

    expect(wrapper.find('.event-map__legend-when').text()).toBe('Recurring at 8am')
  })

  it('leaves an all-day recurring event without a time', async () => {
    const { wrapper } = await mountMap([
      makeEvent({
        id: 'allday',
        isAllDay: true,
        start: new Date(2026, 6, 15, 0),
        seriesId: 'ser_1',
        series: { id: 'ser_1', recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=WE'] }
      })
    ])

    expect(wrapper.find('.event-map__legend-when').text()).toBe('Every Wednesday')
  })

  it('still shows a date for a one-off event', async () => {
    const { wrapper } = await mountMap([makeEvent({ id: 'once' })])

    expect(wrapper.find('.event-map__legend-when').text()).toMatch(
      /^[A-Za-z]{3}, [A-Za-z]{3} \d+ · \d{1,2}:\d{2} [AP]M$/
    )
  })

  it('uses the same wording in the popup as in the legend', async () => {
    const { wrapper } = await mountMap([
      makeEvent({
        id: 'weekly',
        start: new Date(2026, 6, 15, 8),
        seriesId: 'ser_1',
        series: { id: 'ser_1', recurrence: ['RRULE:FREQ=MONTHLY;BYDAY=2WE'] }
      })
    ])

    const popup = await openPopup(wrapper)
    const legend = wrapper.find('.event-map__legend-when').text()
    expect(legend).toBe('Every 2nd Wednesday at 8am')
    expect(popup.querySelector('.event-map__popup-when').textContent).toBe(legend)
  })

  it('describes every event at a venue under its letter', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', title: 'First Meetup', location: 'Formstack' }),
      makeEvent({ id: 'b', title: 'Second Meetup', location: 'Formstack' })
    ])

    const entry = wrapper.find('.event-map__legend-item')
    expect(entry.find('.event-map__legend-letter').text()).toBe('A')
    expect(entry.findAll('.event-map__legend-title').map((t) => t.text())).toEqual([
      'First Meetup',
      'Second Meetup'
    ])
    // Links through to an event live in the popup, not the legend.
    expect(entry.findAllComponents(RouterLinkStub)).toHaveLength(0)
  })

  it('opens the matching popup when a legend entry is clicked', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'b', lat: 39.7691, lng: -86.1583, location: 'Innovatemap' })
    ])

    // Click the second entry — the popup must be B's, not A's.
    await wrapper.findAll('.event-map__legend-item')[1].trigger('click')
    await flushPromises()

    const popup = wrapper.element.querySelector('.event-map__popup')
    expect(popup.textContent).toContain('Innovatemap')
    expect(popup.textContent).not.toContain('Formstack')
  })

  it('opens the popup when the event title inside a row is clicked', async () => {
    // The whole row is the trigger, not just the letter.
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'b', lat: 39.7691, lng: -86.1583, location: 'Innovatemap' })
    ])

    await wrapper.findAll('.event-map__legend-title')[1].trigger('click')
    await flushPromises()

    const popup = wrapper.element.querySelector('.event-map__popup')
    expect(popup.textContent).toContain('Innovatemap')
  })

  it('opens the popup when the cadence line inside a row is clicked', async () => {
    const { wrapper } = await mountMap([makeEvent({ id: 'a', location: 'Formstack' })])

    await wrapper.find('.event-map__legend-when').trigger('click')
    await flushPromises()

    expect(wrapper.element.querySelector('.event-map__popup')).not.toBe(null)
  })

  it('gives every event in a popup its own details link', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'first', title: 'First', location: 'Formstack' }),
      makeEvent({ id: 'second', title: 'Second', location: 'Formstack' })
    ])

    const popup = await openPopup(wrapper)
    const links = popup.querySelectorAll('.event-map__popup-link')
    expect(Array.from(links).map((a) => a.textContent)).toEqual([
      'View details →',
      'View details →'
    ])
    expect(Array.from(links).map((a) => a.getAttribute('href'))).toEqual([
      '/event/first',
      '/event/second'
    ])
  })

  it("routes from the second event's details link, not the first", async () => {
    const { wrapper, router } = await mountMap([
      makeEvent({ id: 'first', title: 'First', location: 'Formstack' }),
      makeEvent({ id: 'second', title: 'Second', location: 'Formstack' })
    ])
    const push = vi.spyOn(router, 'push')

    const links = (await openPopup(wrapper)).querySelectorAll('.event-map__popup-link')
    links[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(push).toHaveBeenCalledWith('/event/second')
  })

  it('highlights the legend entry whose popup is open', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'b', lat: 39.7691, lng: -86.1583, location: 'Innovatemap' })
    ])

    await wrapper.findAll('.event-map__legend-item')[1].trigger('click')
    await flushPromises()

    const rows = wrapper.findAll('.event-map__legend-item')
    expect(rows[0].classes()).not.toContain('event-map__legend-item--active')
    expect(rows[1].classes()).toContain('event-map__legend-item--active')
  })

  it('shows no legend when nothing can be plotted', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', location: 'Nowhere', lat: null, lng: null })
    ])

    expect(wrapper.find('.event-map__legend').exists()).toBe(false)
  })

  it('drops one pin per venue', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'b', lat: 39.9, lng: -86.067, location: 'Formstack' }),
      makeEvent({ id: 'c', lat: 39.7691, lng: -86.1583, location: 'Innovatemap' })
    ])

    expect(wrapper.findAll('.event-map__pin')).toHaveLength(2)
  })

  it('lists every event at a venue in its popup, escaping user text', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', title: 'First <script>x</script>', location: 'Formstack' }),
      makeEvent({ id: 'b', title: 'Second', location: 'Formstack' })
    ])

    const popup = await openPopup(wrapper)
    expect(popup).not.toBe(null)
    const titles = popup.querySelectorAll('.event-map__popup-title')
    expect(Array.from(titles).map((n) => n.textContent)).toEqual([
      'First <script>x</script>',
      'Second'
    ])
    // Rendered as text, never parsed as markup.
    expect(popup.querySelector('script')).toBe(null)
  })

  it('routes a popup link client-side instead of reloading', async () => {
    const { wrapper, router } = await mountMap([makeEvent({ id: 'evt_42' })])
    const push = vi.spyOn(router, 'push')

    const link = (await openPopup(wrapper)).querySelector('.event-map__popup-link')
    expect(link.textContent).toBe('View details →')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)

    expect(push).toHaveBeenCalledWith('/event/evt_42')
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves a modified click to the browser', async () => {
    const { wrapper, router } = await mountMap([makeEvent({ id: 'evt_42' })])
    const push = vi.spyOn(router, 'push')

    const link = (await openPopup(wrapper)).querySelector('.event-map__popup-link')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true })
    link.dispatchEvent(event)

    expect(push).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('surfaces events whose address could not be geocoded', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a' }),
      makeEvent({ id: 'b', title: 'Unplaceable', location: 'Nowhere', lat: null, lng: null })
    ])

    const unmapped = wrapper.find('.event-map__unmapped')
    expect(unmapped.exists()).toBe(true)
    expect(unmapped.text()).toContain('Unplaceable')
    expect(unmapped.text()).toContain('Nowhere')
    expect(unmapped.text()).toContain('this address')
  })

  it('counts addresses still awaiting geocoding instead of calling them failures', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a' }),
      makeEvent({
        id: 'waiting',
        location: 'Panera Bread, Indianapolis',
        lat: null,
        lng: null,
        geocodeAttempted: false
      })
    ])

    expect(wrapper.find('.event-map__pending').text()).toContain('1 event is still being placed')
    expect(wrapper.find('.event-map__unmapped').exists()).toBe(false)
  })

  it('never drops a pin at 0,0 for a never-geocoded event', async () => {
    // PocketBase reports an unset number field as 0, so this is what an event
    // that has not been geocoded actually looks like.
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a' }),
      makeEvent({ id: 'zero', lat: 0, lng: 0, geocodeAttempted: false })
    ])

    expect(wrapper.findAll('.event-map__pin')).toHaveLength(1)
    expect(wrapper.find('.event-map__pending').exists()).toBe(true)
  })

  it('says nothing about unmapped events when every pin placed', async () => {
    const { wrapper } = await mountMap([makeEvent()])

    expect(wrapper.find('.event-map__unmapped').exists()).toBe(false)
    expect(wrapper.find('.event-map__note').exists()).toBe(false)
    expect(wrapper.find('.event-map__pending').exists()).toBe(false)
  })

  it('ignores events with no address at all', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a' }),
      makeEvent({ id: 'online', location: '', lat: null, lng: null })
    ])

    expect(wrapper.find('.event-map__unmapped').exists()).toBe(false)
    expect(wrapper.findAll('.event-map__pin')).toHaveLength(1)
  })

  it('notes when nothing can be plotted', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', location: 'Nowhere', lat: null, lng: null })
    ])

    expect(wrapper.find('.event-map__note').text()).toContain('mappable address')
    expect(wrapper.findAll('.event-map__pin')).toHaveLength(0)
  })

  it('shows an empty state with no events', async () => {
    const { wrapper } = await mountMap([])

    expect(wrapper.text()).toContain('No upcoming events match your filters.')
    expect(wrapper.find('.event-map__canvas').exists()).toBe(false)
  })

  it('re-renders pins when the filtered list changes', async () => {
    const { wrapper } = await mountMap([
      makeEvent({ id: 'a', lat: 39.9, lng: -86.067 }),
      makeEvent({ id: 'b', lat: 39.7691, lng: -86.1583 })
    ])
    expect(wrapper.findAll('.event-map__pin')).toHaveLength(2)

    await setEvents(wrapper, [makeEvent({ id: 'a', lat: 39.9, lng: -86.067 })])

    expect(wrapper.findAll('.event-map__pin')).toHaveLength(1)
  })
})
