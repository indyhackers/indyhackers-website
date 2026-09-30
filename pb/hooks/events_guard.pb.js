/// <reference path="../pb_data/types.d.ts" />

// Field-level guard for the `events` collection. PocketBase has no per-field
// write rules, so the collection's update rule (migration 032) only decides
// *who* can write a row (owner or admin) — not *which* fields. This hook fills
// that gap:
//
//  - Regular submitters can freely edit content fields (title, description,
//    location, url, times, topics, status) but can NEVER set or change the
//    privilege/provenance fields (approved, owner, locked, source,
//    submitted_by, google_event_id). Those belong to the board.
//  - On create, submitter-controlled invariants are forced server-side so a
//    crafted request can't self-approve, self-assign ownership, or spoof
//    submitted_by/source.
//  - Any in-app write marks the row `locked`, so the inbound calendar sync
//    (calendar_sync.js) stops overwriting it — the database becomes the source
//    of truth for touched events.
//
// These are *request* hooks: they fire only for API-driven writes, never for
// internal $app.save(...) calls (e.g. the sync hook or the admin approve
// action, which set these fields deliberately).
//
// Helpers live in events_guard_util.js and are require()'d inside each handler —
// PocketBase runs handlers in isolated runtimes that can't see this file's
// module scope.

onRecordCreateRequest((e) => {
  const util = require(`${__hooks}/events_guard_util.js`)

  if (!util.isAdminRequest(e)) {
    // Force the invariants for a public submission, ignoring anything the
    // client sent for these fields.
    e.record.set('source', 'user')
    e.record.set('submitted_by', e.auth ? e.auth.id : null)
    e.record.set('owner', null)
    e.record.set('approved', false)
  }
  // Every app-created event is database-authoritative from birth.
  e.record.set('locked', true)

  e.next()
}, 'events')

onRecordUpdateRequest((e) => {
  const util = require(`${__hooks}/events_guard_util.js`)

  if (!util.isAdminRequest(e) && util.protectedFieldsChanged(e.record)) {
    throw new ForbiddenError('You can edit this event, but not its ownership or approval.')
  }
  // An edit (by owner or board) makes the row database-authoritative.
  e.record.set('locked', true)

  e.next()
}, 'events')
