import DOMPurify from 'dompurify'

const videoIdFromUrl = (value) => {
  try {
    const url = new URL(value)
    let videoId = ''

    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.slice(1)
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') || ''
      else videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || ''
    } else if (
      ['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname) &&
      url.pathname.startsWith('/embed/')
    ) {
      videoId = url.pathname.slice('/embed/'.length)
    }

    return /^[\w-]{11}$/.test(videoId) ? videoId : ''
  } catch {
    return ''
  }
}

const createVideoEmbed = (videoId) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'newsletter-issue__video'

  const iframe = document.createElement('iframe')
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`
  iframe.title = 'YouTube video player'
  iframe.loading = 'lazy'
  iframe.referrerPolicy = 'strict-origin-when-cross-origin'
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  iframe.allowFullscreen = true

  wrapper.append(iframe)
  return wrapper
}

const replaceVideoLinks = (root) => {
  root.querySelectorAll('a[href]').forEach((anchor) => {
    const videoId = videoIdFromUrl(anchor.href)
    if (videoId) anchor.replaceWith(createVideoEmbed(videoId))
  })

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  textNodes.forEach((textNode) => {
    const text = textNode.textContent.trim()
    const videoId = videoIdFromUrl(text)
    const parent = textNode.parentElement
    if (!videoId || !parent || parent.closest('a, iframe, script, style')) return

    textNode.replaceWith(createVideoEmbed(videoId))
  })
}

export function sanitizeNewsletterContent(content = '') {
  const decoded = document.createElement('textarea')
  decoded.innerHTML = content

  const source = document.createElement('template')
  source.innerHTML = decoded.value
  source.content.querySelectorAll('iframe[src]').forEach((iframe) => {
    const videoId = videoIdFromUrl(iframe.getAttribute('src') || '')
    if (!videoId) return

    const link = document.createElement('a')
    link.href = `https://www.youtube.com/watch?v=${videoId}`
    link.textContent = link.href
    iframe.replaceWith(link)
  })

  const sanitized = DOMPurify.sanitize(source.innerHTML, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class']
  })

  const container = document.createElement('template')
  container.innerHTML = sanitized
  replaceVideoLinks(container.content)

  const signature = [...container.content.querySelectorAll('p')].findLast(
    (paragraph) =>
      paragraph.querySelector(':scope > strong') && paragraph.querySelector(':scope > br')
  )
  if (signature) {
    signature.classList.add('newsletter-issue__signature')
    const lineBreak = signature.querySelector(':scope > br')
    const title = lineBreak?.nextSibling
    if (title?.nodeType === Node.TEXT_NODE && title.textContent.trim()) {
      const emphasis = document.createElement('em')
      emphasis.textContent = title.textContent.trim()
      title.replaceWith(emphasis)
    }
  }

  container.content.querySelectorAll('p').forEach((paragraph) => {
    const links = paragraph.querySelectorAll('a')
    if (links.length === 1 && paragraph.textContent.trim() === links[0].textContent.trim()) {
      paragraph.classList.add('newsletter-issue__cta')
    }
  })

  container.content.querySelectorAll('h2').forEach((heading) => {
    if (/^thanks to our sponsors$/i.test(heading.textContent.trim())) {
      heading.textContent = 'Thanks to Our Sponsors'
    }

    if (/^new on the job board$/i.test(heading.textContent.trim())) {
      const jobList = heading.nextElementSibling
      if (jobList?.matches('ul, ol')) jobList.classList.add('newsletter-issue__jobs')
    }
  })

  return container.innerHTML
}
