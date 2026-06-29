migrate(
  (app) => {
    // Create Jobs Collection
    let usersCollection = app.findCollectionByNameOrId('users')
    let jobsCollection = new Collection({
      type: 'base',
      // Pinned so later migrations (015-018) that reference this id resolve on a
      // fresh DB, matching the id the existing production DB already has.
      id: 'pbc_2409499253',
      name: 'jobs',
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          options: {
            maxSelect: 1,
            cascadeDelete: false
          }
        },
        { name: 'title', type: 'text', required: true },
        { name: 'company', type: 'text', required: true },
        {
          name: 'salary_min',
          type: 'number',
          required: true,
          options: { min: 1, max: 1000, noDecimal: false }
        },
        {
          name: 'salary_max',
          type: 'number',
          required: true,
          options: { min: 1, max: 1000, noDecimal: false }
        },
        { name: 'approved', type: 'bool', required: false },
        { name: 'description', type: 'editor', required: false }
      ]
    })

    app.save(jobsCollection)

    jobsCollection.listRule = ''
    jobsCollection.viewRule = ''
    jobsCollection.createRule = "@request.auth.id != '' && @request.auth.id = user.id"
    jobsCollection.updateRule = '@request.auth.id = user.id && @request.auth.id = user.id'
    jobsCollection.deleteRule = "@request.auth.id != '' && @request.auth.roles.name ?= 'admin'"

    app.save(jobsCollection)
  },
  (app) => {
    // Delete Jobs Collection
    let jobsCollection = app.findCollectionByNameOrId('jobs')
    app.delete(jobsCollection)
  }
)
