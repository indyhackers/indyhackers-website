import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import CalendarView from '@/components/CalendarView.vue'
import { fakePocketBase } from '@/mocks/fakePocketBase'

function mountWith(component, props = {}) {
  return mount(component, {
    props,
    global: {
      provide: { pocketbase: fakePocketBase() },
      stubs: { RouterLink: RouterLinkStub }
    }
  })
}

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00-04:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders upcoming events from the mocked events collection', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('AI & ML Indy: Local LLM Deployment')
    expect(text).toContain('Indy .NET User Group')
    expect(text).toContain('AI/ML')
  })

  it('filters the list by search query', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('IndyPy')
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('IndyPy: Python in Production')
    expect(text).not.toContain('Indy .NET User Group')
  })

  it('switches to the calendar grid view', async () => {
    const wrapper = mountWith(CalendarView)
    await flushPromises()

    const calendarTab = wrapper.findAll('button').find((b) => b.text() === 'Calendar')
    await calendarTab.trigger('click')
    await flushPromises()

    expect(wrapper.find('.cal').exists()).toBe(true)
    expect(wrapper.find('.cal__title').text()).toMatch(/\d{4}/)
  })
})
