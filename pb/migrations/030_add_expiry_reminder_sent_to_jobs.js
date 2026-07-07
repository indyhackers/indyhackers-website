/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2409499253")

  // Idempotency guard for the expiry-reminder cron (pb/hooks/jobs_expiry.js):
  // set true once the "expires in 10 days" email has been sent for the current
  // posting period, and reset to false whenever the posting is (re)approved or
  // extended so the next period gets its own reminder.
  collection.fields.addAt(52, new Field({
    "hidden": false,
    "id": "bool_expiry_reminder_sent",
    "name": "expiry_reminder_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2409499253")

  collection.fields.removeById("bool_expiry_reminder_sent")

  return app.save(collection)
})
