/// <reference path="../pb_data/types.d.ts" />

// Coordinates for the calendar's map view. Events carry a free-text `location`
// ("Innovatemap, 1 W Court St, Indianapolis, IN 46204"); geocode.pb.js resolves
// it to a point once and caches the result here, so the map is a pure render
// with no per-visitor geocoding.
//
// `geocoded_address` records which address string produced the stored point.
// It's the cache key: the hook re-geocodes only when `location` no longer
// matches it, which also means a definitive "no such place" is remembered
// (address recorded, lat/lng left empty) instead of being retried every sync.
//
// Existing rows have no coordinates until the next sync or edit touches them.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')

    events.fields.push(
      new NumberField({ id: 'num_lat', name: 'lat', required: false, min: -90, max: 90 })
    )
    events.fields.push(
      new NumberField({ id: 'num_lng', name: 'lng', required: false, min: -180, max: 180 })
    )
    events.fields.push(
      new TextField({ id: 'text_geocoded_address', name: 'geocoded_address', required: false })
    )

    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.removeById('num_lat')
    events.fields.removeById('num_lng')
    events.fields.removeById('text_geocoded_address')
    app.save(events)
  }
)
