import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import { VueHeadMixin } from '@unhead/vue'
import { createBootstrap } from 'bootstrap-vue-next'
import PocketBase from 'pocketbase'
import mitt from 'mitt'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

import App from './App.vue'
import { routes, scrollBehavior } from './router'
import { SITE_URL } from './seo'

// Routes worth prerendering to static HTML: public, content-bearing pages whose
// value is indexability. Excludes auth/admin, the query-driven single-job view,
// the markdown export utilities, and redirects — those stay client-only.
const PRERENDER_ROUTES = new Set([
  '/',
  '/about',
  '/jobs',
  '/jobs/new',
  '/sponsors',
  '/newsletter',
  '/calendar',
  '/recommend-event',
  '/code-of-conduct',
  '/privacy',
  '/terms',
  '/support'
])

// vite-ssg reads this named export from the entry to decide which paths to
// prerender (the ViteSSG options arg does NOT carry it).
export function includedRoutes(paths) {
  return paths.filter((path) => PRERENDER_ROUTES.has(path))
}

// ViteSSG builds the app for both the client and the prerender pass. The setup
// callback runs in both environments, so anything touching the DOM/`window` is
// guarded behind `isClient`.
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  async ({ app, router, isClient }) => {
    // No PocketBase calls happen during prerender (components fetch in
    // mounted/onMounted, which don't run server-side), but the client needs the
    // real origin and `window` is undefined during the build.
    const pbURL = import.meta.env.DEV
      ? '/'
      : isClient && typeof window !== 'undefined'
        ? window.location.origin
        : SITE_URL
    const pocketbase = new PocketBase(pbURL)
    const emitter = mitt()

    app.config.globalProperties.pocketbase = pocketbase
    app.config.globalProperties.emitter = emitter
    app.provide('pocketbase', pocketbase)
    app.provide('router', router)
    app.provide('emitter', emitter)

    // Enables the Options-API `head()` option (vite-ssg installs the unhead
    // head instance but not this mixin).
    app.mixin(VueHeadMixin)
    app.use(createPinia())
    app.use(createBootstrap())

    if (isClient) {
      // Gate everything under /admin: must be signed in as a user with the
      // admin role, otherwise bounce to /login (preserving where they were
      // headed). Client-only — the prerender pass never visits /admin routes.
      const hasAdminRole = (record) => {
        const roles = record?.expand?.roles ?? record?.roles ?? []
        const list = Array.isArray(roles) ? roles : [roles]
        return list.some((r) => (typeof r === 'object' ? r?.name : r) === 'admin')
      }
      router.beforeEach(async (to) => {
        if (!to.path.startsWith('/admin')) return true

        // Not signed in at all → login (preserving the destination).
        if (!pocketbase.authStore.isValid) {
          return { name: 'Login', query: { redirect: to.fullPath } }
        }
        if (hasAdminRole(pocketbase.authStore.record)) return true

        // Signed in but the auth record didn't carry roles (e.g. older session)
        // — verify once against the server before deciding.
        try {
          const me = await pocketbase
            .collection('users')
            .getOne(pocketbase.authStore.record.id, { expand: 'roles' })
          if (hasAdminRole(me)) return true
        } catch {
          // fall through
        }
        // Signed in but not an admin → not authorized.
        return { name: 'NotAuthorized' }
      })

      // Popper and Bootstrap's JS bundle both touch `document` at import time,
      // so they can only load in the browser.
      import('@popperjs/core/dist/umd/popper.min.js')
      import('bootstrap/dist/js/bootstrap.min.js')

      // Dev-only: start the MSW mock backend and wait for it before mounting
      // (vite-ssg awaits this callback), so initial fetches are intercepted.
      if (import.meta.env.DEV) {
        const { worker } = await import('./mocks/browser')
        await worker.start()
      }
    }
  }
)
