/// <reference path="../pb_data/types.d.ts" />

// Tracks reminder emails already sent, so the reminder cron is idempotent.
// Ported from the Rails `reminder_deliveries` table; the unique (subscription,
// event) index is what prevents duplicate emails across runs.
migrate(
  (app) => {
    const subscriptions = app.findCollectionByNameOrId('subscriptions')
    const events = app.findCollectionByNameOrId('events')

    const deliveries = new Collection({
      type: 'base',
      name: 'reminder_deliveries',
      fields: [
        {
          name: 'subscription',
          type: 'relation',
          required: true,
          collectionId: subscriptions.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        {
          name: 'event',
          type: 'relation',
          required: true,
          collectionId: events.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        { name: 'sent_at', type: 'date', required: false }
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_reminder_deliveries_sub_event ON reminder_deliveries (subscription, event)'
      ]
    })

    app.save(deliveries)

    // Server-side only (written by the reminder cron); not user-facing.
    deliveries.listRule = null
    deliveries.viewRule = null
    deliveries.createRule = null
    deliveries.updateRule = null
    deliveries.deleteRule = null
    app.save(deliveries)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('reminder_deliveries'))
  }
)
