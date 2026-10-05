/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2118001528")

  // update field
  collection.fields.addAt(7, new Field({
    "exceptDomains": null,
    "help": "",
    "hidden": false,
    "id": "url917281265",
    "name": "link",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2118001528")

  // update field
  collection.fields.addAt(7, new Field({
    "exceptDomains": null,
    "help": "",
    "hidden": false,
    "id": "url917281265",
    "name": "link",
    "onlyDomains": null,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "url"
  }))

  return app.save(collection)
})
