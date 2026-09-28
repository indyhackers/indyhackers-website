import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildMonthGrid,
  upcomingEvents,
  collapseSeries,
  groupByVenue,
  markerLabel,
  hasCoordinates,
  mapBounds,
  CENTRAL_INDIANA_BOUNDS,
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

  it('filterEvents honors topic + query', () => {
    const onlyRuby = filterEvents(sample, { topicSlug: 'ruby' })
    expect(onlyRuby.map((e) => e.id).sort()).toEqual(['a', 'c'])

    const search = filterEvents(sample, { query: 'golang' })
    expect(search.map((e) => e.id)).toEqual(['b'])
  })

  it('upcomingEvents drops past events and sorts chronologically', () => {
    expect(upcomingEvents(sample).map((e) => e.id)).toEqual(['c', 'a', 'b'])
  })

  describe('collapseSeries', () => {
    // Three occurrences of one weekly series, plus a one-off in between.
    const recurring = [
      { id: 'w1', seriesId: 'ser_coffee', start: '2026-06-17T08:00:00-04:00' },
      { id: 'solo', seriesId: '', start: '2026-06-18T18:00:00-04:00' },
      { id: 'w2', seriesId: 'ser_coffee', start: '2026-06-24T08:00:00-04:00' },
      { id: 'w3', seriesId: 'ser_coffee', start: '2026-07-01T08:00:00-04:00' }
    ]

    it('keeps only the soonest occurrence of each series', () => {
      expect(collapseSeries(recurring).map((e) => e.id)).toEqual(['w1', 'solo'])
    })

    it('never drops one-off events', () => {
      const oneOffs = [
        { id: 'a', seriesId: '', start: '2026-06-16T18:00:00-04:00' },
        { id: 'b', seriesId: '', start: '2026-06-18T18:00:00-04:00' }
      ]
      expect(collapseSeries(oneOffs).map((e) => e.id)).toEqual(['a', 'b'])
    })

    it('keeps distinct series separate', () => {
      const two = [
        { id: 'c1', seriesId: 'ser_coffee', start: '2026-06-17T08:00:00-04:00' },
        { id: 'm1', seriesId: 'ser_meetup', start: '2026-06-18T18:00:00-04:00' },
        { id: 'c2', seriesId: 'ser_coffee', start: '2026-06-24T08:00:00-04:00' },
        { id: 'm2', seriesId: 'ser_meetup', start: '2026-07-08T18:00:00-04:00' }
      ]
      expect(collapseSeries(two).map((e) => e.id)).toEqual(['c1', 'm1'])
    })

    it('picks the next occurrence, not a past one, when fed upcomingEvents', () => {
      const withPast = [
        { id: 'past', seriesId: 'ser_coffee', start: '2026-06-03T08:00:00-04:00' },
        { id: 'next', seriesId: 'ser_coffee', start: '2026-06-17T08:00:00-04:00' },
        { id: 'later', seriesId: 'ser_coffee', start: '2026-06-24T08:00:00-04:00' }
      ]
      expect(collapseSeries(upcomingEvents(withPast)).map((e) => e.id)).toEqual(['next'])
    })

    it('leaves the month grid alone — every occurrence still lands on its day', () => {
      const { eventsByDate } = buildMonthGrid(new Date(2026, 5, 1), recurring)
      expect(eventsByDate[dateKey('2026-06-17T08:00:00-04:00')].map((e) => e.id)).toEqual(['w1'])
      expect(eventsByDate[dateKey('2026-06-24T08:00:00-04:00')].map((e) => e.id)).toEqual(['w2'])
    })
  })

  describe('groupByVenue', () => {
    const at = (id, lat, lng, location) => ({ id, lat, lng, location })

    it('letters markers in order, so the map and its legend agree', () => {
      const { markers } = groupByVenue([
        at('a', 39.7691, -86.1583, 'First'),
        at('b', 39.9106, -86.118, 'Second'),
        at('c', 39.2014, -85.9214, 'Third')
      ])

      expect(markers.map((m) => m.label)).toEqual(['A', 'B', 'C'])
    })

    it('gives merged venues a single letter', () => {
      const { markers } = groupByVenue([
        at('a', 39.7691, -86.1583, 'Shared'),
        at('b', 39.7691, -86.1583, 'Shared'),
        at('c', 39.9106, -86.118, 'Other')
      ])

      expect(markers.map((m) => m.label)).toEqual(['A', 'B'])
      expect(markers[0].events).toHaveLength(2)
    })

    it('does not let an unmappable event consume a letter', () => {
      const { markers } = groupByVenue([
        { id: 'skip', lat: null, lng: null, location: 'Nowhere', geocodeAttempted: true },
        at('a', 39.7691, -86.1583, 'First')
      ])

      expect(markers.map((m) => m.label)).toEqual(['A'])
    })

    it('makes one marker per distinct venue', () => {
      const { markers } = groupByVenue([
        at('a', 39.7691, -86.1583, 'Innovatemap'),
        at('b', 39.9106, -86.118, 'Apex Benefits')
      ])

      expect(markers).toHaveLength(2)
      expect(markers.map((m) => m.location)).toEqual(['Innovatemap', 'Apex Benefits'])
    })

    it('merges events at the same venue into one marker', () => {
      const { markers } = groupByVenue([
        at('a', 39.7691, -86.1583, 'Innovatemap'),
        at('b', 39.7691, -86.1583, 'Innovatemap'),
        at('c', 39.9106, -86.118, 'Apex Benefits')
      ])

      expect(markers).toHaveLength(2)
      expect(markers[0].events.map((e) => e.id)).toEqual(['a', 'b'])
      expect(markers[1].events.map((e) => e.id)).toEqual(['c'])
    })

    it('merges points within a few metres of each other', () => {
      // Same building, addresses that geocode a hair apart.
      const { markers } = groupByVenue([
        at('a', 39.76911, -86.15832, 'High Alpha'),
        at('b', 39.76913, -86.15834, 'High Alpha, Suite 200')
      ])

      expect(markers).toHaveLength(1)
      expect(markers[0].events).toHaveLength(2)
    })

    it('keeps neighbouring buildings apart', () => {
      const { markers } = groupByVenue([
        at('a', 39.7691, -86.1583, 'One'),
        at('b', 39.7701, -86.1593, 'Two')
      ])

      expect(markers).toHaveLength(2)
    })

    it('never plots an event at 0,0', () => {
      // PocketBase serialises an unset number field as 0, so every event that
      // has not been geocoded yet arrives as lat/lng 0 — plotting those would
      // put a pin in the Atlantic.
      const { markers, unmapped, pending } = groupByVenue([
        at('real', 39.7691, -86.1583, 'Innovatemap'),
        { id: 'ungeocoded', lat: 0, lng: 0, location: 'Panera Bread, Indianapolis' }
      ])

      expect(markers).toHaveLength(1)
      expect(markers[0].events.map((e) => e.id)).toEqual(['real'])
      // Never looked up, so it's waiting rather than broken.
      expect(unmapped).toHaveLength(0)
      expect(pending.map((e) => e.id)).toEqual(['ungeocoded'])
    })

    it('still plots a genuine zero on one axis', () => {
      // Only the 0,0 pair is treated as unset; a real 0 latitude or longitude
      // is a valid point.
      expect(groupByVenue([at('a', 0, -86.1583, 'V')]).markers).toHaveLength(1)
      expect(groupByVenue([at('b', 39.7691, 0, 'V')]).markers).toHaveLength(1)
    })

    it('reports a looked-up address with no coordinates as unmapped', () => {
      const { markers, unmapped } = groupByVenue([
        at('a', 39.7691, -86.1583, 'Innovatemap'),
        {
          id: 'b',
          lat: null,
          lng: null,
          location: 'Somewhere unfindable',
          geocodeAttempted: true
        }
      ])

      expect(markers).toHaveLength(1)
      expect(unmapped.map((e) => e.id)).toEqual(['b'])
    })

    it('does not call an event with no address unmapped', () => {
      // An online or TBD event isn't a missing pin.
      const { markers, unmapped } = groupByVenue([
        { id: 'online', lat: null, lng: null, location: '' }
      ])

      expect(markers).toHaveLength(0)
      expect(unmapped).toHaveLength(0)
    })

    it('preserves the order it was given, so popups read next-first', () => {
      const { markers } = groupByVenue([
        { id: 'soon', lat: 39.7691, lng: -86.1583, location: 'V', start: '2026-06-17' },
        { id: 'later', lat: 39.7691, lng: -86.1583, location: 'V', start: '2026-07-17' }
      ])

      expect(markers[0].events.map((e) => e.id)).toEqual(['soon', 'later'])
    })
  })

  describe('markerLabel', () => {
    it('letters the first 26 markers A-Z', () => {
      expect(markerLabel(0)).toBe('A')
      expect(markerLabel(1)).toBe('B')
      expect(markerLabel(25)).toBe('Z')
    })

    it('rolls over to two letters rather than repeating or running out', () => {
      expect(markerLabel(26)).toBe('AA')
      expect(markerLabel(27)).toBe('AB')
      expect(markerLabel(51)).toBe('AZ')
      expect(markerLabel(52)).toBe('BA')
      expect(markerLabel(701)).toBe('ZZ')
      expect(markerLabel(702)).toBe('AAA')
    })

    it('never produces the same label twice', () => {
      const labels = Array.from({ length: 200 }, (_, i) => markerLabel(i))
      expect(new Set(labels).size).toBe(labels.length)
    })
  })

  describe('hasCoordinates', () => {
    it('accepts a real point', () => {
      expect(hasCoordinates({ lat: 39.7684, lng: -86.1581 })).toBe(true)
    })

    it('rejects 0,0, which is how PocketBase reports an unset number field', () => {
      expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(false)
    })

    it('rejects missing, null and non-numeric values', () => {
      expect(hasCoordinates({})).toBe(false)
      expect(hasCoordinates({ lat: null, lng: null })).toBe(false)
      expect(hasCoordinates({ lat: 39.7, lng: null })).toBe(false)
      expect(hasCoordinates({ lat: '39.7', lng: '-86.1' })).toBe(false)
      expect(hasCoordinates({ lat: NaN, lng: 0 })).toBe(false)
      expect(hasCoordinates(null)).toBe(false)
    })

    it('accepts a zero on a single axis', () => {
      expect(hasCoordinates({ lat: 0, lng: -86.1581 })).toBe(true)
      expect(hasCoordinates({ lat: 39.7684, lng: 0 })).toBe(true)
    })
  })

  describe('mapBounds', () => {
    const [[SOUTH, WEST], [NORTH, EAST]] = CENTRAL_INDIANA_BOUNDS
    const INDY = { lat: 39.7684, lng: -86.1581 }
    const COLUMBUS_IN = { lat: 39.2014, lng: -85.9214 } // ~40 mi south of Indy

    it('frames central Indiana when there are no markers at all', () => {
      expect(mapBounds([])).toEqual(CENTRAL_INDIANA_BOUNDS)
    })

    it('does not shrink to a lone downtown venue', () => {
      // Fitting one pin alone would land at street level and lose all context.
      expect(mapBounds([INDY])).toEqual(CENTRAL_INDIANA_BOUNDS)
    })

    it('does not shrink to a cluster of venues inside the region', () => {
      expect(mapBounds([INDY, { lat: 39.9106, lng: -86.118 }])).toEqual(CENTRAL_INDIANA_BOUNDS)
    })

    it('stretches south to take in an outlying venue', () => {
      const [[south, west], [north, east]] = mapBounds([INDY, COLUMBUS_IN])

      expect(south).toBe(COLUMBUS_IN.lat)
      // The rest of the region is untouched, so it all stays in frame.
      expect(north).toBe(NORTH)
      expect(west).toBe(WEST)
      expect(east).toBe(EAST)
    })

    it('keeps central Indiana in frame however far out a venue sits', () => {
      // Gary, in the far north-west corner of the state.
      const [[south, west], [north, east]] = mapBounds([{ lat: 41.5934, lng: -87.3464 }])

      expect(south).toBe(SOUTH)
      expect(east).toBe(EAST)
      expect(north).toBe(41.5934)
      expect(west).toBe(-87.3464)
    })

    it('stretches in every direction at once', () => {
      const [[south, west], [north, east]] = mapBounds([
        { lat: 38.0, lng: -87.5 },
        { lat: 41.6, lng: -84.8 }
      ])

      expect([south, west, north, east]).toEqual([38.0, -87.5, 41.6, -84.8])
    })

    it('does not mutate the shared region constant', () => {
      mapBounds([COLUMBUS_IN])
      expect(CENTRAL_INDIANA_BOUNDS).toEqual([
        [SOUTH, WEST],
        [NORTH, EAST]
      ])
    })
  })
})
