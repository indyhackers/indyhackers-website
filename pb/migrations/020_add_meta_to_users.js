/// <reference path="../pb_data/types.d.ts" />

// Adds a `meta` JSON field to users. OAuth logins (e.g. Google) stash the
// provider's raw profile here keyed by provider name; without this field the
// post-login update in LoginPage.vue would fail and block the redirect.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.push(
      new JSONField({
        name: 'meta',
        required: false,
        default: {}
      })
    )
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields = users.fields.filter((f) => f.name !== 'meta')
    app.save(users)
  }
)
