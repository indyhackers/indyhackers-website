/// <reference path="../pb_data/types.d.ts" />

// Topic-based event alert subscriptions. Unlike `subscriptions` (a logged-in
// user's reminder for one recurring event_series), this is for anonymous
// visitors on the Calendar page who want an email whenever a *newly synced*
// event matches any of their selected topics (language/framework/area).
//
// Double opt-in via `token`: a fresh signup is "pending" until the visitor
// clicks the confirm link, then "confirmed" until they unsubscribe. Records
// are created/updated exclusively by the /api/event-alerts/* routes in
// event_alerts.pb.js (createRule is null, same pattern as slack_invites), so
// the honeypot/rate-limit checks there can't be bypassed via the REST API.
migrate(
  (app) => {
    const topics = app.findCollectionByNameOrId('topics')

    const alerts = new Collection({
      type: 'base',
      name: 'event_alerts',
      fields: [
        { name: 'email', type: 'email', required: true },
        {
          name: 'topics',
          type: 'relation',
          required: true,
          collectionId: topics.id,
          maxSelect: 50,
          minSelect: 1,
          cascadeDelete: false
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pending', 'confirmed', 'unsubscribed']
        },
        { name: 'token', type: 'text', required: true },
        { name: 'ip', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_event_alerts_email ON event_alerts (email)',
        'CREATE UNIQUE INDEX idx_event_alerts_token ON event_alerts (token)'
      ]
    })

    app.save(alerts)

    // Admins only for read; all writes happen server-side via $app (bypasses
    // these rules), same as slack_invites.
    alerts.listRule = "@request.auth.roles.name ?= 'admin'"
    alerts.viewRule = "@request.auth.roles.name ?= 'admin'"
    alerts.createRule = null
    alerts.updateRule = null
    alerts.deleteRule = null
    app.save(alerts)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('event_alerts'))
  }
)
