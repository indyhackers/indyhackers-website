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
//
// The sortedRoleIds / rolesChanged / isSuperuserRequest helpers live in
// roles_guard_util.js and are require()'d inside each handler below —
// PocketBase runs handlers in isolated runtimes that can't see this file's
// module scope, so top-level declarations aren't visible at request time.

onRecordCreateRequest((e) => {
    const util = require(`${__hooks}/roles_guard_util.js`)
    if (util.sortedRoleIds(e.record).length > 0 && !util.isSuperuserRequest(e)) {
        throw new ForbiddenError('Setting roles is not allowed.')
    }
    e.next()
}, 'users')

onRecordUpdateRequest((e) => {
    const util = require(`${__hooks}/roles_guard_util.js`)
    const before = util.sortedRoleIds(e.record.original())
    const after = util.sortedRoleIds(e.record)
    if (util.rolesChanged(before, after) && !util.isSuperuserRequest(e)) {
        throw new ForbiddenError('Changing roles is not allowed.')
    }
    e.next()
}, 'users')
