import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createHead, renderDOMHead } from '@unhead/vue/client'
import { VueHeadMixin } from '@unhead/vue'
import JobListing from '@/components/jobs/JobListing.vue'
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
    // Round-trips back to the original object (the escape is JSON-safe).
    expect(JSON.parse(tag.innerHTML).name).toBe('</script><b>')
  })

  it('ORGANIZATION_SCHEMA is valid schema.org Organization markup', () => {
    expect(ORGANIZATION_SCHEMA['@context']).toBe('https://schema.org')
    expect(ORGANIZATION_SCHEMA['@type']).toBe('Organization')
    expect(ORGANIZATION_SCHEMA.name).toBe(SITE_NAME)
    expect(ORGANIZATION_SCHEMA.url).toBe(SITE_URL)
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

  it('JobListing emits valid JobPosting JSON-LD once the job loads', async () => {
    head = createHead()
    const job = {
      id: 'job1',
      title: 'Senior Developer',
      company: 'Acme Corp',
      salary_min: 100,
      salary_max: 150,
      description: '<p>Great <strong>opportunity</strong></p>',
      how_to_apply: '',
      created: '2025-01-10T12:00:00.000Z',
      approved_at: '2025-01-15T12:00:00.000Z'
    }
    const pb = { collection: () => ({ getOne: vi.fn().mockResolvedValue(job) }) }

    mount(JobListing, {
      global: {
        plugins: [head],
        mixins: [VueHeadMixin],
        config: { globalProperties: { pocketbase: pb, $route: { query: { id: 'job1' } } } },
        stubs: {
          'b-card': { template: '<div><slot /></div>' },
          'b-badge': { template: '<span><slot /></span>' }
        }
      }
    })
    await flushPromises()
    await renderHead()

    const tag = document.querySelector('script[type="application/ld+json"]')
    expect(tag).toBeTruthy()
    const data = JSON.parse(tag.textContent)
    expect(data['@type']).toBe('JobPosting')
    expect(data.title).toBe('Senior Developer')
    expect(data.hiringOrganization.name).toBe('Acme Corp')
    expect(data.datePosted).toBe('2025-01-15')
    expect(data.baseSalary.value.minValue).toBe(100000)
    expect(data.baseSalary.value.maxValue).toBe(150000)
    expect(data.jobLocation.address.addressRegion).toBe('IN')
  })
})
