/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/admin/promote', async (e) => {
  try {
    let userAuth = e.auth

    // Verify the token and retrieve the user
    console.log(JSON.stringify(userAuth))
    if (!userAuth) {
      throw new Error('Invalid user token')
    }

    // Check if the user has the "admin" role. `roles` is a multi-relation, so
    // expand all of them and look for one named "admin" (matches the frontend
    // guard and the slack_invites API rule).
    $app.expandRecord(userAuth, ['roles'], null)
    const userRoles = userAuth.expandedAll('roles') || []
    const isAdmin = userRoles.some((r) => r.get('name') === 'admin')
    if (!isAdmin) {
      throw new Error('User does not have the admin role')
    }

    // Create or update a superuser entry for this user
    const superuserCollection = $app.findCollectionByNameOrId('_superusers')
    let existingSuperuser = false
    try {
      existingSuperuser = $app.findFirstRecordByData('_superusers', 'email', userAuth.get('email'))
    } catch (error) {
      console.log(error)
    }

    let superuserRecord

    if (!existingSuperuser) {
      // Create a new superuser entry
      superuserRecord = new Record(superuserCollection)
      superuserRecord.set('email', userAuth.get('email'))
      superuserRecord.set('verified', true) // Assuming superusers need to be verified
      superuserRecord.set('password', $security.randomString(42)) // Link to the original user
      await $app.save(superuserRecord)
    } else {
      superuserRecord = existingSuperuser
    }

    console.log('got here')

    // Create an admin token
    const aToken = superuserRecord.newAuthToken()

    console.log('adminToken: ', aToken)

    return e.json(200, {
      token: aToken,
      record: {
        id: superuserRecord.id,
        email: superuserRecord.get('email'),
        verified: superuserRecord.get('verified')
      }
    })
  } catch (error) {
    console.error('Error promoting user to admin:', error)
    throw new BadRequestError('Error promoting user to admin')
  }
})
