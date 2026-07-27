import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildMonthGrid,
  upcomingByDay,
  filterEvents,
  dateKey
} from '@/composables/useEvents'

describe('useEvents helpers', () => {
  const sample = [
    {
      id: 'a',
      title: 'Ruby Night',
      description: 'rails talk',
      start: '2026-06-16T18:00:00-04:00',
      topics: [{ slug: 'ruby' }]
    },
    {
      id: 'b',
      title: 'Go Meetup',
      description: 'golang',
      start: '2026-06-18T18:00:00-04:00',
      topics: [{ slug: 'go' }]
    },
    {
      id: 'c',
      title: 'Ruby Brunch',
      description: 'more ruby',
      start: '2026-06-16T10:00:00-04:00',
      topics: [{ slug: 'ruby' }]
    }
  ]

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00-04:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('buildMonthGrid returns whole weeks starting Sunday', () => {
    const { weeks, eventsByDate } = buildMonthGrid(new Date(2026, 5, 1), sample)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    weeks.forEach((w) => expect(w).toHaveLength(7))
    expect(weeks[0][0].getDay()).toBe(0)
    const key = dateKey('2026-06-16T10:00:00-04:00')
    expect(eventsByDate[key].map((e) => e.id)).toEqual(['c', 'a'])
  })

  it('upcomingByDay groups by day and filterEvents honors topic + query', () => {
    const onlyRuby = filterEvents(sample, { topicSlug: 'ruby' })
    expect(onlyRuby.map((e) => e.id).sort()).toEqual(['a', 'c'])

    const search = filterEvents(sample, { query: 'golang' })
    expect(search.map((e) => e.id)).toEqual(['b'])

    const groups = upcomingByDay(filterEvents(sample, { topicSlug: 'ruby' }))
    expect(groups).toHaveLength(1)
    expect(groups[0].events.map((e) => e.id)).toEqual(['c', 'a'])
  })
})
