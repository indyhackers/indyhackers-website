/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2409499253")

  // Unguessable per-job token that lets the (account-less) submitter manage
  // their own post via the /api/jobs/manage endpoints. Set server-side by the
  // onRecordCreate hook; hidden so it never leaks through the normal API.
  collection.fields.addAt(50, new Field({
    "hidden": true,
    "id": "text_edit_token",
    "name": "edit_token",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // Soft take-down: a filled job is kept but excluded from the public list.
  collection.fields.addAt(51, new Field({
    "hidden": false,
    "id": "bool_filled",
    "name": "filled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // Fast, collision-proof lookup by token (partial index skips the empty
  // tokens backfilled rows briefly have before the UPDATE below).
  collection.indexes = [
    ...collection.indexes,
    "CREATE UNIQUE INDEX `idx_jobs_edit_token` ON `jobs` (`edit_token`) WHERE `edit_token` != ''"
  ]

  app.save(collection)

  // Backfill a token for every pre-existing job (40 hex chars via SQLite).
  app.db().newQuery(
    "UPDATE jobs SET edit_token = lower(hex(randomblob(20))) WHERE edit_token IS NULL OR edit_token = ''"
  ).execute()
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2409499253")

  collection.indexes = collection.indexes.filter(
    (idx) => !idx.includes("idx_jobs_edit_token")
  )
  collection.fields.removeById("text_edit_token")
  collection.fields.removeById("bool_filled")

  return app.save(collection)
})
