/// <reference path="../pb_data/types.d.ts" />

// Shared helpers for roles_guard.pb.js. PocketBase runs each hook handler in
// an isolated JSVM runtime that can't see the hook file's module scope, so
// these are require()'d from inside each handler (same pattern as
// slack_util.js / jobs_util.js).

// A multi-relation reads back as an array of ids; normalize to a sorted list so
// order/shape differences don't register as a change.
function sortedRoleIds(record) {
    const roles = record ? record.get('roles') : null
    const ids = Array.isArray(roles) ? roles.slice() : roles ? [roles] : []
    return ids.map(String).sort()
}

function rolesChanged(before, after) {
    if (before.length !== after.length) return true
    for (let i = 0; i < before.length; i++) {
        if (before[i] !== after[i]) return true
    }
    return false
}

// Prefer the built-in helper; fall back to inspecting the auth record's
// collection so the guard still holds if the helper is unavailable.
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

module.exports = {
    sortedRoleIds,
    rolesChanged,
    isSuperuserRequest,
}
