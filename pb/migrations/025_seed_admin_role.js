/// <reference path="../pb_data/types.d.ts" />

// Seed the "admin" role that gates the admin screens (job & Slack-invite
// approval) and the slack_invites API rules (`@request.auth.roles.name ?=
// 'admin'`). Without this row there's no way to grant a user admin access short
// of creating the role by hand. Re-runnable: upserts by name.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('roles')

    let record
    try {
      record = app.findFirstRecordByData('roles', 'name', 'admin')
    } catch (_) {
      record = new Record(collection)
    }
    record.set('name', 'admin')
    record.set('description', 'Full administrative access: job & Slack-invite approval and the admin screens.')
    record.set('level', 100)
    app.save(record)
  },
  (app) => {
    // Down: remove the seeded admin role.
    try {
      const record = app.findFirstRecordByData('roles', 'name', 'admin')
      app.delete(record)
    } catch (_) {
      // already gone
    }
  }
)
