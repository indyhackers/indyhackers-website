/// <reference path="../pb_data/types.d.ts" />

// Move job moderation onto the admin *role* instead of superuser-only.
//
// Migration 016 set jobs.updateRule and jobs.deleteRule to null (superusers
// only). The /admin/jobs screen (JobApprovals.vue) approves and rejects jobs
// with the signed-in board member's own token, so those writes require a
// role-based rule — not a superuser token. This matters now that the app no
// longer mints superuser tokens (the /api/admin/promote endpoint was removed):
// board admins moderate with their user token and reach the PocketBase console
// only by signing in there as a real superuser.
//
// Approving/rejecting is a moderator action over ANY job, so both rules gate on
// the admin role (matching the slack_invites collection). Submitters keep
// editing their own posts through the token-based /api/jobs/manage routes, which
// run server-side via $app.save and bypass these rules.
migrate(
  (app) => {
    const jobs = app.findCollectionByNameOrId('jobs')
    jobs.updateRule = "@request.auth.roles.name ?= 'admin'"
    jobs.deleteRule = "@request.auth.roles.name ?= 'admin'"
    app.save(jobs)
  },
  (app) => {
    // Revert to the migration-016 state (superusers only).
    const jobs = app.findCollectionByNameOrId('jobs')
    jobs.updateRule = null
    jobs.deleteRule = null
    app.save(jobs)
  }
)
