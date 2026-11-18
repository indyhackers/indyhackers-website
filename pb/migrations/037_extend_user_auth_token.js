/// <reference path="../pb_data/types.d.ts" />

// Keep signed-in sessions (admins included) alive across visits. The SDK
// persists the token in localStorage, but PocketBase's default users token
// lifetime is 7 days, so anyone visiting less often than that got bounced to
// /login every time. The client now also calls authRefresh() on page load
// (src/main.js), which re-issues the token — so this is the idle timeout: a
// session only expires after 30 days without a visit.
const THIRTY_DAYS = 30 * 24 * 60 * 60

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.authToken.duration = THIRTY_DAYS
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.authToken.duration = 7 * 24 * 60 * 60
    app.save(users)
  }
)
