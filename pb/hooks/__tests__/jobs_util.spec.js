import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// jobs_util.js is a CommonJS PocketBase hook module (the JSVM uses require /
// module.exports), while this repo is ESM and Vitest runs files through Vite's
// ESM transform (and import.meta.url isn't a file: URL under jsdom). Load the
// raw source from the repo root and evaluate it as CommonJS so we exercise the
// exact file the hooks run. Its only global reference ($app) lives inside
// requestIsPrivileged, which we don't call here.
const src = readFileSync(resolve(process.cwd(), 'pb/hooks/jobs_util.js'), 'utf8')
const mod = { exports: {} }
new Function('module', 'exports', 'require', src)(mod, mod.exports, () => ({}))
const { sanitizeRichText } = mod.exports

describe('sanitizeRichText (jobs rich-text defense-in-depth)', () => {
  it('keeps the formatting tags TipTap emits', () => {
    const out = sanitizeRichText('<p>Hi <strong>bold</strong> <em>it</em></p><ul><li>a</li></ul>')
    expect(out).toBe('<p>Hi <strong>bold</strong> <em>it</em></p><ul><li>a</li></ul>')
  })

  it('removes <script>/<style>/<iframe>/<svg> and their contents', () => {
    expect(sanitizeRichText('<script>alert(1)</script>keep')).toBe('keep')
    expect(sanitizeRichText('<style>body{}</style>keep')).toBe('keep')
    expect(sanitizeRichText('<iframe src="evil"></iframe>keep')).toBe('keep')
    expect(sanitizeRichText('<svg><script>alert(1)</script></svg>keep')).toBe('keep')
  })

  it('strips event-handler and other attributes but keeps the tag', () => {
    expect(sanitizeRichText('<p onclick="steal()">hi</p>')).toBe('<p>hi</p>')
  })

  it('drops disallowed tags but keeps their text', () => {
    expect(sanitizeRichText('<div><span>plain</span></div>')).toBe('plain')
    expect(sanitizeRichText('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('neutralizes javascript:/data: hrefs (incl. entity/whitespace obfuscation)', () => {
    for (const href of [
      'javascript:alert(1)',
      'java&#115;cript:alert(1)',
      'jav\tascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ]) {
      const out = sanitizeRichText(`<a href="${href}">x</a>`)
      expect(out).toBe('<a>x</a>')
      expect(out.toLowerCase()).not.toContain('alert(1)')
    }
  })

  it('preserves safe http/mailto/relative hrefs and adds rel', () => {
    expect(sanitizeRichText('<a href="https://ok.com/jobs">a</a>')).toBe(
      '<a href="https://ok.com/jobs" rel="nofollow ugc noopener noreferrer">a</a>'
    )
    expect(sanitizeRichText('<a href="mailto:a@b.com">m</a>')).toContain('href="mailto:a@b.com"')
    expect(sanitizeRichText('<a href="/careers">r</a>')).toContain('href="/careers"')
  })

  it('strips HTML comments', () => {
    expect(sanitizeRichText('<!-- <script>x</script> -->keep')).toBe('keep')
  })

  it('normalizes tag casing', () => {
    expect(sanitizeRichText('<STRONG>up</STRONG>')).toBe('<strong>up</strong>')
  })
})
