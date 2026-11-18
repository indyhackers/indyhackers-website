import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// calendar_sync.js is a CommonJS PocketBase hook module built around JSVM
// globals. Load it with those globals stubbed (same approach as
// jobs_util.spec.js) so the backfill logic is exercised as written.
//
// Only geocodePendingEvents/backfillGeocodes are covered here: the Google feed
// path needs a live calendar, but the backfill is pure record bookkeeping and
// its "don't re-request on failure" rule is easy to regress.
function loadSync({ records = [], geo = {}, env = {} } = {}) {
  const calls = { saved: [], geocoded: [], deleted: [], queries: [] }

  globalThis.__hooks = '/hooks'
  globalThis.$os = { getenv: (name) => env[name] ?? '' }
  globalThis.$app = {
    findRecordsByFilter: (collection, filter, sort, limit, offset, params) => {
      calls.queries.push({ collection, filter, sort, limit, offset, params })
      return records
    },
    save: (record) => calls.saved.push(record),
    delete: (record) => calls.deleted.push(record)
  }

  const geoModule = {
    needsGeocode:
      geo.needsGeocode ?? ((r) => r.getString('location') !== r.getString('geocoded_address')),
    applyGeocode:
      geo.applyGeocode ??
      ((r) => {
        calls.geocoded.push(r)
        r.set('geocoded_address', r.getString('location'))
      })
  }

  const src = readFileSync(resolve(process.cwd(), 'pb/hooks/calendar_sync.js'), 'utf8')
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', src)(mod, mod.exports, (id) => {
    if (id.endsWith('geocode_util.js')) return geoModule
    return {}
  })

  return { sync: mod.exports, calls }
}

// Stand-in for a PocketBase record: the getters/setters the backfill touches.
function fakeRecord(id, fields) {
  const data = { ...fields }
  return {
    id,
    getString: (name) => String(data[name] ?? ''),
    getBool: (name) => !!data[name],
    get: (name) => data[name],
    set: (name, value) => {
      data[name] = value
    },
    _data: data
  }
}

describe('calendar_sync geocode backfill', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete globalThis.__hooks
    delete globalThis.$os
    delete globalThis.$app
    vi.restoreAllMocks()
  })

  it('geocodes and saves an event that has never been resolved', () => {
    const record = fakeRecord('evt_1', { location: 'High Alpha', geocoded_address: '' })
    const { sync, calls } = loadSync({ records: [record] })

    const result = sync.geocodePendingEvents()

    expect(calls.geocoded.map((r) => r.id)).toEqual(['evt_1'])
    expect(calls.saved.map((r) => r.id)).toEqual(['evt_1'])
    expect(result.geocoded).toBe(1)
  })

  it('skips events whose address is already resolved', () => {
    const record = fakeRecord('evt_1', {
      location: 'High Alpha',
      geocoded_address: 'High Alpha'
    })
    const { sync, calls } = loadSync({ records: [record] })

    const result = sync.geocodePendingEvents()

    expect(calls.geocoded).toHaveLength(0)
    expect(calls.saved).toHaveLength(0)
    expect(result.geocoded).toBe(0)
  })

  it('does not save after a transient failure, so the hook cannot re-request', () => {
    // applyGeocode leaves geocoded_address alone when it couldn't reach the
    // provider. Saving anyway would fire the geocode record hook and spend a
    // second request on the same address.
    const record = fakeRecord('evt_1', { location: 'High Alpha', geocoded_address: '' })
    const { sync, calls } = loadSync({
      records: [record],
      geo: {
        applyGeocode: (r) => {
          calls.geocoded.push(r)
        }
      }
    })

    const result = sync.geocodePendingEvents()

    expect(calls.geocoded).toHaveLength(1)
    expect(calls.saved).toHaveLength(0)
    expect(result.geocoded).toBe(0)
  })

  it('saves a settled miss so the same address is not retried', () => {
    // No coordinates found, but the attempt is recorded — needsGeocode goes
    // false and the map lists the event as unplaceable.
    const record = fakeRecord('evt_1', { location: 'Nowhere', geocoded_address: '' })
    const { sync, calls } = loadSync({
      records: [record],
      geo: {
        applyGeocode: (r) => {
          r.set('lat', null)
          r.set('lng', null)
          r.set('geocoded_address', r.getString('location'))
        }
      }
    })

    sync.geocodePendingEvents()

    expect(calls.saved.map((r) => r.id)).toEqual(['evt_1'])
    expect(record._data.geocoded_address).toBe('Nowhere')
  })

  it('keeps going when one event throws', () => {
    const bad = fakeRecord('bad', { location: 'A', geocoded_address: '' })
    const good = fakeRecord('good', { location: 'B', geocoded_address: '' })
    const { sync, calls } = loadSync({
      records: [bad, good],
      geo: {
        applyGeocode: (r) => {
          if (r.id === 'bad') throw new Error('boom')
          r.set('geocoded_address', r.getString('location'))
        }
      }
    })

    const result = sync.geocodePendingEvents()

    expect(calls.saved.map((r) => r.id)).toEqual(['good'])
    expect(result.geocoded).toBe(1)
  })

  it('counts only events that actually saved when one save fails', () => {
    const a = fakeRecord('a', { location: 'A', geocoded_address: '' })
    const b = fakeRecord('b', { location: 'B', geocoded_address: '' })
    const { sync } = loadSync({ records: [a, b] })
    const original = globalThis.$app.save
    globalThis.$app.save = (record) => {
      if (record.id === 'a') throw new Error('db locked')
      return original(record)
    }

    const result = sync.geocodePendingEvents()

    expect(result.geocoded).toBe(1)
  })

  describe('retry mode', () => {
    // A remembered miss: the address was resolved, came back with no match, and
    // needsGeocode is therefore false.
    const cachedMiss = () =>
      fakeRecord('evt_1', { location: 'High Alpha', geocoded_address: 'High Alpha', lat: null })

    it('leaves remembered misses alone by default', () => {
      const { sync, calls } = loadSync({ records: [cachedMiss()] })

      sync.geocodePendingEvents()

      expect(calls.geocoded).toHaveLength(0)
      expect(calls.saved).toHaveLength(0)
    })

    it('re-asks a remembered miss and saves the point it finds', () => {
      // The resolved address is identical before and after, so the save has to
      // key off the coordinates — this is what a provider switch depends on.
      const record = cachedMiss()
      const { sync, calls } = loadSync({
        records: [record],
        geo: {
          applyGeocode: (r) => {
            r.set('lat', 39.7684)
            r.set('lng', -86.1581)
            r.set('geocoded_address', r.getString('location'))
          }
        }
      })

      const result = sync.geocodePendingEvents('', true)

      expect(calls.saved.map((r) => r.id)).toEqual(['evt_1'])
      expect(record._data.lat).toBe(39.7684)
      expect(result.geocoded).toBe(1)
    })

    it('does not write when a retried miss is still a miss', () => {
      const record = cachedMiss()
      const { sync, calls } = loadSync({
        records: [record],
        geo: {
          applyGeocode: (r) => {
            r.set('lat', null)
            r.set('geocoded_address', r.getString('location'))
          }
        }
      })

      const result = sync.geocodePendingEvents('', true)

      expect(calls.saved).toHaveLength(0)
      expect(result.geocoded).toBe(0)
      // The cache key survives, so it is not re-asked on the next plain run.
      expect(record._data.geocoded_address).toBe('High Alpha')
    })

    it('restores the cache key when the provider is unreachable', () => {
      const record = cachedMiss()
      const { sync, calls } = loadSync({
        records: [record],
        // applyGeocode leaves everything untouched on a transient failure.
        geo: { applyGeocode: () => {} }
      })

      sync.geocodePendingEvents('', true)

      expect(calls.saved).toHaveLength(0)
      expect(record._data.geocoded_address).toBe('High Alpha')
    })

    it('restores the cache key when applyGeocode throws', () => {
      const record = cachedMiss()
      const { sync, calls } = loadSync({
        records: [record],
        geo: {
          applyGeocode: () => {
            throw new Error('boom')
          }
        }
      })

      sync.geocodePendingEvents('', true)

      expect(calls.saved).toHaveLength(0)
      expect(record._data.geocoded_address).toBe('High Alpha')
    })
  })

  it('caps how many it resolves per run', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      fakeRecord(`evt_${i}`, { location: `Place ${i}`, geocoded_address: '' })
    )
    const { sync, calls } = loadSync({ records, env: { GEOCODE_BACKFILL_LIMIT: '3' } })

    const result = sync.geocodePendingEvents()

    expect(result.geocoded).toBe(3)
    expect(calls.geocoded).toHaveLength(3)
  })

  it('lets an explicit limit override the configured cap', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      fakeRecord(`evt_${i}`, { location: `Place ${i}`, geocoded_address: '' })
    )
    const { sync } = loadSync({ records, env: { GEOCODE_BACKFILL_LIMIT: '3' } })

    expect(sync.geocodePendingEvents('8').geocoded).toBe(8)
  })

  it('only looks at upcoming events that have an address', () => {
    const { sync, calls } = loadSync({ records: [] })

    sync.geocodePendingEvents()

    const query = calls.queries[0]
    expect(query.collection).toBe('events')
    expect(query.filter).toContain("location != ''")
    expect(query.filter).toContain('starts_at >=')
    expect(query.sort).toBe('starts_at')
    // Soonest first, and from the start of today so an event happening later
    // today still gets a pin.
    expect(new Date(query.params.from).getHours()).toBe(0)
  })

  it('survives a failed query without throwing', () => {
    const { sync } = loadSync({ records: [] })
    globalThis.$app.findRecordsByFilter = () => {
      throw new Error('no such column')
    }

    expect(() => sync.geocodePendingEvents()).not.toThrow()
    expect(sync.geocodePendingEvents().geocoded).toBe(0)
  })
})

describe('calendar_sync reconciliation', () => {
  const NOW = new Date('2026-09-20T12:00:00.000Z')
  const cfg = { windowDays: 90 }

  // A synced, unlocked row inside the window — the only shape that is ever a
  // prune candidate.
  const syncedRow = (id, gid, fields = {}) =>
    fakeRecord(id, {
      google_event_id: gid,
      source: 'google',
      locked: false,
      starts_at: '2026-10-07T22:00:00.000Z',
      ...fields
    })

  function prune({ records = [], seenIds = {}, feedSize = 5, env = {} } = {}) {
    const { sync, calls } = loadSync({ records, env })
    const result = { pruned: 0 }
    sync.pruneMissingEvents(cfg, NOW, seenIds, feedSize, result)
    return { calls, result }
  }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete globalThis.__hooks
    delete globalThis.$os
    delete globalThis.$app
    vi.restoreAllMocks()
  })

  it('removes a row the calendar no longer returns', () => {
    // Google omits deleted events rather than reporting them cancelled, so
    // absence from the feed is the only signal there is.
    const gone = syncedRow('evt_gone', 'gid_gone')
    const { calls, result } = prune({ records: [gone], seenIds: { gid_kept: true } })

    expect(calls.deleted.map((r) => r.id)).toEqual(['evt_gone'])
    expect(result.pruned).toBe(1)
  })

  it('keeps rows the feed still returns', () => {
    const kept = syncedRow('evt_kept', 'gid_kept')
    const { calls, result } = prune({ records: [kept], seenIds: { gid_kept: true } })

    expect(calls.deleted).toHaveLength(0)
    expect(result.pruned).toBe(0)
  })

  it('starts the window at the first of the current month, not at now', () => {
    // Anchoring to `now` left every day earlier in the month with no events,
    // which is what the month grid was showing as empty.
    const { calls } = prune({ records: [] })
    const from = new Date(calls.queries[0].params.from)

    expect(from.getDate()).toBe(1)
    expect(from.getMonth()).toBe(NOW.getMonth())
    expect(from.getFullYear()).toBe(NOW.getFullYear())
    expect(from.getTime()).toBeLessThan(NOW.getTime())
  })

  it('scopes the query to unlocked Google rows inside the sync window', () => {
    // The filter is the safety boundary, so assert it rather than trusting the
    // stub to have returned only eligible rows.
    const { calls } = prune({ records: [] })
    const query = calls.queries[0]

    expect(query.collection).toBe('events')
    expect(query.filter).toContain("source = 'google'")
    expect(query.filter).toContain('locked = false')
    expect(query.filter).toContain('starts_at >=')
    expect(query.filter).toContain('starts_at <=')
    // 90 days past `now`, matching the window the feed was fetched with.
    expect(query.params.to).toBe(new Date('2026-12-19T12:00:00.000Z').toISOString())
  })

  it('refuses to prune when the feed came back empty', () => {
    // Indistinguishable from a wrong calendar id or a 200 with no body —
    // pruning here would empty the calendar.
    const gone = syncedRow('evt_gone', 'gid_gone')
    const { calls, result } = prune({ records: [gone], seenIds: {}, feedSize: 0 })

    expect(calls.deleted).toHaveLength(0)
    expect(result.pruned).toBe(0)
    // It does not even ask the database.
    expect(calls.queries).toHaveLength(0)
  })

  it('can be switched off entirely', () => {
    const gone = syncedRow('evt_gone', 'gid_gone')
    const { calls } = prune({ records: [gone], env: { CALENDAR_PRUNE: 'off' } })

    expect(calls.deleted).toHaveLength(0)
    expect(calls.queries).toHaveLength(0)
  })

  it('never removes a row with no Google id', () => {
    // Nothing to match against the feed, so absence proves nothing.
    const orphan = syncedRow('evt_orphan', '')
    const { calls } = prune({ records: [orphan], seenIds: {} })

    expect(calls.deleted).toHaveLength(0)
  })

  it('keeps going when one delete fails', () => {
    const { sync, calls } = loadSync({
      records: [syncedRow('a', 'gid_a'), syncedRow('b', 'gid_b')]
    })
    const succeeded = globalThis.$app.delete
    globalThis.$app.delete = (record) => {
      if (record.id === 'a') throw new Error('fk constraint')
      return succeeded(record)
    }

    const result = { pruned: 0 }
    sync.pruneMissingEvents(cfg, NOW, {}, 5, result)

    expect(calls.deleted.map((r) => r.id)).toEqual(['b'])
    expect(result.pruned).toBe(1)
  })

  it('survives a failed query without throwing', () => {
    const { sync } = loadSync({ records: [] })
    globalThis.$app.findRecordsByFilter = () => {
      throw new Error('no such column')
    }
    const result = { pruned: 0 }

    expect(() => sync.pruneMissingEvents(cfg, NOW, {}, 5, result)).not.toThrow()
    expect(result.pruned).toBe(0)
  })
})
