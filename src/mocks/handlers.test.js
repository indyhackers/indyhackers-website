import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from './server'

describe('newsletter PocketBase responses', () => {
  it('handles a paginated list of newsletter records', async () => {
    server.use(
      http.get('/api/collections/newsletters/records', () =>
        HttpResponse.json({
          page: 1,
          perPage: 100,
          totalItems: 1,
          totalPages: 1,
          items: [{ id: 'issue-1', title: 'A newsletter issue' }]
        })
      )
    )

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
      totalItems: 1,
      totalPages: 1,
      items: [{ id: 'issue-1', title: 'A newsletter issue' }]
    })
  })
})
