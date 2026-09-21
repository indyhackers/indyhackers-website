/// <reference path="../pb_data/types.d.ts" />

// Keeps each event's coordinates in step with its address, so the calendar's
// map view is a pure render (migration 036 holds lat/lng/geocoded_address).
//
// These are plain record hooks, not *Request hooks: they fire for every save,
// including the internal $app.save() calls made by calendar_sync.js. That's
// deliberate — synced Google events are exactly the ones that need geocoding,
// and they never arrive through the API.
//
// Geocoding is skipped unless the address actually changed (geocode_util
// caches the resolved address on the row), so a sync that re-saves an unchanged
// event costs nothing.
//
// Failures never block the save: applyGeocode swallows its own errors and the
// call is wrapped again here, because an unreachable geocoder must not stop an
// event from being created or edited.
//
// NOTE: each handler is self-contained on purpose. PocketBase runs every
// handler in an isolated JSVM runtime that cannot see this file's module scope,
// so a shared helper defined up here would be undefined at call time — hence
// the require() inside each body (same pattern as events_guard.pb.js).

onRecordCreate((e) => {
  const geo = require(`${__hooks}/geocode_util.js`)
  if (geo.needsGeocode(e.record)) {
    try {
      geo.applyGeocode(e.record)
    } catch (err) {
      console.log('[geocode] skipped for new event: ' + err)
    }
  }
  e.next()
}, 'events')

onRecordUpdate((e) => {
  const geo = require(`${__hooks}/geocode_util.js`)
  if (geo.needsGeocode(e.record)) {
    try {
      geo.applyGeocode(e.record)
    } catch (err) {
      console.log('[geocode] skipped for event ' + e.record.id + ': ' + err)
    }
  }
  e.next()
}, 'events')
