import PocketBase from 'pocketbase'

// Single shared PocketBase client. In dev all calls are relative ('/') so MSW
// can intercept them; in production they hit the same origin that serves the app.
const pbURL = import.meta.env.DEV ? '/' : window.location.origin
const pocketbase = new PocketBase(pbURL)

export default pocketbase

// True when the signed-in user has the "admin" role. Reads the (expanded) roles
// off the auth record — the login flow requests `expand: 'roles'` so this is
// populated and survives a page reload via the persisted auth store.
export function isAdmin() {
  const record = pocketbase.authStore.record
  if (!pocketbase.authStore.isValid || !record) return false
  const roles = record.expand?.roles ?? record.roles ?? []
  const list = Array.isArray(roles) ? roles : [roles]
  return list.some((r) => (typeof r === 'object' ? r?.name : r) === 'admin')
}
