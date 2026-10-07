import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import EventGridCard from '@/components/events/EventGridCard.vue'

const baseEvent = {
  id: 'evt_1',
  title: 'IndyPy: Python in Production',
  description: '<p>Talks on deploying <strong>Python</strong> services.</p>',
  location: 'Formstack, Indianapolis, IN',
  start: '2026-07-15T18:00:00.000-04:00',
  isAllDay: false,
  seriesId: '',
  series: null,
  image: '',
  imageThumb: '',
  topics: []
}

// CI runs in UTC while a laptop does not, so derive the expected label from the
// same instant rather than hard-coding a wall-clock time.
function expectedWhen(iso, { allDay = false } = {}) {
  const start = new Date(iso)
  const date = start
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase()
  if (allDay) return `${date} · ALL DAY`
  const time = start
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toUpperCase()
  return `${date} · ${time}`
}

function mountCard(overrides = {}) {
  return mount(EventGridCard, {
    props: { event: { ...baseEvent, ...overrides } },
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('EventGridCard', () => {
  it('renders the uploaded cover, preferring the thumb', () => {
    const wrapper = mountCard({
      image: 'http://localhost/api/files/events/evt_1/cover.jpg',
      imageThumb: 'http://localhost/api/files/events/evt_1/cover.jpg?thumb=640x360f'
    })

    const img = wrapper.find('.event-tile__img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('thumb=640x360f')
    expect(wrapper.find('.event-tile__fallback').exists()).toBe(false)
  })

  it('draws a generated cover when the event has no image', () => {
    const wrapper = mountCard()

    expect(wrapper.find('.event-tile__img').exists()).toBe(false)
    // "IndyPy:" and "Python" -> IP
    expect(wrapper.find('.event-tile__initials').text()).toBe('IP')
  })

  it('skips leading punctuation when building initials', () => {
    const wrapper = mountCard({ title: 'Indy .NET User Group' })

    expect(wrapper.find('.event-tile__initials').text()).toBe('IN')
  })

  it('keys the generated cover off the first topic color', () => {
    const wrapper = mountCard({
      topics: [{ id: 'top_python', name: 'Python', slug: 'python', color: '#3776ab' }]
    })

    const style = wrapper.find('.event-tile__fallback').attributes('style')
    expect(style).toContain('--cover-from: #3776ab')
    // Second stop is the same hue darkened 55%.
    expect(style).toContain('--cover-to: #19354d')
  })

  it('hashes a cover hue from the title when the event has no topics', () => {
    const style = mountCard().find('.event-tile__fallback').attributes('style')

    expect(style).toMatch(/--cover-from: hsl\(\d+, 55%, 48%\)/)
    expect(style).toMatch(/--cover-to: hsl\(\d+, 55%, 30%\)/)
  })

  it('falls back to the generated cover when the image fails to load', async () => {
    const wrapper = mountCard({ imageThumb: 'http://localhost/api/files/events/evt_1/gone.jpg' })

    await wrapper.find('.event-tile__img').trigger('error')

    expect(wrapper.find('.event-tile__img').exists()).toBe(false)
    expect(wrapper.find('.event-tile__fallback').exists()).toBe(true)
  })

  it('shows the date, time, and a plain-text summary', () => {
    const wrapper = mountCard()

    expect(wrapper.find('.event-tile__when').text()).toBe(expectedWhen(baseEvent.start))
    expect(wrapper.find('.event-tile__when').text()).toMatch(
      /^[A-Z]{3}, JUL \d+ · \d{1,2}:\d{2} [AP]M$/
    )
    expect(wrapper.find('.event-tile__summary').text()).toBe('Talks on deploying Python services.')
  })

  it('labels all-day events instead of printing a time', () => {
    const wrapper = mountCard({ isAllDay: true })

    expect(wrapper.find('.event-tile__when').text()).toBe(
      expectedWhen(baseEvent.start, { allDay: true })
    )
  })

  it('labels a recurring series with its cadence', () => {
    const wrapper = mountCard({
      seriesId: 'ser_monthly_meetup',
      series: {
        id: 'ser_monthly_meetup',
        title: 'IndyHackers Monthly Meetup',
        recurrence: ['RRULE:FREQ=MONTHLY;BYDAY=3WE']
      }
    })

    expect(wrapper.find('.event-tile__badge').text()).toBe('Every 3rd Wednesday')
    // The date below is the next occurrence, not the only one.
    expect(wrapper.find('.event-tile__when').text()).toContain('· Next')
  })

  it('falls back to "Recurring" when the series has no rule yet', () => {
    const wrapper = mountCard({
      seriesId: 'ser_weekly_coffee',
      series: { id: 'ser_weekly_coffee', title: 'Hackers Coffee', recurrence: null }
    })

    expect(wrapper.find('.event-tile__badge').text()).toBe('Recurring')
  })

  it('shows no badge and no "Next" marker for a one-off event', () => {
    const wrapper = mountCard()

    expect(wrapper.find('.event-tile__badge').exists()).toBe(false)
    expect(wrapper.find('.event-tile__when').text()).not.toContain('Next')
  })
})
