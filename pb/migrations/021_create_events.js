/// <reference path="../pb_data/types.d.ts" />

// Calendar events synced from Google Calendar. Ported from the Rails `events`
// table. Topics are modeled as a direct multi-relation (replacing the Rails
// `taggings` join table) so the frontend can expand them in one query.
migrate(
  (app) => {
    const topics = app.findCollectionByNameOrId('topics')
    const series = app.findCollectionByNameOrId('event_series')

    const events = new Collection({
      type: 'base',
      name: 'events',
      fields: [
        { name: 'google_event_id', type: 'text', required: true },
        {
          name: 'event_series',
          type: 'relation',
          required: false,
          collectionId: series.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: false
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text', required: false, max: 0 },
        { name: 'location', type: 'text', required: false },
        { name: 'url', type: 'url', required: false },
        { name: 'starts_at', type: 'date', required: true },
        { name: 'ends_at', type: 'date', required: false },
        { name: 'all_day', type: 'bool', required: false },
        {
          name: 'status',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['confirmed', 'cancelled']
        },
        {
          name: 'topics',
          type: 'relation',
          required: false,
          collectionId: topics.id,
          maxSelect: 50,
          minSelect: 0,
          cascadeDelete: false
        },
        { name: 'raw', type: 'json', required: false, maxSize: 2000000 },
        { name: 'synced_at', type: 'date', required: false }
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_events_google_id ON events (google_event_id)',
        'CREATE INDEX idx_events_starts_at ON events (starts_at)'
      ]
    })

    app.save(events)

    // Public read; writes are server-side (sync hook) only.
    events.listRule = ''
    events.viewRule = ''
    events.createRule = null
    events.updateRule = null
    events.deleteRule = null
    app.save(events)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('events'))
  }
)
