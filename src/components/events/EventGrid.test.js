import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import EventGrid from '@/components/events/EventGrid.vue'

// The grid paginates 12 per page (3 columns x 4 rows at desktop width).
const PER_PAGE = 12

function makeEvents(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt_${i}`,
    title: `Event ${i}`,
    description: `Description for event ${i}`,
    location: 'Indianapolis, IN',
    start: `2026-07-${String((i % 28) + 1).padStart(2, '0')}T18:00:00.000-04:00`,
    isAllDay: false,
    seriesId: '',
    image: '',
    imageThumb: '',
    topics: []
  }))
}

function mountGrid(events) {
  return mount(EventGrid, {
    props: { events },
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

const tiles = (wrapper) => wrapper.findAll('.event-tile')
const pageButton = (wrapper, label) => wrapper.findAll('button').find((b) => b.text() === label)

describe('EventGrid', () => {
  beforeEach(() => {
    // go() smooth-scrolls to the top on every page change; jsdom has no
    // implementation for it.
    window.scrollTo = vi.fn()
  })

  it('renders at most one 3x4 page of tiles', () => {
    const wrapper = mountGrid(makeEvents(20))

    expect(tiles(wrapper)).toHaveLength(PER_PAGE)
    expect(wrapper.text()).toContain('Event 0')
    expect(wrapper.text()).not.toContain('Event 12')
  })

  it('shows no pager when everything fits on one page', () => {
    const wrapper = mountGrid(makeEvents(PER_PAGE))

    expect(wrapper.find('.event-grid__pager').exists()).toBe(false)
    expect(tiles(wrapper)).toHaveLength(PER_PAGE)
  })

  it('pages forward to the remaining events', async () => {
    const wrapper = mountGrid(makeEvents(14))

    expect(wrapper.findAll('.event-grid__page-num')).toHaveLength(2)

    await pageButton(wrapper, 'Next →').trigger('click')

    expect(tiles(wrapper)).toHaveLength(2)
    expect(wrapper.text()).toContain('Event 12')
    expect(wrapper.text()).toContain('Event 13')
    expect(wrapper.text()).not.toContain('Event 0')
    expect(wrapper.text()).toContain('Showing 13–14 of 14 upcoming events')
  })

  it('disables Prev on the first page and Next on the last', async () => {
    const wrapper = mountGrid(makeEvents(14))

    expect(pageButton(wrapper, '← Prev').attributes('disabled')).toBeDefined()
    expect(pageButton(wrapper, 'Next →').attributes('disabled')).toBeUndefined()

    await pageButton(wrapper, 'Next →').trigger('click')

    expect(pageButton(wrapper, '← Prev').attributes('disabled')).toBeUndefined()
    expect(pageButton(wrapper, 'Next →').attributes('disabled')).toBeDefined()
  })

  it('jumps to a numbered page', async () => {
    const wrapper = mountGrid(makeEvents(30))

    await pageButton(wrapper, '3').trigger('click')

    expect(tiles(wrapper)).toHaveLength(6)
    expect(wrapper.text()).toContain('Event 24')
  })

  it('falls back to the last page when filtering shrinks the list', async () => {
    const wrapper = mountGrid(makeEvents(30))

    await pageButton(wrapper, '3').trigger('click')
    expect(wrapper.text()).toContain('Event 24')

    // A topic filter or search narrows the list out from under page 3.
    await wrapper.setProps({ events: makeEvents(5) })

    expect(tiles(wrapper)).toHaveLength(5)
    expect(wrapper.find('.event-grid__pager').exists()).toBe(false)
  })

  it('shows an empty state with no events', () => {
    const wrapper = mountGrid([])

    expect(tiles(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain('No upcoming events match your filters.')
  })
})
