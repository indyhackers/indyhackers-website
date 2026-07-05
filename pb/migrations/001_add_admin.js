// pb_migrations/1687801090_initial_admin.js
migrate(
  (app) => {
    // Seed the initial superuser from the environment instead of a committed
    // password. Set these before first boot on a fresh database:
    //   INITIAL_ADMIN_EMAIL     (optional; defaults to admin@indyhackers.org)
    //   INITIAL_ADMIN_PASSWORD  (required to seed; min 8 chars per PocketBase)
    //
    // If INITIAL_ADMIN_PASSWORD is unset we skip creation entirely — create the
    // first superuser out-of-band instead:
    //   pocketbase superuser create <email> <password>
    //
    // NOTE: editing this already-applied migration only affects *fresh*
    // databases. It does NOT rotate an existing production superuser — rotate
    // that by hand (the previously committed password must be considered
    // compromised).
    const email = $os.getenv('INITIAL_ADMIN_EMAIL') || 'admin@indyhackers.org'
    const password = $os.getenv('INITIAL_ADMIN_PASSWORD')
    if (!password) {
      console.warn(
        '[migrations] INITIAL_ADMIN_PASSWORD not set; skipping initial superuser seed. ' +
          'Create one with: pocketbase superuser create <email> <password>'
      )
      return
    }

    const superusers = app.findCollectionByNameOrId('_superusers')
    const admin = new Record(superusers)
    admin.set('email', email)
    admin.set('password', password)

    app.save(admin)
  },
  (app) => {
    try {
      const email = $os.getenv('INITIAL_ADMIN_EMAIL') || 'admin@indyhackers.org'
      const admin = app.findAuthRecordByEmail('_superusers', email)
      app.delete(admin)
    } catch {
      // Silent errors (probably already deleted)
    }
  }
)
