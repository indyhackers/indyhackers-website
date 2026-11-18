import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { createBootstrap } from 'bootstrap-vue-next'
import EventForm from '@/components/events/EventForm.vue'

// A stand-in PocketBase client: EventForm needs topics.getFullList on mount to
// render the topic checkboxes, and files.getURL to preview a stored cover.
function fakePocketBase() {
  return {
    files: {
      getURL: (record, filename) => `http://localhost/api/files/events/${record.id}/${filename}`
    },
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

// jsdom's file input is read-only and has no DataTransfer, so attach the
// FileList by hand before firing the change the component listens for.
async function pickImage(wrapper, file) {
  const input = wrapper.find('#event-image')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

function imageFile({ name = 'cover.png', size = 1024 } = {}) {
  const file = new File(['x'], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function submitValid(wrapper) {
  await wrapper.find('#event-title').setValue('Test Event')
  await wrapper.find('#event-start').setValue('2026-08-01T18:00')
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
  return wrapper.emitted('submit')?.[0]?.[0]
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
  beforeEach(() => {
    // Not implemented in jsdom; the component uses it for the local preview.
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
    // fail() scrolls the alert into view.
    window.scrollTo = vi.fn()
  })

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

  it('leaves the image out of the payload when it is untouched', async () => {
    const wrapper = mountForm()
    await flushPromises()

    const payload = await submitValid(wrapper)
    expect(payload).toBeTruthy()
    expect('image' in payload).toBe(false)
  })

  it('sends the picked file and previews it', async () => {
    const wrapper = mountForm()
    await flushPromises()

    const file = imageFile()
    await pickImage(wrapper, file)

    expect(wrapper.find('.event-form__image-preview').attributes('src')).toBe('blob:preview')

    const payload = await submitValid(wrapper)
    expect(payload.image).toBe(file)
  })

  it('rejects an image over the 5 MB limit', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await pickImage(wrapper, imageFile({ size: 6 * 1024 * 1024 }))

    expect(wrapper.text()).toContain('larger than 5 MB')
    expect(wrapper.find('.event-form__image-preview').exists()).toBe(false)

    const payload = await submitValid(wrapper)
    expect('image' in payload).toBe(false)
  })

  it('discarding an unsaved pick leaves the image out of the payload', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await pickImage(wrapper, imageFile())
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove')
      .trigger('click')

    const payload = await submitValid(wrapper)
    expect('image' in payload).toBe(false)
  })

  it('sends null to delete a stored cover image', async () => {
    const wrapper = mountForm({
      event: {
        id: 'evt_1',
        title: 'Existing',
        description: '',
        location: '',
        url: '',
        all_day: false,
        starts_at: '2026-08-01T22:00:00.000Z',
        ends_at: '',
        topics: [],
        image: 'cover.png'
      }
    })
    await flushPromises()

    expect(wrapper.find('.event-form__image-preview').attributes('src')).toBe(
      'http://localhost/api/files/events/evt_1/cover.png'
    )

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove')
      .trigger('click')
    expect(wrapper.find('.event-form__image-preview').exists()).toBe(false)

    const payload = await submitValid(wrapper)
    expect(payload.image).toBe(null)
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
