import PocketBase from 'pocketbase'
import process from 'node:process'
import { buildNewsletterExcerpt } from './src/utils/newsletterExcerpt.js'

const pb = new PocketBase('http://localhost:8090')

const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
const ADMIN_PASS = process.env.POCKETBASE_ADMIN_PASSWORD
const RSS_URL = 'https://buttondown.com/indyhackers/rss'

async function runMigration() {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    throw new Error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD before importing.')
  }

  console.log('Authenticating with PocketBase...')
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS)

  console.log(`Fetching RSS feed from ${RSS_URL}...`)
  const response = await fetch(RSS_URL)
  const xmlText = await response.text()

  const items = xmlText.match(/<item[\s\S]*?<\/item>/gi) || []
  console.log(`Found ${items.length} items to import.`)

  for (const itemXml of items) {
    const getTag = (tag) => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : ''
    }

    const title = getTag('title')
    const link = getTag('link')
    const pubDateStr = getTag('pubDate')
    const rawContent = getTag('content:encoded') || getTag('description')

    const slug = link.includes('/archive/')
      ? link.split('/archive/')[1].split('/')[0].trim()
      : title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')

    const excerpt = buildNewsletterExcerpt(rawContent)
    const publishedAt = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString()

    const recordData = {
      title,
      slug,
      content: rawContent,
      excerpt,
      published_at: publishedAt,
      featured: false,
      link: link
    }

    try {
      const existing = await pb
        .collection('newsletters')
        .getFirstListItem(`slug="${slug}"`)
        .catch(() => null)

      if (existing) {
        console.log(`[SKIP] Already exists: ${slug}`)
      } else {
        await pb.collection('newsletters').create(recordData)
        console.log(`[IMPORTED] ${title} (${slug})`)
      }
    } catch (err) {
      console.error(`[ERROR] Failed to import: ${title}`, err?.data || err?.message)
    }
  }

  console.log('Migration complete!')
}

runMigration().catch((err) => {
  console.error('Newsletter import failed:', err)
  process.exitCode = 1
})
