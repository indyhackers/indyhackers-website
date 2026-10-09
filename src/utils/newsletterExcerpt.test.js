import { describe, expect, it } from 'vitest'
import {
  buildNewsletterExcerpt,
  generateNewsletterExcerpt,
  generateNewsletterExcerptHtml
} from './newsletterExcerpt'

describe('buildNewsletterExcerpt', () => {
  it('uses the Buttondown teaser marker when present', () => {
    const content =
      '<p>Intro with <a href="/newsletter/issue">a link</a>.</p><!--more--><p>Full issue.</p>'

    expect(buildNewsletterExcerpt(content)).toBe(
      '<p>Intro with <a href="/newsletter/issue">a link</a>.</p>'
    )
  })

  it('keeps two complete paragraphs and preserves links without a marker', () => {
    const content =
      '<p>Our friends at <a href="https://connect317.com">Connect317</a>.</p><p>Second paragraph.</p><p>More content.</p>'

    expect(buildNewsletterExcerpt(content)).toBe(
      '<p>Our friends at <a href="https://connect317.com">Connect317</a>.</p><p>Second paragraph.</p>'
    )
  })

  it('recognizes HTML-escaped paragraphs and Buttondown markers', () => {
    const content =
      '&lt;p&gt;First paragraph.&lt;/p&gt;&lt;!--cut--&gt;&lt;p&gt;Full issue.&lt;/p&gt;'

    expect(buildNewsletterExcerpt(content)).toBe('&lt;p&gt;First paragraph.&lt;/p&gt;')
  })

  it('does not truncate non-paragraph content mid-sentence', () => {
    const content = 'Our friends at [Connect317](https://connect317.com) are hosting an event.'

    expect(buildNewsletterExcerpt(content)).toBe(content)
  })
})

describe('generateNewsletterExcerpt', () => {
  it('converts markdown formatting and links to plain text', () => {
    const content =
      '# **Our friends** at [Connect317](https://connect317.com) shared a *great story*.'

    expect(generateNewsletterExcerpt(content)).toBe(
      'Our friends at Connect317 shared a great story.'
    )
  })

  it('strips HTML markup and decodes escaped HTML text', () => {
    expect(generateNewsletterExcerpt('&lt;p&gt;Hello &amp; welcome.&lt;/p&gt;')).toBe(
      'Hello & welcome.'
    )
  })

  it('omits raw URLs and image markdown', () => {
    expect(
      generateNewsletterExcerpt(
        'Read [the article](https://example.com) https://other.test/a ![logo](logo.png)'
      )
    ).toBe('Read the article')
  })

  it('truncates at the last complete word near the character limit', () => {
    expect(generateNewsletterExcerpt('alpha beta gamma delta epsilon', 14)).toBe('alpha beta...')
  })

  it('uses text before a Buttondown stop marker', () => {
    expect(generateNewsletterExcerpt('First paragraph.<!--more-->Second paragraph.')).toBe(
      'First paragraph.'
    )
  })

  it('preserves safe HTML links in the excerpt', () => {
    expect(
      generateNewsletterExcerptHtml(
        '<p>Our friends at <a href="https://connect317.com">Connect317</a> shared news.</p>'
      )
    ).toBe(
      'Our friends at <a href="https://connect317.com" target="_blank" rel="noopener noreferrer">Connect317</a> shared news.'
    )
  })

  it('can render a full stored featured excerpt without the archive truncation', () => {
    const excerpt =
      'This is the full stored featured excerpt. '.repeat(5) +
      '<a href="https://connect317.com">Connect317</a>'
    const rendered = generateNewsletterExcerptHtml(excerpt, Number.POSITIVE_INFINITY)

    expect(rendered).toContain('Connect317</a>')
    expect(rendered).not.toContain('...')
    expect(rendered).toContain('rel="noopener noreferrer"')
  })

  it('preserves markdown links but excludes unsafe link protocols', () => {
    expect(
      generateNewsletterExcerptHtml(
        '[Connect317](https://connect317.com) and [bad](javascript:alert(1))'
      )
    ).toBe(
      '<a href="https://connect317.com" target="_blank" rel="noopener noreferrer">Connect317</a> and bad'
    )
  })
})
