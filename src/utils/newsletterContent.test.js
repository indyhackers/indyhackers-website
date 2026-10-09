import { describe, expect, it } from 'vitest'
import { sanitizeNewsletterContent } from './newsletterContent'

describe('sanitizeNewsletterContent', () => {
  it('embeds standalone YouTube URLs responsively', () => {
    const content = '<p>One more thing:</p><p>https://youtu.be/dQw4w9WgXcQ</p>'

    const result = sanitizeNewsletterContent(content)

    expect(result).toContain('class="newsletter-issue__video"')
    expect(result).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(result).not.toContain('https://youtu.be/')
  })

  it('embeds linked YouTube URLs but keeps unrelated frames and scripts removed', () => {
    const content =
      '<p><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Watch</a></p><iframe src="https://evil.example"></iframe><script>alert(1)</script>'

    const result = sanitizeNewsletterContent(content)

    expect(result).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(result).not.toContain('iframe src="https://evil.example"')
    expect(result).not.toContain('<script>')
  })

  it('rebuilds escaped YouTube iframe embeds with a privacy-enhanced source', () => {
    const content =
      '&lt;div&gt;&lt;iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"&gt;&lt;/iframe&gt;&lt;/div&gt;'

    const result = sanitizeNewsletterContent(content)

    expect(result).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(result).not.toContain('youtube.com/embed/')
  })

  it('marks the signature paragraph for presentation', () => {
    const result = sanitizeNewsletterContent(
      '<p><strong>Chris Vannoy</strong><br>Indy Hackers Board President</p>'
    )

    expect(result).toContain('class="newsletter-issue__signature"')
    expect(result).toContain('<em>Indy Hackers Board President</em>')
  })

  it('normalizes the sponsor heading capitalization', () => {
    const result = sanitizeNewsletterContent('<h2>Thanks to our sponsors</h2>')

    expect(result).toContain('<h2>Thanks to Our Sponsors</h2>')
  })

  it('marks only the job-board list for uppercase link styling', () => {
    const result = sanitizeNewsletterContent(
      '<h2>New on the Job Board</h2><ul><li><a href="/job">Software Engineer III at MISO</a></li></ul><p>Other section</p><ul><li>Event</li></ul>'
    )

    expect(result).toContain('<ul class="newsletter-issue__jobs">')
    expect(result.match(/newsletter-issue__jobs/g)).toHaveLength(1)
  })

  it('marks standalone action links as callouts without changing inline links', () => {
    const result = sanitizeNewsletterContent(
      '<p><a href="https://example.com">Take our annual survey</a></p><p>Visit <a href="https://example.com">our site</a>.</p>'
    )

    expect(result).toContain('<p class="newsletter-issue__cta">')
    expect(result).toContain('Visit <a href="https://example.com">our site</a>.')
  })
})
