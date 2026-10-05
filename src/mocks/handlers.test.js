import { describe, expect, it } from 'vitest'

describe('newsletter MSW fixtures', () => {
  it('returns a paginated list when newsletter records are requested', async () => {
    const response = await fetch(
      new URL(
        '/api/collections/newsletters/records?page=1&perPage=100&sort=-published_at',
        window.location.origin
      )
    )
    const result = await response.json()

    expect(response.ok).toBe(true)
    expect(result).toMatchObject({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: []
    })
  })
})
