export const AUTH_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000
export const AUTH_SESSION_TIMESTAMP_KEY = 'ih_auth_session_start'
export const NEWSLETTER_DRAFT_KEY = 'ih_newsletter_draft'

export function hasAdminRole(record) {
  const roles = record?.expand?.roles ?? record?.roles ?? []
  const list = Array.isArray(roles) ? roles : [roles]
  return list.some((role) => (typeof role === 'object' ? role?.name : role) === 'admin')
}

function getSessionStart() {
  try {
    const storedTime = Number(localStorage.getItem(AUTH_SESSION_TIMESTAMP_KEY))
    if (Number.isFinite(storedTime) && storedTime > 0) return storedTime

    const now = Date.now()
    localStorage.setItem(AUTH_SESSION_TIMESTAMP_KEY, String(now))
    return now
  } catch (error) {
    console.error('Could not read or initialize the authentication session timeout:', error)
    return null
  }
}

export function enforceSessionTimeout(pocketbase, now = Date.now()) {
  if (!pocketbase.authStore.isValid) return false

  const sessionStart = getSessionStart()
  if (sessionStart === null || now - sessionStart < AUTH_SESSION_MAX_AGE_MS) return false

  pocketbase.authStore.clear()
  try {
    localStorage.removeItem(AUTH_SESSION_TIMESTAMP_KEY)
  } catch (error) {
    console.error('Could not clear expired authentication timestamp:', error)
  }
  try {
    localStorage.removeItem(NEWSLETTER_DRAFT_KEY)
  } catch (error) {
    console.error('Could not clear expired newsletter draft:', error)
  }

  return true
}

export function trackAuthenticationSession(pocketbase) {
  let hadSession = pocketbase.authStore.isValid
  let currentUserId = pocketbase.authStore.record?.id

  if (hadSession) getSessionStart()

  return pocketbase.authStore.onChange((token, record) => {
    const hasSession = Boolean(token)
    const userId = record?.id

    if (hasSession && (!hadSession || userId !== currentUserId)) {
      try {
        localStorage.setItem(AUTH_SESSION_TIMESTAMP_KEY, String(Date.now()))
      } catch (error) {
        console.error('Could not start the authentication session timeout:', error)
      }
    } else if (!hasSession) {
      try {
        localStorage.removeItem(AUTH_SESSION_TIMESTAMP_KEY)
      } catch (error) {
        console.error('Could not clear the authentication session timeout:', error)
      }
    }

    hadSession = hasSession
    currentUserId = userId
  })
}
