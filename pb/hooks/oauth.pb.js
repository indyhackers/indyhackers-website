/// <reference path="../pb_data/types.d.ts" />

// Configures the Google OAuth2 provider on the users collection from env vars
// at startup, so client secrets stay out of the repo and can be set per
// environment. Set both to enable it:
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
// In Google Cloud, the OAuth client's authorized redirect URI must be
//   https://<your-domain>/api/oauth2-redirect
// Other providers configured in the admin UI are left untouched.
onBootstrap((e) => {
    e.next() // finish bootstrap first; $app is fully initialized afterward

    const clientId = $os.getenv('GOOGLE_OAUTH_CLIENT_ID')
    const clientSecret = $os.getenv('GOOGLE_OAUTH_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
        console.log('[oauth] Google env vars not set; skipping provider config')
        return
    }

    try {
        const users = $app.findCollectionByNameOrId('users')
        const current = (users.oauth2 && users.oauth2.providers) || []
        const providers = current.filter((p) => p.name !== 'google')
        providers.push({ name: 'google', clientId, clientSecret })

        unmarshal({ oauth2: { enabled: true, providers } }, users)
        $app.save(users)
        console.log('[oauth] Google provider configured from env')
    } catch (err) {
        console.error('[oauth] failed to configure Google provider: ' + err)
    }
})
