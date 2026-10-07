/// <reference path="../pb_data/types.d.ts" />

// Turn `events` from a read-only mirror of Google Calendar into a collection the
// community can own and edit. Adds provenance/ownership/moderation fields and
// relaxes the Google-id constraints so app-created events (which have no Google
// id) are valid.
//
// - `source`        — where the event came from: 'google' (synced) or 'user'.
// - `submitted_by`  — the account that created it (set on submit).
// - `owner`         — the current approved owner (set by the board on approval
//                     or when an ownership claim is granted).
// - `approved`      — public-visibility gate (mirrors jobs.approved). New user
//                     submissions start false and are hidden until the board
//                     approves them.
// - `locked`        — "the database is authoritative for this row." The inbound
//                     calendar sync skips locked rows so human edits survive.
//                     Set true on any in-app create/edit/claim-approval.
//
// `google_event_id` becomes optional and its unique index becomes partial
// (WHERE google_event_id != '') so many app-created events with an empty id
// don't collide. Existing rows are backfilled as vetted Google events.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    const users = app.findCollectionByNameOrId('users')

    events.fields.push(
      new SelectField({
        id: 'select_source',
        name: 'source',
        required: false,
        maxSelect: 1,
        values: ['google', 'user']
      })
    )
    events.fields.push(
      new RelationField({
        id: 'rel_submitted_by',
        name: 'submitted_by',
        required: false,
        collectionId: users.id,
        maxSelect: 1,
        minSelect: 0,
        cascadeDelete: false
      })
    )
    events.fields.push(
      new RelationField({
        id: 'rel_owner',
        name: 'owner',
        required: false,
        collectionId: users.id,
        maxSelect: 1,
        minSelect: 0,
        cascadeDelete: false
      })
    )
    events.fields.push(new BoolField({ id: 'bool_approved', name: 'approved', required: false }))
    events.fields.push(new BoolField({ id: 'bool_locked', name: 'locked', required: false }))

    // Google events no longer own this collection: an app-created event has no
    // Google id.
    const gid = events.fields.getByName('google_event_id')
    unmarshal({ required: false }, gid)

    // Partial unique index so multiple app-created events (empty google id) are
    // allowed while real Google ids stay unique.
    events.indexes = [
      "CREATE UNIQUE INDEX `idx_events_google_id` ON `events` (`google_event_id`) WHERE `google_event_id` != ''",
      'CREATE INDEX `idx_events_starts_at` ON `events` (`starts_at`)'
    ]

    app.save(events)

    // Backfill: every pre-existing row is a synced, already-vetted Google event.
    app
      .db()
      .newQuery(
        "UPDATE events SET source = 'google', approved = true, locked = false " +
          "WHERE source IS NULL OR source = ''"
      )
      .execute()
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')

    events.fields.removeById('select_source')
    events.fields.removeById('rel_submitted_by')
    events.fields.removeById('rel_owner')
    events.fields.removeById('bool_approved')
    events.fields.removeById('bool_locked')

    const gid = events.fields.getByName('google_event_id')
    unmarshal({ required: true }, gid)

    events.indexes = [
      'CREATE UNIQUE INDEX `idx_events_google_id` ON `events` (`google_event_id`)',
      'CREATE INDEX `idx_events_starts_at` ON `events` (`starts_at`)'
    ]

    app.save(events)
  }
)
