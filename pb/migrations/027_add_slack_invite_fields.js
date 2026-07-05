/// <reference path="../pb_data/types.d.ts" />

// Add the profile fields collected by the /slack join form: name, connection to
// Indiana, city/region, optional LinkedIn/GitHub, and the code-of-conduct
// agreement. All optional at the DB level — the form and the invite hook
// enforce which ones are required, so existing rows and admin updates
// (approve/reject) don't fail validation on data they never had.
migrate(
  (app) => {
    const invites = app.findCollectionByNameOrId('slack_invites')

    invites.fields.push(new TextField({ name: 'first_name', required: false }))
    invites.fields.push(new TextField({ name: 'last_name', required: false }))
    invites.fields.push(new TextField({ name: 'indiana_connection', required: false }))
    invites.fields.push(new TextField({ name: 'city_region', required: false }))
    invites.fields.push(new TextField({ name: 'linkedin', required: false }))
    invites.fields.push(new TextField({ name: 'github', required: false }))
    invites.fields.push(new BoolField({ name: 'coc_agreed', required: false, default: false }))

    app.save(invites)
  },
  (app) => {
    const invites = app.findCollectionByNameOrId('slack_invites')
    const added = [
      'first_name',
      'last_name',
      'indiana_connection',
      'city_region',
      'linkedin',
      'github',
      'coc_agreed'
    ]
    invites.fields = invites.fields.filter((f) => !added.includes(f.name))
    app.save(invites)
  }
)
