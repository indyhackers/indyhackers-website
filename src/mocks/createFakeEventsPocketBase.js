import { eventMocks } from '@/mocks/eventMocks'

/**
 * PocketBase stand-in for calendar/events component tests.
 * Seeds only events, topics, and subscriptions from eventMocks.
 *
 * Prefer this when the component under test needs the shared calendar seed data.
 * For jobs (or other features), keep a small per-file mock with the exact
 * return values your assertions need — do not grow this into a general fake.
 *
 * Why not real SDK + MSW: undici's fetch in jsdom rejects the SDK's AbortSignal.
 */
export function createFakeEventsPocketBase() {
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
          const records = data[name] || []
          const record = records.find((item) => item.id === id)
          if (!record) throw new Error('not found')
          return record
        },
        getFirstListItem: async () => {
          throw new Error('not found')
        },
        create: async (payload) => payload,
        update: async (_id, payload) => payload,
        delete: async () => {}
      }
    }
  }
}
