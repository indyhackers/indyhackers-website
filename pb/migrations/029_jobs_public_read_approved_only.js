/// <reference path="../pb_data/types.d.ts" />

// Stop the jobs collection from exposing unapproved posts over the API.
//
// Migration 004 set listRule/viewRule to "" (fully public), so ANY caller could
// list or fetch jobs that a moderator hasn't approved yet — unreviewed,
// account-less, publicly-submitted content (see the jobs create rule). The
// frontend only ever shows approved jobs, but the raw collection API returned
// everything.
//
// Gate public reads to approved jobs, with an admin-role override so the
// /admin/jobs approvals screen can still list/preview the pending queue with a
// board member's own token. The token-based /api/jobs/manage routes read
// server-side via $app and are unaffected.
migrate(
  (app) => {
    const jobs = app.findCollectionByNameOrId('jobs')
    jobs.listRule = "approved = true || @request.auth.roles.name ?= 'admin'"
    jobs.viewRule = "approved = true || @request.auth.roles.name ?= 'admin'"
    app.save(jobs)
  },
  (app) => {
    // Revert to the migration-004 state (fully public read).
    const jobs = app.findCollectionByNameOrId('jobs')
    jobs.listRule = ''
    jobs.viewRule = ''
    app.save(jobs)
  }
)
