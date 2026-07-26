/// <reference path="../pb_data/types.d.ts" />

// Open up the `events` collection so the community can submit, own and moderate
// events. Migration 021 created it with all writes null (server/superuser only)
// and fully public reads.
//
// - Public read is gated to approved events, with an admin override (so the
//   /admin/events screen can list the pending queue) and an owner/submitter
//   override (so people can see their own not-yet-approved events on
//   /events/mine). Matches the jobs pattern (029).
// - Any signed-in user may submit, but cannot self-approve or self-assign
//   ownership (those fields are further protected by events_guard.pb.js).
// - Owners and admins may edit/delete. Field-level protection (approved, owner,
//   source, google_event_id, submitted_by, locked) lives in events_guard.pb.js
//   since PocketBase has no per-field write rules.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.listRule =
      "approved = true || @request.auth.roles.name ?= 'admin' || @request.auth.id = owner || @request.auth.id = submitted_by"
    events.viewRule =
      "approved = true || @request.auth.roles.name ?= 'admin' || @request.auth.id = owner || @request.auth.id = submitted_by"
    events.createRule = "@request.auth.id != '' && @request.body.approved = false && @request.body.owner = ''"
    events.updateRule = "@request.auth.roles.name ?= 'admin' || @request.auth.id = owner"
    events.deleteRule = "@request.auth.roles.name ?= 'admin' || @request.auth.id = owner"
    app.save(events)
  },
  (app) => {
    // Revert to the migration-021 state (public read, server-side writes only).
    const events = app.findCollectionByNameOrId('events')
    events.listRule = ''
    events.viewRule = ''
    events.createRule = null
    events.updateRule = null
    events.deleteRule = null
    app.save(events)
  }
)
