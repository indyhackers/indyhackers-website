// Shared SEO constants. Kept in one place so canonical/OG URLs, the sitemap
// generator, and structured data all agree on the site's identity.

export const SITE_URL = 'https://www.indyhackers.org'
export const SITE_NAME = 'IndyHackers'
export const SITE_TAGLINE = "Indiana's Tech Community"

// Used as the <title> on the homepage and as a fallback everywhere a page
// doesn't set its own title.
export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`

export const DEFAULT_DESCRIPTION =
  "IndyHackers is Indianapolis's tech community — 3,000+ members, meetups, jobs, and a Slack where Indy devs hang out."

// Absolute URL to the default social-share image (the homepage hero).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/welcome.webp`

// Build a page title of the form "Page · IndyHackers", falling back to the
// full default title when a page has no title of its own.
export function pageTitle(title) {
  return title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE
}

// Absolute canonical URL for a router path (drops any query string / hash).
export function canonicalUrl(path) {
  const clean = (path || '/').split('?')[0].split('#')[0]
  return SITE_URL + clean
}
