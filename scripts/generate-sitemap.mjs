// Generates dist/sitemap.xml from the pages vite-ssg prerendered. Because it
// reads the emitted HTML, the sitemap always matches exactly what was
// prerendered (the public, indexable routes) — no separate list to keep in sync.
// Run after `vite-ssg build` (see the "build" npm script).
import { readdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_URL } from '../src/seo.js'

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

// Map a prerendered file name to its canonical URL path.
//   index.html -> /        about.html -> /about
function fileToPath(file) {
  const route = file.replace(/\.html$/, '')
  return route === 'index' ? '/' : `/${route}`
}

const paths = readdirSync(distDir)
  .filter((f) => f.endsWith('.html'))
  .map(fileToPath)
  .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)))

const urls = paths
  .map((p) => `  <url>\n    <loc>${SITE_URL}${p}</loc>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
console.log(`[sitemap] wrote ${paths.length} urls to dist/sitemap.xml`)
