/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for events_guard.pb.js. PocketBase runs each hook handler in an
// isolated JSVM runtime that can't see the hook file's module scope, so these
// are require()'d from inside each handler (same pattern as roles_guard_util.js
// / slack_util.js).

// Fields a regular (non-admin) caller may never set or change on an event. They
// either grant privilege (owner, approved, locked) or record provenance the
// board owns (source, submitted_by, google_event_id).
const PROTECTED_FIELDS = ['approved', 'owner', 'source', 'google_event_id', 'submitted_by', 'locked']

// A relation reads back as an array or a single id; normalize to a stable string
// so shape differences don't register as a change.
function fieldValue(record, name) {
  if (!record) return ''
  const v = record.get(name)
  if (Array.isArray(v)) return v.map(String).sort().join(',')
  if (v === null || v === undefined) return ''
  return String(v)
}

function protectedFieldsChanged(record) {
  const before = record.original()
  for (const name of PROTECTED_FIELDS) {
    if (fieldValue(record, name) !== fieldValue(before, name)) return true
  }
  return false
}

// Prefer the built-in helper; fall back to inspecting the auth record's
// collection (same shape as roles_guard_util.isSuperuserRequest).
function isSuperuserRequest(e) {
  try {
    if (typeof e.hasSuperuserAuth === 'function') return e.hasSuperuserAuth()
  } catch (_) {
    /* fall through */
  }
  try {
    return !!e.auth && e.auth.collection().name === '_superusers'
  } catch (_) {
    return false
  }
}

// A board member is a superuser request OR a user whose `roles` relation
// includes the seeded "admin" role.
function isAdminRequest(e) {
  if (isSuperuserRequest(e)) return true
  const auth = e.auth
  if (!auth) return false
  const roleIds = auth.get('roles')
  const ids = Array.isArray(roleIds) ? roleIds.map(String) : roleIds ? [String(roleIds)] : []
  if (ids.length === 0) return false
  try {
    const adminRole = $app.findFirstRecordByData('roles', 'name', 'admin')
    return ids.includes(String(adminRole.id))
  } catch (_) {
    return false
  }
}

module.exports = {
  PROTECTED_FIELDS,
  fieldValue,
  protectedFieldsChanged,
  isSuperuserRequest,
  isAdminRequest
}
