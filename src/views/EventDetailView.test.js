import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import EventDetailView from '@/views/EventDetailView.vue'
import { createFakeEventsPocketBase } from '@/mocks/createFakeEventsPocketBase'

let routeId = 'evt_meetup_jun'

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRoute: () => ({ params: { id: routeId } }) }
})

async function mountDetail(id = 'evt_meetup_jun') {
  routeId = id
  const wrapper = mount(EventDetailView, {
    global: {
      provide: { pocketbase: createFakeEventsPocketBase() },
      stubs: { RouterLink: RouterLinkStub }
    }
  })
  // Leaflet loads lazily, so the map appears a few ticks after the event does.
  for (let i = 0; i < 20; i++) {
    await flushPromises()
    if (wrapper.find('.leaflet-container').exists()) break
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return wrapper
}

describe('EventDetailView', () => {
  beforeEach(() => {
    // Leaflet sizes its viewport from clientWidth/clientHeight; jsdom reports 0.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(256)
  })

  it('loads a recurring event and shows the reminders panel', async () => {
    const wrapper = await mountDetail()

    const text = wrapper.text()
    expect(text).toContain('IndyHackers Monthly Meetup')
    expect(text).toContain('Reminders')
  })

  it('maps the venue', async () => {
    const wrapper = await mountDetail()

    expect(wrapper.find('.event-location-map__canvas').exists()).toBe(true)
    expect(wrapper.find('.leaflet-container').exists()).toBe(true)
    expect(wrapper.findAll('.event-location-map__pin')).toHaveLength(1)
    // OpenStreetMap's licence requires the attribution to be visible.
    expect(wrapper.html()).toContain('openstreetmap.org/copyright')
  })

  it('shows no map for an event without coordinates', async () => {
    // evt_security is seeded with an address that never resolved.
    const wrapper = await mountDetail('evt_security')

    expect(wrapper.text()).toContain('Indy Security & Privacy Forum')
    expect(wrapper.find('.event-location-map__canvas').exists()).toBe(false)
  })

  it('no longer links out to Google Calendar', async () => {
    const wrapper = await mountDetail()

    expect(wrapper.text()).not.toContain('Google Calendar')
    expect(wrapper.find('.event-detail__cal-link').exists()).toBe(false)
  })
})
