/// <reference path="../pb_data/types.d.ts" />

// A user's reminder subscription to a recurring event series. Ported from the
// Rails `subscriptions` table. lead_time_minutes mirrors Subscription::LEAD_TIMES
// (60, 180, 1440, 2880, 10080).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const series = app.findCollectionByNameOrId('event_series')

    const subscriptions = new Collection({
      type: 'base',
      name: 'subscriptions',
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        {
          name: 'event_series',
          type: 'relation',
          required: true,
          collectionId: series.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        {
          name: 'lead_time_minutes',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 1
        }
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_subscriptions_user_series ON subscriptions (user, event_series)'
      ]
    })

    app.save(subscriptions)

    // Owner-scoped: a signed-in user manages only their own subscriptions.
    subscriptions.listRule = "@request.auth.id != '' && user = @request.auth.id"
    subscriptions.viewRule = "@request.auth.id != '' && user = @request.auth.id"
    subscriptions.createRule = "@request.auth.id != '' && user = @request.auth.id"
    subscriptions.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    subscriptions.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(subscriptions)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('subscriptions'))
  }
)
