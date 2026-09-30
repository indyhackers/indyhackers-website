import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LegalDocument from './LegalDocument.vue'

describe('LegalDocument', () => {
  it.each([
    ['terms', 'Terms of Service'],
    ['privacy', 'Privacy Policy'],
    ['code-of-conduct', 'Indy Hackers Community Code of Conduct']
  ])('renders the %s heading', (slug, heading) => {
    const wrapper = mount(LegalDocument, { props: { slug } })
    expect(wrapper.find('h1').text()).toBe(heading)
  })

  it('renders the new document when the slug changes', async () => {
    const wrapper = mount(LegalDocument, { props: { slug: 'terms' } })
    await wrapper.setProps({ slug: 'privacy' })
    expect(wrapper.find('h1').text()).toBe('Privacy Policy')
  })
})
