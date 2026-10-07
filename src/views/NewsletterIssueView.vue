<template>
  <section class="newsletter-issue">
    <div class="ih-container">
      <RouterLink to="/newsletter" class="newsletter-issue__back">
        &larr; Back to all issues
      </RouterLink>

      <p v-if="loading" class="newsletter-issue__state">Loading issue...</p>
      <p v-else-if="error" class="newsletter-issue__state newsletter-issue__state--error">
        {{ error }}
      </p>

      <article v-else-if="issue">
        <header class="newsletter-issue__header">
          <h1>{{ issue.title }}</h1>
          <time v-if="publishedAt" :datetime="publishedAt">
            {{ new Date(publishedAt).toLocaleDateString('en-US', { dateStyle: 'long' }) }}
          </time>
        </header>
        <div class="newsletter-issue__body" v-html="sanitizedContent"></div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DOMPurify from 'dompurify'

const route = useRoute()
const pocketbase = inject('pocketbase')
const issue = ref(null)
const loading = ref(true)
const error = ref(null)

const slug = computed(() => String(route.params.slug || ''))
const publishedAt = computed(() => issue.value?.published_at || issue.value?.created || '')
const sanitizedContent = computed(() => {
  if (!issue.value) return ''

  const html = issue.value.content || issue.value.body || issue.value.description || ''
  const decoded = document.createElement('textarea')
  decoded.innerHTML = html

  return DOMPurify.sanitize(decoded.value, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class']
  })
})

onMounted(async () => {
  try {
    const escapedSlug = slug.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const result = await pocketbase.collection('newsletters').getList(1, 1, {
      filter: `slug = "${escapedSlug}"`
    })
    issue.value = result.items[0] || null

    if (!issue.value && /^[a-z0-9]{15}$/.test(slug.value)) {
      issue.value = await pocketbase.collection('newsletters').getOne(slug.value)
    }

    if (!issue.value) error.value = 'Newsletter issue not found.'
  } catch (err) {
    console.error('Error fetching newsletter issue:', err)
    error.value = 'Could not load this newsletter issue. Please try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.newsletter-issue {
  padding: 3rem 0 4rem;
}

.newsletter-issue__back {
  display: inline-block;
  margin-bottom: 2rem;
  color: var(--accent-deep);
  text-decoration: none;
}

.newsletter-issue__back:hover {
  color: var(--text-primary);
}

.newsletter-issue__state {
  color: var(--text-secondary);
}

.newsletter-issue__state--error {
  color: var(--danger);
}

.newsletter-issue__header {
  max-width: 48rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-issue__header h1 {
  margin-bottom: 0.75rem;
  font-size: clamp(2rem, 4vw, 3rem);
}

.newsletter-issue__header time {
  color: var(--text-muted);
}

.newsletter-issue__body {
  max-width: 48rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.newsletter-issue__body :deep(a) {
  color: var(--accent-deep);
}

.newsletter-issue__body :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
