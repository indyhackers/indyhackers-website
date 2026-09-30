/// <reference path="../pb_data/types.d.ts" />

// Claims for ownership of an existing event. A signed-in user requests to own an
// event; a board member approves on the /admin/events screen, which sets
// events.owner and marks the request approved (server-side, see EventsAdmin).
//
// Rules mirror slack_invites (admin-managed queue) but let a requester see their
// own requests. A user may only create a pending request for themselves;
// approve/deny is admin-only.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const events = app.findCollectionByNameOrId('events')

    const requests = new Collection({
      type: 'base',
      name: 'event_ownership_requests',
      fields: [
        {
          name: 'event',
          type: 'relation',
          required: true,
          collectionId: events.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        {
          name: 'requested_by',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pending', 'approved', 'rejected']
        },
        { name: 'note', type: 'text', required: false },
        {
          name: 'reviewed_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
      ]
    })

    app.save(requests)

    // A signed-in user may file a pending claim for themselves only. Requesters
    // see their own claims; the board sees and moderates all of them.
    requests.createRule =
      "@request.auth.id != '' && @request.body.requested_by = @request.auth.id && @request.body.status = 'pending'"
    requests.listRule = "@request.auth.roles.name ?= 'admin' || @request.auth.id = requested_by"
    requests.viewRule = "@request.auth.roles.name ?= 'admin' || @request.auth.id = requested_by"
    requests.updateRule = "@request.auth.roles.name ?= 'admin'"
    requests.deleteRule = "@request.auth.roles.name ?= 'admin'"

    app.save(requests)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('event_ownership_requests'))
  }
)
