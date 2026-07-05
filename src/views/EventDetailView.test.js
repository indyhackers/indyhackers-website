import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import EventDetailView from '@/views/EventDetailView.vue'
import { fakePocketBase } from '@/mocks/fakePocketBase'

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRoute: () => ({ params: { id: 'evt_meetup_jun' } }) }
})

describe('EventDetailView', () => {
  it('loads a recurring event and shows the reminders panel', async () => {
    const wrapper = mount(EventDetailView, {
      global: {
        provide: { pocketbase: fakePocketBase() },
        stubs: { RouterLink: RouterLinkStub }
      }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('IndyHackers Monthly Meetup')
    expect(text).toContain('Reminders')
  })
})
