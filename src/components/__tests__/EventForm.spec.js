import { describe, it, expect } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createBootstrap } from 'bootstrap-vue-next'
import EventForm from '@/components/events/EventForm.vue'

// A stand-in PocketBase client: EventForm only needs topics.getFullList on
// mount to render the topic checkboxes.
function fakePocketBase() {
  return {
    collection() {
      return {
        getFullList: async () => [
          { id: 'top_ruby', name: 'Ruby' },
          { id: 'top_go', name: 'Go' }
        ]
      }
    }
  }
}

function mountForm(props = {}) {
  return mount(EventForm, {
    props,
    global: {
      plugins: [createBootstrap()],
      provide: { pocketbase: fakePocketBase() },
      stubs: { RouterLink: RouterLinkStub, TipTapEditor: true }
    }
  })
}

describe('EventForm', () => {
  it('blocks submit and warns when the title is empty', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('#event-start').setValue('2026-08-01T18:00')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('give the event a title')
  })

  it('rejects an end that precedes the start', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('#event-title').setValue('Test Event')
    await wrapper.find('#event-start').setValue('2026-08-01T18:00')
    await wrapper.find('#event-end').setValue('2026-08-01T17:00')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('end time is before the start time')
  })

  it('emits a normalized payload with ISO datetimes and selected topics', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('#event-title').setValue('Test Event')
    await wrapper.find('#event-location').setValue('High Alpha')
    await wrapper.find('#event-start').setValue('2026-08-01T18:00')
    await wrapper.find('#event-end').setValue('2026-08-01T20:00')
    // Tick the first topic checkbox (Ruby).
    await wrapper.find('input[value="top_ruby"]').setValue(true)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const payload = emitted[0][0]
    expect(payload.title).toBe('Test Event')
    expect(payload.location).toBe('High Alpha')
    expect(payload.topics).toContain('top_ruby')
    // Local input converted to a valid ISO instant.
    expect(new Date(payload.starts_at).toISOString()).toBe(payload.starts_at)
    expect(new Date(payload.ends_at) > new Date(payload.starts_at)).toBe(true)
    expect(payload.status).toBe('confirmed')
  })

  it('prefills from an existing event in edit mode', async () => {
    const wrapper = mountForm({
      event: {
        title: 'Existing',
        description: '',
        location: 'Somewhere',
        url: '',
        all_day: false,
        starts_at: '2026-08-01T22:00:00.000Z',
        ends_at: '',
        topics: ['top_go']
      }
    })
    await flushPromises()

    expect(wrapper.find('#event-title').element.value).toBe('Existing')
    expect(wrapper.find('#event-location').element.value).toBe('Somewhere')
    expect(wrapper.find('input[value="top_go"]').element.checked).toBe(true)
  })
})
