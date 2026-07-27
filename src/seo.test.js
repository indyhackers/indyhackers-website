import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import { VueHeadMixin } from '@unhead/vue'
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  pageTitle,
  canonicalUrl,
  jsonLd,
  stripHtml,
  ORGANIZATION_SCHEMA
} from '@/seo'

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

  it('stripHtml removes tags, collapses whitespace, and caps length', () => {
    expect(stripHtml('<p>Hello   <b>world</b></p>')).toBe('Hello world')
    expect(stripHtml('')).toBe('')
    const long = stripHtml('x'.repeat(400), 10)
    expect(long.length).toBe(10)
    expect(long.endsWith('…')).toBe(true)
  })

  it('jsonLd produces an ld+json descriptor and escapes < for safety', () => {
    const tag = jsonLd({ '@type': 'Thing', name: '</script><b>' }, 'ld-x')
    expect(tag.type).toBe('application/ld+json')
    expect(tag.key).toBe('ld-x')
    expect(tag.innerHTML).not.toContain('</script>')
    expect(tag.innerHTML).toContain('\\u003c')
    expect(JSON.parse(tag.innerHTML).name).toBe('</script><b>')
  })

  it('ORGANIZATION_SCHEMA is valid schema.org Organization markup', () => {
    expect(ORGANIZATION_SCHEMA['@context']).toBe('https://schema.org')
    expect(ORGANIZATION_SCHEMA['@type']).toBe('Organization')
    expect(ORGANIZATION_SCHEMA.name).toBe(SITE_NAME)
    expect(ORGANIZATION_SCHEMA.url).toBe(SITE_URL)
  })
})

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

    wrapper.vm.title = 'Jobs'
    wrapper.vm.description = 'Job openings'
    await flushPromises()
    await renderHead()

    expect(document.title).toBe(`Jobs · ${SITE_NAME}`)
    expect(document.querySelector('meta[name="description"]')?.content).toBe('Job openings')
  })
})
