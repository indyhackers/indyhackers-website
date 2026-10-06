import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import CalendarGrid from '@/components/events/CalendarGrid.vue'
import { dateKey } from '@/composables/useEvents'

// One week, Sunday 14 June 2026 through Saturday the 20th.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 14 + i))

function event(id, day, extra = {}) {
  return {
    id,
    title: `Event ${id}`,
    location: '',
    start: new Date(2026, 5, day, 18).toISOString(),
    end: new Date(2026, 5, day, 20).toISOString(),
    isAllDay: false,
    seriesId: '',
    series: null,
    topics: [],
    ...extra
  }
}

// { 16: 3, 18: 1 } -> three events on the 16th, one on the 18th. A day can also
// be given explicit event objects: { 16: [event(...)] }.
function eventsByDate(counts) {
  const map = {}
  Object.entries(counts).forEach(([day, value]) => {
    const date = new Date(2026, 5, Number(day))
    map[dateKey(date)] = Array.isArray(value)
      ? value
      : Array.from({ length: value }, (_, i) => event(`d${day}_${i}`, Number(day)))
  })
  return map
}

function mountGrid(counts, month = new Date(2026, 5, 1)) {
  return mount(CalendarGrid, {
    props: { month, weeks: [WEEK], eventsByDate: eventsByDate(counts) },
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

const maxEventsVar = (wrapper) => {
  const style = wrapper.find('.cal__grid').attributes('style') || ''
  const match = /--cal-max-events:\s*(\d+)/.exec(style)
  return match ? Number(match[1]) : null
}

describe('CalendarGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 14, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders every event on a day rather than truncating', () => {
    const wrapper = mountGrid({ 16: 4, 18: 1 })

    const busiest = wrapper.findAll('.cal__cell').map((cell) => cell.findAll('.cal__chip').length)
    expect(Math.max(...busiest)).toBe(4)
    expect(wrapper.findAll('.cal__chip')).toHaveLength(5)
  })

  it('no longer hides events behind a "+N more" counter', () => {
    const wrapper = mountGrid({ 16: 6 })

    expect(wrapper.find('.cal__more').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('more')
    expect(wrapper.findAll('.cal__chip')).toHaveLength(6)
  })

  it('publishes the busiest day so every cell can reserve the same height', () => {
    expect(maxEventsVar(mountGrid({ 16: 4, 18: 1 }))).toBe(4)
    expect(maxEventsVar(mountGrid({ 16: 1, 18: 1 }))).toBe(1)
    expect(maxEventsVar(mountGrid({ 15: 2, 16: 7, 20: 3 }))).toBe(7)
  })

  it('reports zero for a month with no events at all', () => {
    expect(maxEventsVar(mountGrid({}))).toBe(0)
  })

  it('shows one dot per event on the mobile layout too', () => {
    const wrapper = mountGrid({ 16: 6 })

    expect(wrapper.findAll('.cal__dot')).toHaveLength(6)
  })

  it('links each chip to its event', () => {
    const wrapper = mountGrid({ 16: 2 })

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.map((l) => l.props().to)).toEqual(['/event/d16_0', '/event/d16_1'])
  })

  it('disables the back arrow on the current month', () => {
    const wrapper = mountGrid({}, new Date(2026, 5, 1))

    expect(wrapper.find('[aria-label="Previous month"]').attributes('disabled')).toBeDefined()
  })

  it('enables the back arrow once past the current month', () => {
    const wrapper = mountGrid({}, new Date(2026, 6, 1))

    expect(wrapper.find('[aria-label="Previous month"]').attributes('disabled')).toBeUndefined()
  })

  describe('selected day (mobile)', () => {
    const agendaTitles = (wrapper) => wrapper.findAll('.cal__agenda-name').map((t) => t.text())
    const dayButton = (wrapper, day) =>
      wrapper
        .findAll('.cal__daybtn')
        .find((b) => b.attributes('aria-label').startsWith(`June ${day},`))

    it('starts on today in the current month', () => {
      const wrapper = mountGrid({ 14: 1, 16: 2 })

      expect(wrapper.find('.cal__agenda-title').text()).toBe('Sunday, June 14')
      expect(agendaTitles(wrapper)).toEqual(['Event d14_0'])
      expect(dayButton(wrapper, 14).attributes('aria-pressed')).toBe('true')
    })

    it('says so when the selected day has nothing on', () => {
      const wrapper = mountGrid({ 16: 2 })

      expect(wrapper.find('.cal__agenda-empty').text()).toBe('No events on this day.')
    })

    it('lists a tapped day in full, linking each event', async () => {
      const wrapper = mountGrid({ 16: 2 })
      await dayButton(wrapper, 16).trigger('click')

      expect(wrapper.find('.cal__agenda-title').text()).toBe('Tuesday, June 16')
      expect(agendaTitles(wrapper)).toEqual(['Event d16_0', 'Event d16_1'])
      const links = wrapper
        .findAllComponents(RouterLinkStub)
        .filter((l) => l.classes().includes('cal__agenda-item'))
      expect(links.map((l) => l.props().to)).toEqual(['/event/d16_0', '/event/d16_1'])
      expect(wrapper.find('.cal__agenda-time').text()).toBe('6:00 PM – 8:00 PM')
      expect(dayButton(wrapper, 16).attributes('aria-pressed')).toBe('true')
      expect(dayButton(wrapper, 14).attributes('aria-pressed')).toBe('false')
    })

    it('labels each day button with its event count', () => {
      const wrapper = mountGrid({ 16: 2, 18: 1 })

      expect(dayButton(wrapper, 16).attributes('aria-label')).toBe('June 16, 2 events')
      expect(dayButton(wrapper, 18).attributes('aria-label')).toBe('June 18, 1 event')
      expect(dayButton(wrapper, 17).attributes('aria-label')).toBe('June 17, no events')
    })

    it('opens a later month on its first day with events', () => {
      // July's grid here is still the test WEEK, so "in month" fails for all of
      // it; give it a July week instead.
      const july = Array.from({ length: 7 }, (_, i) => new Date(2026, 6, 5 + i))
      const map = {}
      map[dateKey(new Date(2026, 6, 8))] = [
        event('j8', 8, { start: new Date(2026, 6, 8, 18).toISOString() })
      ]
      const wrapper = mount(CalendarGrid, {
        props: { month: new Date(2026, 6, 1), weeks: [july], eventsByDate: map },
        global: { stubs: { RouterLink: RouterLinkStub } }
      })

      expect(wrapper.find('.cal__agenda-title').text()).toBe('Wednesday, July 8')
      expect(agendaTitles(wrapper)).toEqual(['Event j8'])
    })

    it('drops the tapped day when the month changes', async () => {
      const wrapper = mountGrid({ 16: 2 })
      await dayButton(wrapper, 16).trigger('click')
      await wrapper.setProps({ month: new Date(2026, 6, 1) })
      await wrapper.setProps({ month: new Date(2026, 5, 1) })

      expect(wrapper.find('.cal__agenda-title').text()).toBe('Sunday, June 14')
    })
  })

  describe('hover detail', () => {
    const hoverChip = async (wrapper, index = 0) => {
      await wrapper.findAll('.cal__chip')[index].trigger('mouseenter')
      return wrapper.find('.cal__info')
    }

    it('shows nothing until a chip is hovered', () => {
      expect(mountGrid({ 16: 1 }).find('.cal__info').exists()).toBe(false)
    })

    it('describes the hovered event', async () => {
      const wrapper = mountGrid({
        16: [
          event('evt_1', 16, {
            title: 'Indy .NET Consortium',
            location: '9000 Keystone Crossing, Indianapolis, IN'
          })
        ]
      })

      const info = await hoverChip(wrapper)
      expect(info.exists()).toBe(true)
      expect(info.find('.cal__info-title').text()).toBe('Indy .NET Consortium')
      expect(info.find('.cal__info-location').text()).toBe(
        '9000 Keystone Crossing, Indianapolis, IN'
      )
      // The specific occurrence, with its time range.
      expect(info.find('.cal__info-when').text()).toMatch(
        /^[A-Za-z]{3}, Jun 16 · \d{1,2}:\d{2} [AP]M – \d{1,2}:\d{2} [AP]M$/
      )
    })

    it('hides again on mouseleave', async () => {
      const wrapper = mountGrid({ 16: 1 })
      await hoverChip(wrapper)
      expect(wrapper.find('.cal__info').exists()).toBe(true)

      await wrapper.find('.cal__chip').trigger('mouseleave')
      expect(wrapper.find('.cal__info').exists()).toBe(false)
    })

    it('opens on keyboard focus and closes on blur', async () => {
      // Hover-only detail would be unreachable without a pointer.
      const wrapper = mountGrid({ 16: 1 })

      await wrapper.find('.cal__chip').trigger('focus')
      expect(wrapper.find('.cal__info').exists()).toBe(true)

      await wrapper.find('.cal__chip').trigger('blur')
      expect(wrapper.find('.cal__info').exists()).toBe(false)
    })

    it('adds the cadence for a recurring event, alongside the occurrence', async () => {
      const wrapper = mountGrid({
        16: [
          event('evt_1', 16, {
            seriesId: 'ser_1',
            series: { id: 'ser_1', recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=TU'] }
          })
        ]
      })

      const info = await hoverChip(wrapper)
      expect(info.find('.cal__info-cadence').text()).toBe('Every Tuesday')
      // The date of this occurrence is still shown — the grid is per-date.
      expect(info.find('.cal__info-when').text()).toContain('Jun 16')
    })

    it('leaves the cadence line out for a one-off event', async () => {
      const wrapper = mountGrid({ 16: 1 })
      const info = await hoverChip(wrapper)

      expect(info.find('.cal__info-cadence').exists()).toBe(false)
    })

    it('omits the location line when the event has no address', async () => {
      const wrapper = mountGrid({ 16: 1 })
      const info = await hoverChip(wrapper)

      expect(info.find('.cal__info-location').exists()).toBe(false)
    })

    it('shows the event being hovered, not a previously hovered one', async () => {
      const wrapper = mountGrid({
        16: [event('a', 16, { title: 'First' }), event('b', 16, { title: 'Second' })]
      })

      expect((await hoverChip(wrapper, 0)).find('.cal__info-title').text()).toBe('First')
      expect((await hoverChip(wrapper, 1)).find('.cal__info-title').text()).toBe('Second')
    })

    it('drops the native tooltip so it cannot double up with the card', async () => {
      const wrapper = mountGrid({ 16: 1 })
      expect(wrapper.find('.cal__chip').attributes('title')).toBeUndefined()
    })
  })
})
