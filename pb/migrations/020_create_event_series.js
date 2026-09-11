/// <reference path="../pb_data/types.d.ts" />

// Groups recurring event occurrences. Ported from the Rails `event_series`
// table; one row per Google recurring-event id.
migrate(
  (app) => {
    const series = new Collection({
      type: 'base',
      name: 'event_series',
      fields: [
        { name: 'google_series_id', type: 'text', required: true },
        { name: 'title', type: 'text', required: false },
        { name: 'summary', type: 'text', required: false }
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_event_series_google_id ON event_series (google_series_id)'
      ]
    })

    app.save(series)

    series.listRule = ''
    series.viewRule = ''
    series.createRule = null
    series.updateRule = null
    series.deleteRule = null
    app.save(series)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('event_series'))
  }
)
