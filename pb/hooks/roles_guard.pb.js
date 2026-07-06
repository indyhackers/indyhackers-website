/// <reference path="../pb_data/types.d.ts" />

// Privilege-escalation guard for the `users.roles` relation.
//
// PocketBase has no per-field write rules, and the users collection lets a
// signed-in user update their own record. The `roles` collection is publicly
// listable, so the "admin" role id is trivially discoverable. Without this hook
// a normal user could PATCH their own user record to add themselves to the
// admin role and then call POST /api/admin/promote (see admin.pb.js), which
// mints a full PocketBase superuser token — a complete account takeover.
//
// Policy: the `roles` relation may only be set/changed by a request
// authenticated as a PocketBase superuser. That's how the admin screens assign
// roles today (the console acts with a superuser token). Regular users — even
// ones already in the admin role, acting with their own user token — cannot
// alter roles on any user record, including their own.
//
// These are *request* hooks: they fire only for API-driven writes, never for
// internal $app.save(...) calls, so server-side role management still works.

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

onRecordCreateRequest((e) => {
    if (sortedRoleIds(e.record).length > 0 && !isSuperuserRequest(e)) {
        throw new ForbiddenError('Setting roles is not allowed.')
    }
    e.next()
}, 'users')

onRecordUpdateRequest((e) => {
    const before = sortedRoleIds(e.record.original())
    const after = sortedRoleIds(e.record)
    if (rolesChanged(before, after) && !isSuperuserRequest(e)) {
        throw new ForbiddenError('Changing roles is not allowed.')
    }
    e.next()
}, 'users')
