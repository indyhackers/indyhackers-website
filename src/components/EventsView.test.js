import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import EventsView from './EventsView.vue'

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

async function renderEventsSchema(events) {
  const head = createHead()
  mount(EventsView, {
    props: { events },
    global: {
      plugins: [head],
      stubs: {
        EventListItem: true,
        BAlert: { template: '<div><slot /></div>' },
        BSpinner: true
      }
    }
  })
  await flushPromises()
  await renderDOMHead(head)
  const tag = document.querySelector('script[type="application/ld+json"]')
  expect(tag).toBeTruthy()
  return JSON.parse(tag.textContent)
}

describe('EventsView Event JSON-LD', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('uses the event description as plain text', async () => {
    const [node] = await renderEventsSchema([
      {
        id: 'e1',
        title: 'Python Meetup',
        start: future,
        location: 'Launch Fishers',
        description: '<p>Talks on <strong>Python</strong>.</p>'
      }
    ])
    expect(node['@type']).toBe('Event')
    expect(node.description).toBe('Talks on Python .')
  })

  it('falls back to a generated description when the event has none', async () => {
    const [node] = await renderEventsSchema([
      { id: 'e1', title: 'Python Meetup', start: future, location: 'Launch Fishers', description: '' }
    ])
    expect(node.description).toBe(
      'Python Meetup at Launch Fishers — an Indianapolis tech event listed on IndyHackers.'
    )
  })

  it('falls back when the description is only empty markup', async () => {
    const [node] = await renderEventsSchema([
      { id: 'e1', title: 'Online Hack Night', start: future, description: '<p></p>' }
    ])
    expect(node.description).toBe(
      'Online Hack Night — an Indianapolis tech event listed on IndyHackers.'
    )
  })
})
