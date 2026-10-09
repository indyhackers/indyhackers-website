/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('newsletters')
    collection.createRule = "@request.auth.roles.name ?= 'admin'"
    collection.updateRule = null
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('newsletters')
    collection.createRule = null
    collection.updateRule = null
    return app.save(collection)
  }
)
