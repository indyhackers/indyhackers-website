import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// geocode_util.js is a CommonJS PocketBase hook module that references JSVM
// globals ($os, $http, $app, sleep). Load it as CommonJS with those globals
// stubbed, the same way jobs_util.spec.js does, so the tests exercise the exact
// file the hooks run.
function loadUtil() {
  const src = readFileSync(resolve(process.cwd(), 'pb/hooks/geocode_util.js'), 'utf8')
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', src)(mod, mod.exports, () => ({}))
  return mod.exports
}

const { buildRequest, parseResponse, queryCandidates, needsGeocode, validPoint } = loadUtil()

// Stand-in for a PocketBase record: only the string getters the helpers touch.
function fakeRecord(fields) {
  return {
    getString: (name) => String(fields[name] ?? '')
  }
}

describe('geocode_util.buildRequest', () => {
  it('builds a Google request with the key and a US bias', () => {
    const req = buildRequest('1 W Court St, Indianapolis, IN', {
      provider: 'google',
      apiKey: 'test-key'
    })

    expect(req.url).toContain('maps.googleapis.com/maps/api/geocode/json')
    expect(req.url).toContain('address=1%20W%20Court%20St%2C%20Indianapolis%2C%20IN')
    expect(req.url).toContain('components=country:US')
    expect(req.url).toContain('key=test-key')
  })

  it('refuses a Google request with no key', () => {
    expect(buildRequest('somewhere', { provider: 'google', apiKey: '' })).toBe(null)
  })

  it('builds a Nominatim request with an identifying User-Agent', () => {
    const req = buildRequest('High Alpha, Indianapolis, IN', {
      provider: 'nominatim',
      contact: 'board@indyhackers.org'
    })

    expect(req.url).toContain('nominatim.openstreetmap.org/search')
    expect(req.url).toContain('format=json')
    expect(req.url).toContain('countrycodes=us')
    expect(req.headers['User-Agent']).toContain('IndyHackers-website')
    expect(req.headers['User-Agent']).toContain('board@indyhackers.org')
  })

  it('falls back to the site URL when no contact is configured', () => {
    const req = buildRequest('somewhere', { provider: 'nominatim', contact: '' })
    expect(req.headers['User-Agent']).toContain('indyhackers.org')
  })

  it('returns nothing for a blank address', () => {
    expect(buildRequest('', { provider: 'nominatim' })).toBe(null)
    expect(buildRequest('   ', { provider: 'nominatim' })).toBe(null)
    expect(buildRequest(null, { provider: 'nominatim' })).toBe(null)
  })
})

describe('geocode_util.parseResponse', () => {
  const googleHit = {
    status: 'OK',
    results: [{ geometry: { location: { lat: 39.7684, lng: -86.1581 } } }]
  }

  it('reads a Google hit', () => {
    expect(parseResponse('google', 200, googleHit)).toEqual({
      point: { lat: 39.7684, lng: -86.1581 },
      settled: true
    })
  })

  it('treats ZERO_RESULTS as a settled miss', () => {
    expect(parseResponse('google', 200, { status: 'ZERO_RESULTS', results: [] })).toEqual({
      point: null,
      settled: true
    })
  })

  it('treats a quota or auth error as retryable, not a miss', () => {
    // Settled:false is what keeps a transient outage from permanently marking
    // an event unmappable.
    expect(parseResponse('google', 200, { status: 'OVER_QUERY_LIMIT' }).settled).toBe(false)
    expect(parseResponse('google', 200, { status: 'REQUEST_DENIED' }).settled).toBe(false)
    expect(parseResponse('google', 500, null).settled).toBe(false)
    expect(parseResponse('google', 429, null).settled).toBe(false)
  })

  it('reads a Nominatim hit, converting its string lat/lon', () => {
    expect(parseResponse('nominatim', 200, [{ lat: '39.7684', lon: '-86.1581' }])).toEqual({
      point: { lat: 39.7684, lng: -86.1581 },
      settled: true
    })
  })

  it('treats an empty Nominatim array as a settled miss', () => {
    expect(parseResponse('nominatim', 200, [])).toEqual({ point: null, settled: true })
  })

  it('treats a non-array Nominatim body as retryable', () => {
    expect(parseResponse('nominatim', 200, { error: 'Bandwidth limit exceeded' }).settled).toBe(
      false
    )
    expect(parseResponse('nominatim', 503, null).settled).toBe(false)
  })

  it('rejects a nonsense point rather than plotting it', () => {
    expect(parseResponse('nominatim', 200, [{ lat: 'abc', lon: 'def' }]).point).toBe(null)
    expect(parseResponse('nominatim', 200, [{ lat: '0', lon: '0' }]).point).toBe(null)
    expect(parseResponse('nominatim', 200, [{ lat: '999', lon: '-86' }]).point).toBe(null)
    expect(
      parseResponse('google', 200, {
        status: 'OK',
        results: [{ geometry: { location: { lat: 91, lng: 0 } } }]
      }).point
    ).toBe(null)
  })
})

describe('geocode_util.queryCandidates', () => {
  it('tries the full address, then again without the venue name', () => {
    // Nominatim reliably fails on the venue-prefixed form, which is exactly how
    // Google Calendar writes event locations.
    expect(
      queryCandidates('Kaffeine Coffee Company, 707 Fulton St, Indianapolis, IN 46202, USA')
    ).toEqual([
      'Kaffeine Coffee Company, 707 Fulton St, Indianapolis, IN 46202, USA',
      '707 Fulton St, Indianapolis, IN 46202, USA'
    ])
  })

  it('offers a single candidate when there is nothing to strip', () => {
    expect(queryCandidates('Indianapolis')).toEqual(['Indianapolis'])
    expect(queryCandidates('')).toEqual([''])
  })

  it('finds the street line past a venue name containing commas', () => {
    // "Half Liter Brewery, Bar, & BBQ" is one venue, three comma-separated
    // segments. Dropping only the first would leave "Bar, & BBQ," on the front
    // of every candidate, which is what left this event unplaceable.
    expect(
      queryCandidates(
        'Half Liter Brewery, Bar, & BBQ, 5301 Winthrop Ave Suite B, Indianapolis, IN 46220, USA'
      )
    ).toEqual([
      'Half Liter Brewery, Bar, & BBQ, 5301 Winthrop Ave Suite B, Indianapolis, IN 46220, USA',
      '5301 Winthrop Ave Suite B, Indianapolis, IN 46220, USA',
      // Verified against Nominatim as the form that actually resolves.
      '5301 Winthrop Ave, Indianapolis, IN 46220, USA'
    ])
  })

  it('drops a unit/suite number, which Nominatim has no data for', () => {
    // Verified against Nominatim: the "#120" form returns nothing at all
    // rather than falling back to the building.
    expect(
      queryCandidates('The Well Coffeehouse, 8890 E 116th St #120, Fishers, IN 46038, USA')
    ).toEqual([
      'The Well Coffeehouse, 8890 E 116th St #120, Fishers, IN 46038, USA',
      '8890 E 116th St #120, Fishers, IN 46038, USA',
      '8890 E 116th St, Fishers, IN 46038, USA'
    ])
  })

  it('recognises the common unit spellings', () => {
    const last = (address) => queryCandidates(address).slice(-1)[0]

    expect(last('123 Main St Ste 160, Carmel, IN')).toBe('123 Main St, Carmel, IN')
    expect(last('123 Main St Suite 200, Carmel, IN')).toBe('123 Main St, Carmel, IN')
    expect(last('123 Main St Apt 3B, Carmel, IN')).toBe('123 Main St, Carmel, IN')
    expect(last('123 Main St Unit 5, Carmel, IN')).toBe('123 Main St, Carmel, IN')
    expect(last('123 Main St #120, Carmel, IN')).toBe('123 Main St, Carmel, IN')
    expect(last('123 Main St Floor 2, Carmel, IN')).toBe('123 Main St, Carmel, IN')
  })

  it('never strips a leading segment that is itself the street address', () => {
    // Dropping it would leave "Indianapolis, IN", quietly pinning the event to
    // the city centre instead of admitting it could not be placed.
    expect(queryCandidates('830 Massachusetts Ave, Indianapolis, IN')).toEqual([
      '830 Massachusetts Ave, Indianapolis, IN'
    ])
  })

  it('does not fall back to a bare city for a venue it cannot place', () => {
    // The venue is dropped, but what remains still carries the street.
    queryCandidates('Some Venue, 1 Main St, Indianapolis, IN').forEach((candidate) => {
      expect(candidate).toContain('Main St')
    })
  })

  it('never repeats a candidate', () => {
    const candidates = queryCandidates('27 E Pine St, Zionsville, IN')
    expect(new Set(candidates).size).toBe(candidates.length)
  })

  it('does not produce an empty second candidate', () => {
    expect(queryCandidates('High Alpha,')).toEqual(['High Alpha,'])
    expect(queryCandidates(',')).toEqual([','])
  })

  it('trims surrounding whitespace', () => {
    expect(queryCandidates('  High Alpha, 830 Massachusetts Ave  ')).toEqual([
      'High Alpha, 830 Massachusetts Ave',
      '830 Massachusetts Ave'
    ])
  })
})

describe('geocode_util.validPoint', () => {
  it('accepts a real Indianapolis point', () => {
    expect(validPoint(39.7684, -86.1581)).toBe(true)
  })

  it('rejects null island, out-of-range values, and non-numbers', () => {
    expect(validPoint(0, 0)).toBe(false)
    expect(validPoint(91, 0)).toBe(false)
    expect(validPoint(0, 181)).toBe(false)
    expect(validPoint(NaN, 0)).toBe(false)
    expect(validPoint('39.7', -86)).toBe(false)
  })
})

describe('geocode_util.needsGeocode', () => {
  it('is true for an address never resolved', () => {
    expect(needsGeocode(fakeRecord({ location: 'High Alpha', geocoded_address: '' }))).toBe(true)
  })

  it('is false when the resolved address still matches', () => {
    expect(
      needsGeocode(fakeRecord({ location: 'High Alpha', geocoded_address: 'High Alpha' }))
    ).toBe(false)
  })

  it('is true when the address changed', () => {
    expect(
      needsGeocode(fakeRecord({ location: 'Innovatemap', geocoded_address: 'High Alpha' }))
    ).toBe(true)
  })

  it('is false for an event that never had an address', () => {
    expect(needsGeocode(fakeRecord({ location: '', geocoded_address: '' }))).toBe(false)
  })

  it('is true when an address is cleared, so the stale point gets dropped', () => {
    expect(needsGeocode(fakeRecord({ location: '', geocoded_address: 'High Alpha' }))).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(
      needsGeocode(fakeRecord({ location: '  High Alpha  ', geocoded_address: 'High Alpha' }))
    ).toBe(false)
  })
})
