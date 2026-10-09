<template>
  <section class="newsletter-issue">
    <div class="ih-container">
      <nav class="newsletter-issue__subnav" aria-label="Newsletter">
        <RouterLink to="/newsletter" class="newsletter-issue__subnav-brand">
          <img src="/images/indyhackers-logo.svg" alt="" />
          <span>Hacks &amp;&amp; Happenings</span>
        </RouterLink>
        <div class="newsletter-issue__subnav-links">
          <RouterLink to="/newsletter/page/2">Archives</RouterLink>
          <a href="#newsletter-subscribe">Subscribe</a>
        </div>
      </nav>

      <p v-if="isPreview" class="newsletter-issue__preview-banner" role="status">
        Preview Mode — Close this tab when finished.
      </p>

      <div
        v-if="isPreview && isPublished"
        class="newsletter-issue__published-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-published-title"
      >
        <section class="newsletter-issue__published-notice">
          <h2 id="newsletter-published-title">This issue is now live!</h2>
          <p>The post has been published.</p>
          <RouterLink
            :to="{ name: 'newsletter-issue', params: { slug: publishedSlug } }"
            class="newsletter-issue__published-link"
          >
            View Live Post
          </RouterLink>
        </section>
      </div>

      <p v-if="loading" class="newsletter-issue__state">Loading issue...</p>
      <p v-else-if="error" class="newsletter-issue__state newsletter-issue__state--error">
        {{ error }}
      </p>

      <article v-else-if="issue">
        <header class="newsletter-issue__header">
          <time v-if="publishedAt" :datetime="publishedAt">
            {{ new Date(publishedAt).toLocaleDateString('en-US', { dateStyle: 'long' }) }}
          </time>
          <h1>{{ issue.title }}</h1>
        </header>
        <div class="newsletter-issue__body" v-html="sanitizedContent"></div>

        <section class="newsletter-issue__sponsors" aria-labelledby="issue-sponsors-heading">
          <h2 id="issue-sponsors-heading">Thanks to Our Sponsors</h2>
          <div class="newsletter-issue__sponsor-grid">
            <a
              v-for="sponsor in sponsors"
              :key="sponsor.id"
              :href="sponsor.link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="sponsor.name"
            >
              <img :src="sponsor.logo" :alt="sponsor.name" loading="lazy" />
            </a>
          </div>
        </section>
        <NewsletterSubscribe />

        <nav
          v-if="newerIssue || olderIssue"
          class="newsletter-issue__pagination"
          aria-label="Newsletter issue navigation"
        >
          <RouterLink
            v-if="newerIssue"
            :to="{ name: 'newsletter-issue', params: { slug: newerIssue.slug || newerIssue.id } }"
            class="newsletter-issue__pagination-link"
          >
            <span>← Newer: {{ newerIssue.title }}</span>
          </RouterLink>
          <RouterLink
            v-if="olderIssue"
            :to="{ name: 'newsletter-issue', params: { slug: olderIssue.slug || olderIssue.id } }"
            class="newsletter-issue__pagination-link newsletter-issue__pagination-link--older"
          >
            <span>Older → {{ olderIssue.title }}</span>
          </RouterLink>
        </nav>

        <footer class="newsletter-issue__footer" aria-label="Newsletter links">
          <a href="https://slack.indyhackers.org/" aria-label="IndyHackers Slack">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8.2 2.5a2 2 0 0 1 1.9 1.4l.6 1.8-2.8.9-.6-1.8a2 2 0 0 1 .9-2.2Zm7.6 0a2 2 0 0 1 .9 2.2l-.6 1.8-2.8-.9.6-1.8a2 2 0 0 1 1.9-1.3ZM3 8.2a2 2 0 0 1 2.2-.9l1.8.6-.9 2.8-1.8-.6A2 2 0 0 1 3 8.2Zm18 0a2 2 0 0 1-1.4 1.9l-1.8.6-.9-2.8 1.8-.6a2 2 0 0 1 2.3.9ZM2.5 15.8a2 2 0 0 1 1.4-1.9l1.8-.6.9 2.8-1.8.6a2 2 0 0 1-2.3-.9Zm19 0a2 2 0 0 1-2.2.9l-1.8-.6.9-2.8 1.8.6a2 2 0 0 1 1.3 1.9Zm-13.3 5.7a2 2 0 0 1-.9-2.2l.6-1.8 2.8.9-.6 1.8a2 2 0 0 1-1.9 1.3Zm7.6 0a2 2 0 0 1-1.9-1.4l-.6-1.8 2.8-.9.6 1.8a2 2 0 0 1-.9 2.3Z"
              />
            </svg>
          </a>
          <a href="https://indyhackers.org/" aria-label="IndyHackers website">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              />
            </svg>
          </a>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { sponsors } from '@/data/sponsors'
import NewsletterSubscribe from '@/components/NewsletterSubscribe.vue'
import { sanitizeNewsletterContent } from '@/utils/newsletterContent'

const route = useRoute()
const pocketbase = inject('pocketbase')
const issue = ref(null)
const newerIssue = ref(null)
const olderIssue = ref(null)
const isPreview = ref(false)
const isPublished = ref(false)
const publishedSlug = ref('')
const loading = ref(true)
const error = ref(null)
let previewChannel

const slug = computed(() => String(route.params.slug || ''))
const publishedAt = computed(() => issue.value?.published_at || issue.value?.created || '')
const sanitizedContent = computed(() => {
  if (!issue.value) return ''

  const html = issue.value.content || issue.value.body || issue.value.description || ''
  return sanitizeNewsletterContent(html)
})

watch(
  slug,
  async (currentSlug, _previousSlug, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
      previewChannel?.close()
      previewChannel = undefined
    })

    issue.value = null
    newerIssue.value = null
    olderIssue.value = null
    loading.value = true
    error.value = null
    isPreview.value = false
    isPublished.value = false
    publishedSlug.value = ''

    try {
      if (currentSlug === 'preview') {
        if ('BroadcastChannel' in window) {
          previewChannel = new BroadcastChannel('ih_newsletter_channel')
          previewChannel.onmessage = (event) => {
            if (event.data?.type !== 'POST_PUBLISHED' || typeof event.data.slug !== 'string') {
              return
            }

            isPublished.value = true
            publishedSlug.value = event.data.slug
          }
        }

        const rawPreview = sessionStorage.getItem('ih_newsletter_preview')
        if (!rawPreview) {
          error.value = 'No newsletter preview is available in this tab.'
          return
        }

        try {
          const preview = JSON.parse(rawPreview)
          if (
            !preview ||
            typeof preview !== 'object' ||
            typeof preview.title !== 'string' ||
            typeof preview.content !== 'string'
          ) {
            throw new TypeError('Preview data must include a title and content string.')
          }
          issue.value = preview
          isPreview.value = true
        } catch (err) {
          console.error('Could not read newsletter preview:', err)
          error.value =
            'The newsletter preview data is invalid. Reopen the preview from the editor.'
        }
        return
      }

      isPreview.value = false
      const issues = await pocketbase.collection('newsletters').getFullList({
        fields: 'id,slug,title,published_at,created',
        sort: '-published_at'
      })
      if (cancelled) return

      const index = issues.findIndex(
        (entry) => entry.slug === currentSlug || entry.id === currentSlug
      )
      issue.value =
        index >= 0 ? await pocketbase.collection('newsletters').getOne(issues[index].id) : null
      if (cancelled) return

      newerIssue.value = index > 0 ? issues[index - 1] : null
      olderIssue.value = index >= 0 ? issues[index + 1] || null : null

      if (!issue.value) error.value = 'Newsletter issue not found.'
    } catch (err) {
      if (cancelled) return
      console.error('Error fetching newsletter issue:', err)
      error.value = 'Could not load this newsletter issue. Please try again.'
    } finally {
      if (!cancelled) loading.value = false
    }
  },
  { immediate: typeof window !== 'undefined' }
)

onUnmounted(() => {
  previewChannel?.close()
})
</script>

<style scoped>
.newsletter-issue {
  padding: 3rem 0 4rem;
}

.newsletter-issue__subnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 52rem;
  margin-bottom: 2rem;
  padding: 0 0 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-issue__subnav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.newsletter-issue__subnav-brand img {
  width: 1.75rem;
  height: 1.75rem;
  object-fit: contain;
}

.newsletter-issue__subnav-links {
  display: flex;
  gap: 1.25rem;
}

.newsletter-issue__subnav-links a {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.newsletter-issue__subnav a:hover {
  color: var(--text-primary);
}

.newsletter-issue__state {
  color: var(--text-secondary);
}

.newsletter-issue__state--error {
  color: var(--danger);
}

.newsletter-issue__preview-banner {
  max-width: 52rem;
  margin: 0 0 1.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-brand) 55%, transparent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent-brand) 18%, var(--surface-1));
  color: var(--text-primary);
  font-weight: 700;
}

.newsletter-issue__published-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 85%);
}

.newsletter-issue__published-notice {
  width: min(100%, 28rem);
  padding: 2rem;
  border: 1px solid var(--accent-brand);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-primary);
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.newsletter-issue__published-notice h2 {
  margin: 0 0 0.75rem;
  color: var(--accent-brand);
  font-size: 1.5rem;
}

.newsletter-issue__published-notice p {
  margin: 0;
  color: var(--text-secondary);
}

.newsletter-issue__published-link {
  display: inline-block;
  margin-top: 1.25rem;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-sm);
  background: var(--accent-brand);
  color: var(--surface-1);
  font-weight: 700;
  text-decoration: none;
}

.newsletter-issue__published-link:hover {
  filter: brightness(1.08);
}

.newsletter-issue__header {
  max-width: 52rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-issue__header h1 {
  margin: 0.75rem 0 0;
  font-size: clamp(2rem, 4vw, 3rem);
}

.newsletter-issue__header time {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.newsletter-issue__body {
  max-width: 52rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.newsletter-issue__body :deep(p) {
  margin: 0 0 1.25rem;
  font-style: normal;
}

.newsletter-issue__body :deep(h2),
.newsletter-issue__body :deep(h3),
.newsletter-issue__body :deep(h4) {
  margin: 2.5rem 0 0.75rem;
  color: var(--text-primary);
  line-height: 1.25;
}

.newsletter-issue__body :deep(p.newsletter-issue__signature) {
  margin-top: 2rem;
  color: var(--text-muted);
  font-size: 0.9375rem;
}

.newsletter-issue__body :deep(p.newsletter-issue__signature strong) {
  color: var(--text-primary);
  font-weight: 700;
  font-style: normal;
}

.newsletter-issue__body :deep(p.newsletter-issue__cta) {
  margin: 1.5rem 0;
  text-align: center;
  font-style: normal;
}

.newsletter-issue__body :deep(p.newsletter-issue__cta a) {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: 1px solid color-mix(in srgb, var(--border) 28%, transparent);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--accent-brand);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.newsletter-issue__body :deep(p.newsletter-issue__cta a:hover) {
  border-color: var(--accent-brand);
  background: color-mix(in srgb, var(--surface-2) 75%, var(--accent-brand));
}

.newsletter-issue__body :deep(ul),
.newsletter-issue__body :deep(ol) {
  display: grid;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
  padding-left: 1.5rem;
  list-style-position: outside;
}

.newsletter-issue__body :deep(ul) {
  list-style-type: disc;
}

.newsletter-issue__body :deep(ol) {
  list-style-type: decimal;
}

.newsletter-issue__body :deep(.newsletter-issue__jobs a) {
  text-transform: uppercase;
}

.newsletter-issue__body :deep(blockquote) {
  margin: 1.5rem 0;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 3px solid var(--accent-deep);
  color: var(--text-secondary);
}

.newsletter-issue__body :deep(a) {
  color: var(--accent-deep);
  font-style: normal;
}

.newsletter-issue__body :deep(img) {
  max-width: 100%;
  height: auto;
}

.newsletter-issue__body :deep(.newsletter-issue__video) {
  position: relative;
  width: 100%;
  margin: 1.5rem 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--surface-1);
  aspect-ratio: 16 / 9;
}

.newsletter-issue__body :deep(.newsletter-issue__video iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.newsletter-issue__pagination {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: 1rem;
  max-width: 52rem;
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-1) 55%, transparent);
  transition: border-color 0.2s ease;
}

.newsletter-issue__pagination:hover {
  border-color: color-mix(in srgb, var(--border) 45%, transparent);
}

.newsletter-issue__pagination-link {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  color: var(--text-primary);
  text-decoration: none;
}

.newsletter-issue__pagination-link span {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
}

.newsletter-issue__pagination-link:hover span {
  color: var(--accent-brand);
}

.newsletter-issue__pagination-link--older {
  margin-left: auto;
  text-align: right;
}

.newsletter-issue__sponsors {
  max-width: 52rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-issue__sponsors h2 {
  margin: 0 0 1.25rem;
  font-size: 1.25rem;
}

.newsletter-issue__sponsor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
  align-items: center;
  gap: 1rem;
}

.newsletter-issue__sponsor-grid a {
  display: flex;
  min-height: 5.5rem;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1rem;
  border: 1px solid color-mix(in srgb, #fff 70%, var(--border));
  border-radius: var(--radius-sm);
  background: #fff;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.newsletter-issue__sponsor-grid a:hover {
  border-color: var(--accent-deep);
  transform: translateY(-2px);
}

.newsletter-issue__sponsor-grid img {
  max-width: 100%;
  max-height: 3rem;
  object-fit: contain;
}

.newsletter-issue__footer {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-issue__footer a {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface-1) 55%, transparent);
  color: var(--text-muted);
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.newsletter-issue__footer svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: currentColor;
}

.newsletter-issue__footer a:hover {
  color: var(--accent-brand);
  border-color: var(--accent-brand);
}

@media (max-width: 40rem) {
  .newsletter-issue__pagination {
    flex-direction: column;
  }

  .newsletter-issue__subnav {
    align-items: flex-start;
    flex-direction: column;
  }

  .newsletter-issue__pagination-link--older {
    margin-left: 0;
    text-align: right;
  }
}
</style>
