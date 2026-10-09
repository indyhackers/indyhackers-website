import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_SESSION_MAX_AGE_MS,
  AUTH_SESSION_TIMESTAMP_KEY,
  NEWSLETTER_DRAFT_KEY,
  enforceSessionTimeout,
  hasAdminRole,
  trackAuthenticationSession
} from './authSession'

describe('auth session utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('recognizes an admin role from expanded or direct role data', () => {
    expect(hasAdminRole({ expand: { roles: [{ name: 'admin' }] } })).toBe(true)
    expect(hasAdminRole({ roles: ['admin'] })).toBe(true)
    expect(hasAdminRole({ roles: [{ name: 'member' }] })).toBe(false)
    expect(hasAdminRole(null)).toBe(false)
  })

  it('keeps a valid session before the two-hour maximum age', () => {
    const clear = vi.fn()
    const start = 1_000_000
    localStorage.setItem(AUTH_SESSION_TIMESTAMP_KEY, String(start))

    expect(
      enforceSessionTimeout(
        { authStore: { isValid: true, clear } },
        start + AUTH_SESSION_MAX_AGE_MS - 1
      )
    ).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })

  it('clears expired authentication and the newsletter draft', () => {
    const clear = vi.fn()
    const start = 1_000_000
    localStorage.setItem(AUTH_SESSION_TIMESTAMP_KEY, String(start))
    localStorage.setItem(NEWSLETTER_DRAFT_KEY, '{"title":"Draft"}')

    expect(
      enforceSessionTimeout(
        { authStore: { isValid: true, clear } },
        start + AUTH_SESSION_MAX_AGE_MS
      )
    ).toBe(true)
    expect(clear).toHaveBeenCalledOnce()
    expect(localStorage.getItem(AUTH_SESSION_TIMESTAMP_KEY)).toBeNull()
    expect(localStorage.getItem(NEWSLETTER_DRAFT_KEY)).toBeNull()
  })

  it('starts a session timestamp on login without resetting it on token refresh', () => {
    let onChange
    const pocketbase = {
      authStore: {
        isValid: false,
        record: null,
        onChange: (callback) => {
          onChange = callback
          return unsubscribe
        }
      }
    }
    const unsubscribe = vi.fn()
    const now = vi.spyOn(Date, 'now').mockReturnValue(10_000)

    const stopTracking = trackAuthenticationSession(pocketbase)
    onChange('token', { id: 'admin-1' })
    expect(localStorage.getItem(AUTH_SESSION_TIMESTAMP_KEY)).toBe('10000')

    localStorage.setItem(AUTH_SESSION_TIMESTAMP_KEY, '10000')
    now.mockReturnValue(20_000)
    onChange('refreshed-token', { id: 'admin-1' })
    expect(localStorage.getItem(AUTH_SESSION_TIMESTAMP_KEY)).toBe('10000')

    stopTracking()
    expect(unsubscribe).toHaveBeenCalledOnce()
    now.mockRestore()
  })
})
