/// <reference path="../pb_data/types.d.ts" />

// Address -> coordinates for the calendar's map view. Shared helpers for
// geocode.pb.js. PocketBase runs each hook handler in an isolated JSVM runtime
// that can't see the hook file's module scope, so these are require()'d from
// inside each handler (same pattern as events_guard_util.js / slack_util.js).
//
// Two providers, because they have different costs:
//
//  - google     (default when GOOGLE_API_KEY is set) — the same server-side key
//                the calendar sync already uses, with the Geocoding API enabled.
//                Note that Geocoding, unlike the Calendar API, requires a
//                billing account on the Google Cloud project.
//  - nominatim  — OpenStreetMap's geocoder. No key and no billing, but its
//                usage policy requires an identifying User-Agent and at most
//                one request per second. Both are honored below (see
//                throttleNominatim). Set GEOCODER_PROVIDER=nominatim to use it.
//
// Results are cached on the event row (migration 036), so a given address is
// geocoded once rather than per page view — the rate limit is not a hot path.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
// Nominatim's stated ceiling is 1 req/sec; leave a little headroom.
const NOMINATIM_MIN_GAP_MS = 1100
const LAST_CALL_KEY = 'geocode:nominatimLastCallMs'
const GOOGLE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

// Events are Indiana-local; biasing to the US keeps "Cummins Inc., 500 Jackson
// St, Columbus, IN" off Columbus, Ohio's namesakes abroad.
const COUNTRY = 'us'

function config() {
  const apiKey = $os.getenv('GOOGLE_API_KEY')
  const explicit = String($os.getenv('GEOCODER_PROVIDER') || '')
    .trim()
    .toLowerCase()
  const provider = explicit || (apiKey ? 'google' : 'nominatim')
  // Nominatim's policy requires a real contact address in the User-Agent.
  const contact = $os.getenv('GEOCODER_CONTACT') || $os.getenv('JOB_NOTIFY_EMAIL') || ''
  return { provider, apiKey, contact }
}

// The request for one address, or null when the provider isn't usable.
function buildRequest(location, cfg) {
  const address = String(location || '').trim()
  if (!address) return null

  if (cfg.provider === 'google') {
    if (!cfg.apiKey) return null
    const params = [
      'address=' + encodeURIComponent(address),
      'components=country:' + COUNTRY.toUpperCase(),
      'key=' + encodeURIComponent(cfg.apiKey)
    ]
    return { url: GOOGLE_URL + '?' + params.join('&'), headers: {} }
  }

  const params = [
    'q=' + encodeURIComponent(address),
    'format=json',
    'limit=1',
    'countrycodes=' + COUNTRY
  ]
  return {
    url: NOMINATIM_URL + '?' + params.join('&'),
    headers: {
      'User-Agent':
        'IndyHackers-website/1.0 (' + (cfg.contact || 'https://www.indyhackers.org') + ')'
    }
  }
}

// Space out Nominatim calls to stay inside its usage policy. Matters on the
// first sync, where a run can geocode every event at once; afterwards the
// address cache means this is hit rarely. Handlers run in isolated runtimes, so
// the timestamp lives in the app-level store rather than module scope.
//
// Google has no comparable per-second limit, so it isn't throttled.
function throttleNominatim() {
  const store = $app.store()
  const last = Number(store.get(LAST_CALL_KEY)) || 0
  const wait = NOMINATIM_MIN_GAP_MS - (Date.now() - last)
  if (wait > 0) sleep(wait)
  store.set(LAST_CALL_KEY, Date.now())
}

function validPoint(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // 0,0 is in the Atlantic — always a parse artifact for an Indiana address.
    !(lat === 0 && lng === 0)
  )
}

/**
 * Interpret a provider response.
 *
 * `settled` separates "this address has no match" from "we couldn't ask right
 * now". Only a settled result is cached, so a transient outage doesn't leave an
 * event permanently unmapped.
 *
 * @returns {{point: {lat: number, lng: number}|null, settled: boolean}}
 */
function parseResponse(provider, statusCode, body) {
  const miss = { point: null, settled: true }
  const retry = { point: null, settled: false }

  if (statusCode !== 200) return retry

  if (provider === 'google') {
    const status = body && body.status
    if (status === 'ZERO_RESULTS') return miss
    if (status !== 'OK') return retry // OVER_QUERY_LIMIT, REQUEST_DENIED, ...

    const results = (body && body.results) || []
    const loc = results[0] && results[0].geometry && results[0].geometry.location
    if (!loc) return miss
    const lat = Number(loc.lat)
    const lng = Number(loc.lng)
    return validPoint(lat, lng) ? { point: { lat, lng }, settled: true } : miss
  }

  // Nominatim answers with an array; empty means no match.
  if (!Array.isArray(body)) return retry
  if (!body.length) return miss
  const lat = Number(body[0].lat)
  const lng = Number(body[0].lon)
  return validPoint(lat, lng) ? { point: { lat, lng }, settled: true } : miss
}

// A unit designator inside the street line: "#120", "Ste 160", "Suite 200",
// "Apt 3B", "Unit 5". Nominatim has no data at that granularity and returns
// nothing at all rather than falling back to the building.
// Longest spellings first: "fl" would otherwise match inside "Floor" and leave
// the number behind.
const UNIT_PATTERN = /\s+(?:#|suite|ste\.?|apartment|apt\.?|unit|room|rm\.?|floor|fl\.?)\s*[\w-]+/i

function stripUnit(address) {
  return String(address || '')
    .replace(UNIT_PATTERN, '')
    .trim()
}

// Event addresses are typically "Venue Name, 123 Main St Ste 4, City, ST 12345,
// USA". Google copes with the whole thing, but Nominatim misses on both the
// leading business name and the suite number — each sinks the query outright.
// So offer progressively plainer forms and take the first that resolves:
//
//   1. the address exactly as entered      (best precision when it works)
//   2. from the street line onward         (venue name dropped)
//   3. also without the unit/suite number  (lands on the building)
//
// The venue is found by locating the first comma-separated segment that starts
// with a house number; everything before it is the name. Dropping just one
// segment isn't enough, because a venue name can contain commas of its own —
// "Half Liter Brewery, Bar, & BBQ, 5301 Winthrop Ave..." would otherwise keep
// "Bar, & BBQ," glued to the front of every candidate.
//
// When the street line IS the first segment ("830 Massachusetts Ave,
// Indianapolis, IN") nothing is dropped: removing it would leave a bare city
// and quietly pin the event to the city centre.
//
// Verified against Nominatim: "5301 Winthrop Ave, Indianapolis, IN 46220, USA"
// hits while every venue-prefixed form of it misses, and "8890 E 116th St #120"
// misses while "8890 E 116th St" hits.
function queryCandidates(address) {
  const full = String(address || '').trim()
  const candidates = []

  const add = (candidate) => {
    const trimmed = String(candidate || '').trim()
    if (trimmed && candidates.indexOf(trimmed) === -1) candidates.push(trimmed)
  }

  add(full)

  const parts = full.split(',')
  let streetIndex = -1
  for (let i = 0; i < parts.length; i++) {
    if (/^\s*\d/.test(parts[i])) {
      streetIndex = i
      break
    }
  }
  // > 0: a street line further in means everything before it was the venue.
  const street = streetIndex > 0 ? parts.slice(streetIndex).join(',').trim() : ''

  if (street) add(street)
  add(stripUnit(street || full))

  return candidates.length ? candidates : [full]
}

// An event needs geocoding when it has an address that isn't the one already
// resolved. An empty location clears any stale point.
function needsGeocode(record) {
  const location = record.getString('location').trim()
  const geocoded = record.getString('geocoded_address').trim()
  return location !== geocoded
}

// Resolve `location` and write the outcome onto `record`. Never throws: a
// failure leaves the row unchanged so the save that triggered it still lands.
function applyGeocode(record) {
  const location = record.getString('location').trim()

  if (!location) {
    record.set('lat', null)
    record.set('lng', null)
    record.set('geocoded_address', '')
    return
  }

  const cfg = config()
  let point = null
  let allSettled = true

  for (const candidate of queryCandidates(location)) {
    const req = buildRequest(candidate, cfg)
    if (!req) {
      console.log('[geocode] no usable provider (' + cfg.provider + '); leaving ' + location)
      return
    }

    let res
    try {
      if (cfg.provider === 'nominatim') throttleNominatim()
      res = $http.send({ url: req.url, method: 'GET', headers: req.headers, timeout: 15 })
    } catch (err) {
      console.log('[geocode] request failed for "' + candidate + '": ' + err)
      allSettled = false
      break
    }

    const outcome = parseResponse(cfg.provider, res.statusCode, res.json)
    if (!outcome.settled) {
      console.log('[geocode] transient failure for "' + candidate + '" (' + res.statusCode + ')')
      allSettled = false
      break
    }
    if (outcome.point) {
      point = outcome.point
      break
    }
  }

  // Couldn't reach the provider: leave the row untouched so this is retried
  // rather than remembered as "no such place".
  if (!point && !allSettled) return

  if (point) {
    record.set('lat', point.lat)
    record.set('lng', point.lng)
  } else {
    // Every candidate came back empty. Remember the attempt so we don't ask
    // again for the same address, but leave the point empty so the UI can list
    // it as unmapped.
    record.set('lat', null)
    record.set('lng', null)
    console.log('[geocode] no match for "' + location + '"')
  }
  record.set('geocoded_address', location)
}

module.exports = {
  buildRequest,
  parseResponse,
  queryCandidates,
  needsGeocode,
  applyGeocode,
  validPoint
}
