/// <reference path="../pb_data/types.d.ts" />

// Queue of Slack invite requests submitted from the /slack page.
//
// The public POST /api/slack/invite route creates rows here (bypassing the
// create rule via $app). Auto-approved requests are created with status
// "approved" and the Slack invite is sent immediately; everything else is
// created "pending" for a board member to approve/reject on the admin screen.
// A hook in slack.pb.js sends the Slack invite whenever status becomes
// "approved". Read/update/delete are restricted to admins.
migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('users')

    const invites = new Collection({
      type: 'base',
      name: 'slack_invites',
      fields: [
        { name: 'email', type: 'email', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pending', 'approved', 'rejected']
        },
        { name: 'auto', type: 'bool', required: false },
        { name: 'ip', type: 'text', required: false },
        { name: 'country', type: 'text', required: false },
        { name: 'user_agent', type: 'text', required: false },
        { name: 'signals', type: 'json', required: false, maxSize: 2000000 },
        { name: 'invited_at', type: 'text', required: false },
        { name: 'error', type: 'text', required: false },
        {
          name: 'reviewed_by',
          type: 'relation',
          required: false,
          collectionId: usersCollection.id,
          maxSelect: 1,
          cascadeDelete: false
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ]
    })

    app.save(invites)

    // Admins only. Records are created server-side via $app (bypasses createRule).
    invites.createRule = null
    invites.listRule = "@request.auth.roles.name ?= 'admin'"
    invites.viewRule = "@request.auth.roles.name ?= 'admin'"
    invites.updateRule = "@request.auth.roles.name ?= 'admin'"
    invites.deleteRule = "@request.auth.roles.name ?= 'admin'"

    app.save(invites)
  },
  (app) => {
    const invites = app.findCollectionByNameOrId('slack_invites')
    app.delete(invites)
  }
)
