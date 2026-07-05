import { eventMocks } from '@/mocks/eventMocks'

// Lightweight stand-in for the injected PocketBase client in component tests.
// (We don't use the real SDK + MSW here: undici's fetch in jsdom rejects the
// SDK's AbortSignal, a known test-harness quirk.)
export function fakePocketBase() {
  const data = {
    events: eventMocks.events.items,
    topics: eventMocks.topics.items,
    subscriptions: eventMocks.subscriptions.items
  }
  return {
    authStore: { isValid: false, record: null },
    collection(name) {
      return {
        getFullList: async () => data[name] || [],
        getOne: async (id) => {
          const rec = data.events.find((e) => e.id === id)
          if (!rec) throw new Error('not found')
          return rec
        },
        getFirstListItem: async () => {
          throw new Error('not found')
        },
        create: async (d) => d,
        update: async (id, d) => d,
        delete: async () => {}
      }
    }
  }
}
