/// <reference path="../pb_data/types.d.ts" />

// The roles collection (migration 002) was created with only listRule set, so
// viewRule defaulted to null (superusers only). That silently breaks the
// frontend admin guard: it reads a user's role names via
// `getOne('users', id, { expand: 'roles' })`, but PocketBase only expands a
// relation when the related collection's viewRule passes for the request. With
// viewRule null, a normal signed-in user's roles never expand, so even a
// legitimately-assigned admin is bounced to /not-authorized.
//
// Open viewRule to match the already-public listRule. Role records aren't
// sensitive (name/description/level), and the list is already public.
migrate(
  (app) => {
    const roles = app.findCollectionByNameOrId('roles')
    roles.viewRule = ''
    app.save(roles)
  },
  (app) => {
    const roles = app.findCollectionByNameOrId('roles')
    roles.viewRule = null
    app.save(roles)
  }
)
