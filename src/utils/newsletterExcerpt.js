const stopMarker =
  /(?:<!--\s*(?:more|cut|stop\s+here)\s*-->|&lt;!--\s*(?:more|cut|stop\s+here)\s*--&gt;)/i
const paragraphPattern = /(?:<p\b[^>]*>[\s\S]*?<\/p>|&lt;p\b[\s\S]*?&lt;\/p&gt;)/gi
const markdownLinkPattern = /\[([^\]]+)]\(((?:[^()]|\([^()]*\))*)\)/g

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))

const toPlainText = (text) =>
  decodeEntities(text)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(markdownLinkPattern, '$1')
    .replace(/<https?:\/\/[^>]+>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*]\[[^\]]*]/g, '')
    .replace(/\[([^\]]+)]\[[^\]]*]/g, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/(\*\*|__|~~|`{1,3}|\*|_)/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1')
    .replace(/<[^>]*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const getExcerptText = (markdownText = '') =>
  toPlainText(String(markdownText).split(stopMarker, 1)[0])

export function generateNewsletterExcerpt(markdownText = '', maxLength = 150) {
  const plainText = getExcerptText(markdownText)
  if (plainText.length <= maxLength) return plainText

  const cutoff = plainText.lastIndexOf(' ', maxLength)
  const end = cutoff > 0 ? cutoff : plainText.indexOf(' ', maxLength)
  return `${plainText.slice(0, end > 0 ? end : maxLength).trimEnd()}...`
}

export function generateNewsletterExcerptHtml(markdownText = '', maxLength = 150) {
  const excerpt = generateNewsletterExcerpt(markdownText, maxLength)
  const source = decodeEntities(String(markdownText).split(stopMarker, 1)[0])
  const links = []

  source.replace(
    /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_, quote, href, label) => {
      links.push({ href: decodeEntities(href), label: toPlainText(label) })
      return _
    }
  )
  source.replace(markdownLinkPattern, (_, label, href) => {
    links.push({ href, label: toPlainText(label) })
    return _
  })

  let html = escapeHtml(excerpt)
  for (const { href, label } of links) {
    if (!label || !isSafeExcerptHref(href)) continue
    const labelIndex = html.indexOf(escapeHtml(label))
    if (labelIndex < 0) continue

    const escapedLabel = escapeHtml(label)
    const escapedHref = escapeHtml(href)
    html =
      html.slice(0, labelIndex) +
      `<a href="${escapedHref}"${/^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapedLabel}</a>` +
      html.slice(labelIndex + escapedLabel.length)
  }

  return html
}

function isSafeExcerptHref(href) {
  return /^https?:\/\//i.test(href) || (/^\/(?!\/)/.test(href) && !/^\/\\/.test(href))
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[character]
  })
}

export function buildNewsletterExcerpt(content = '') {
  const beforeMarker = String(content).split(stopMarker, 1)[0].trim()
  const paragraphs = beforeMarker.match(paragraphPattern)

  return paragraphs?.length ? paragraphs.slice(0, 2).join('') : beforeMarker
}
