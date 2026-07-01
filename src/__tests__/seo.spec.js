import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import { VueHeadMixin } from '@unhead/vue'
import { SITE_URL, SITE_NAME, DEFAULT_TITLE, pageTitle, canonicalUrl } from '@/seo'

describe('seo helpers', () => {
  it('pageTitle suffixes the site name, falling back to the default title', () => {
    expect(pageTitle('About')).toBe(`About · ${SITE_NAME}`)
    expect(pageTitle('')).toBe(DEFAULT_TITLE)
    expect(pageTitle(undefined)).toBe(DEFAULT_TITLE)
  })

  it('canonicalUrl builds an absolute URL and strips query/hash', () => {
    expect(canonicalUrl('/jobs')).toBe(`${SITE_URL}/jobs`)
    expect(canonicalUrl('/job?id=abc')).toBe(`${SITE_URL}/job`)
    expect(canonicalUrl('/x#frag')).toBe(`${SITE_URL}/x`)
    expect(canonicalUrl(undefined)).toBe(`${SITE_URL}/`)
  })
})

// Verifies the actual unhead wiring used in main.js: createHead() + the
// VueHeadMixin that powers the Options-API `head()` option App.vue relies on.
describe('unhead head() wiring', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.title = ''
  })

  let head
  function mountWithHead(component) {
    head = createHead()
    return mount(component, { global: { plugins: [head], mixins: [VueHeadMixin] } })
  }
  // unhead's client renderer is rAF-debounced; force a synchronous flush so the
  // assertions don't race the DOM write.
  const renderHead = () => renderDOMHead(head)

  it('renders a reactive head() option to the document', async () => {
    const Comp = {
      data: () => ({ title: 'About', description: 'About us' }),
      head() {
        return {
          title: pageTitle(this.title),
          meta: [
            { name: 'description', content: this.description },
            { property: 'og:title', content: pageTitle(this.title) }
          ]
        }
      },
      template: '<div />'
    }

    const wrapper = mountWithHead(Comp)
    await flushPromises()
    await renderHead()

    expect(document.title).toBe(`About · ${SITE_NAME}`)
    expect(document.querySelector('meta[name="description"]')?.content).toBe('About us')
    expect(document.querySelector('meta[property="og:title"]')?.content).toBe(
      `About · ${SITE_NAME}`
    )

    // Reactivity: changing state updates the rendered tags.
    wrapper.vm.title = 'Jobs'
    wrapper.vm.description = 'Job openings'
    await flushPromises()
    await renderHead()

    expect(document.title).toBe(`Jobs · ${SITE_NAME}`)
    expect(document.querySelector('meta[name="description"]')?.content).toBe('Job openings')
  })
})
