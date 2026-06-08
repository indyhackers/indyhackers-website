<template>
  <section class="newsletter-hero">
    <div class="ih-container">
      <h1>Hacks &amp; Happenings</h1>
      <p class="newsletter-hero__sub">
        An every-so-often collection of projects and blog posts by local developers and
        developer-centric events, delivered straight to your inbox.
      </p>

      <div v-if="subscribed" class="signup-success">
        You're in. Check your inbox to confirm.
      </div>
      <form v-else class="signup-form" @submit.prevent="subscribe">
        <input
          v-model="email"
          type="email"
          required
          placeholder="you@example.com"
          class="signup-form__input"
          aria-label="Email address"
          :disabled="submitting"
        />
        <button type="submit" class="ih-btn-primary signup-form__btn" :disabled="submitting">
          {{ submitting ? 'Subscribing...' : 'Subscribe' }}
        </button>
      </form>
      <div v-if="subscribeError" class="signup-error">{{ subscribeError }}</div>
    </div>
  </section>

  <section class="newsletter-content ih-full-bleed">
    <div class="ih-container">
      <!-- Loading -->
      <div v-if="loading" class="newsletter-loading">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="newsletter-error">{{ error }}</div>

      <!-- Latest issue — featured -->
      <template v-else-if="posts.length > 0">
        <article class="featured-issue">
          <p class="featured-issue__label">Latest Issue</p>
          <h2 class="featured-issue__title">
            <a :href="visiblePosts[0].link" target="_blank" rel="noopener noreferrer">
              {{ visiblePosts[0].title }}
            </a>
          </h2>
          <p class="featured-issue__date">{{ visiblePosts[0].pubDateFormatted }}</p>
          <div
            class="featured-issue__excerpt"
            v-html="sanitizeHtml(visiblePosts[0].description)"
          ></div>
          <a
            :href="visiblePosts[0].link"
            target="_blank"
            rel="noopener noreferrer"
            class="featured-issue__read"
          >
            Read the full issue →
          </a>
        </article>

        <!-- Older issues -->
        <div v-if="visiblePosts.length > 1" class="older-issues">
          <h3 class="older-issues__heading">Previous Issues</h3>
          <div v-for="post in visiblePosts.slice(1)" :key="post.guid" class="older-issue">
            <a :href="post.link" target="_blank" rel="noopener noreferrer" class="older-issue__title">
              {{ post.title }}
            </a>
            <span class="older-issue__date">{{ post.pubDateFormatted }}</span>
          </div>
        </div>

        <div v-if="hasMore" class="newsletter-load-more">
          <button class="ih-btn-outline" @click="loadMore">Older Issues</button>
        </div>

        <p class="newsletter-archive">
          Browse the <a href="https://buttondown.email/indyhackers/archive/">full archive</a>
          or the <a href="https://www.indyhackers.org/newsletter/archive">older archive</a>.
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNewsletter } from '@/composables/useNewsletter'
import DOMPurify from 'dompurify'

const { posts, visiblePosts, hasMore, loadMore, loading, error, fetchNewsletter } = useNewsletter({ initialCount: 1, loadMoreCount: 10 })

const email = ref('')
const submitting = ref(false)
const subscribed = ref(false)
const subscribeError = ref(null)

const subscribe = async () => {
  submitting.value = true
  subscribeError.value = null

  try {
    const form = new FormData()
    form.append('email', email.value)

    const response = await fetch(
      'https://buttondown.email/api/emails/embed-subscribe/indyhackers',
      { method: 'POST', body: form }
    )

    if (response.ok || response.status === 201) {
      subscribed.value = true
    } else {
      subscribeError.value = 'Something went wrong. Try again?'
    }
  } catch {
    subscribeError.value = 'Could not connect. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}

const sanitizeHtml = (html) => {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class']
  })
  return clean.replace(/<img(?![^>]*\balt=)/gi, '<img alt=""')
}

onMounted(() => {
  fetchNewsletter()
})
</script>

<style scoped>
/* Hero */
.newsletter-hero {
  padding: 3rem 0;
}

.newsletter-hero h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1.25rem;
}

.newsletter-hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  max-width: 38rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

/* Signup form */
.signup-form {
  display: flex;
  gap: 0.75rem;
  max-width: 28rem;
}

.signup-form__input {
  flex: 1;
  padding: 0.875rem 1rem;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-primary);
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--border) 25%, transparent);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.2s ease;
}

.signup-form__input::placeholder {
  color: var(--text-muted);
}

.signup-form__input:focus {
  border-color: var(--focus-ring);
}

.signup-form__input:disabled {
  opacity: 0.6;
}

.signup-form__btn {
  flex-shrink: 0;
}

.signup-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.signup-success {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  font-weight: bold;
  color: var(--success);
}

.signup-error {
  font-size: 0.875rem;
  color: var(--danger);
  margin-top: 0.5rem;
}

/* Content section */
.newsletter-content {
  padding: 3rem 0 4rem;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.newsletter-loading {
  text-align: center;
  padding: 3rem 0;
}

.newsletter-error {
  background: var(--danger-subtle);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  padding: 1rem;
  color: var(--danger);
}

/* Featured issue */
.featured-issue {
  max-width: 40rem;
}

.featured-issue__label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-deep);
  margin: 0 0 0.75rem;
}

.featured-issue__title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.2;
  margin: 0 0 0.5rem;
}

.featured-issue__title a {
  color: var(--text-primary);
  text-decoration: none;
}

.featured-issue__title a:hover {
  color: var(--link-hover);
}

.featured-issue__date {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 1.25rem;
}

.featured-issue__excerpt {
  color: var(--text-secondary);
  line-height: 1.7;
  max-height: 12em;
  overflow: hidden;
  margin-bottom: 1.25rem;
}

.featured-issue__excerpt :deep(p) {
  margin: 0 0 0.75rem;
}

.featured-issue__excerpt :deep(a) {
  color: var(--text-primary);
  text-decoration: underline;
}

.featured-issue__read {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: bold;
  color: var(--accent-deep);
  text-decoration: none;
}

.featured-issue__read:hover {
  color: var(--text-primary);
}

/* Older issues — compact list */
.older-issues {
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.older-issues__heading {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.older-issue {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.625rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 8%, transparent);
}

.older-issue:last-child {
  border-bottom: none;
}

.older-issue__title {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  font-weight: bold;
  color: var(--text-primary);
  text-decoration: none;
}

.older-issue__title:hover {
  color: var(--link-hover);
}

.older-issue__date {
  font-size: 0.8125rem;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-left: 1.5rem;
}

/* Load more + archive */
.newsletter-load-more {
  text-align: center;
  padding-top: 1.5rem;
}

.newsletter-archive {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 8%, transparent);
}

.newsletter-archive a {
  color: var(--accent-deep);
}

.newsletter-archive a:hover {
  color: var(--text-primary);
}

@media (max-width: 480px) {
  .signup-form {
    flex-direction: column;
  }

  .older-issue {
    flex-direction: column;
    gap: 0.125rem;
  }

  .older-issue__date {
    margin-left: 0;
  }
}
</style>
