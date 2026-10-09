<template>
  <div class="newsletter-page">
    <section class="newsletter-hero">
      <div class="ih-container">
        <h1>Hacks &amp; Happenings</h1>
        <p class="newsletter-hero__sub">
          An every-so-often collection of projects and blog posts by local developers and
          developer-centric events, delivered straight to your inbox.
        </p>

        <NewsletterSubscribe />
      </div>
    </section>

    <section class="newsletter-content ih-full-bleed">
      <div class="ih-container">
        <div v-if="isAdmin" class="newsletter-dev-bar">
          <div>
            <span class="newsletter-dev-bar__label">Admin session active</span>
          </div>
          <RouterLink to="/admin/newsletter/new" class="ih-btn-primary newsletter-dev-bar__link">
            + Create Post
          </RouterLink>
        </div>

        <div v-if="loading" class="newsletter-loading">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <div v-else-if="error" class="newsletter-error">{{ error }}</div>

        <template v-else-if="posts.length > 0">
          <template v-if="visiblePosts.length && archivePage === 1">
            <article class="newsletter-featured" aria-labelledby="newsletter-latest-title">
              <p class="newsletter-featured__label">Latest Issue</p>
              <h2 id="newsletter-latest-title" class="newsletter-featured__title">
                <RouterLink
                  :to="{
                    name: 'newsletter-issue',
                    params: { slug: visiblePosts[0].slug || visiblePosts[0].id }
                  }"
                >
                  {{ visiblePosts[0].title }}
                </RouterLink>
              </h2>
              <time
                v-if="visiblePosts[0].pubDate"
                class="newsletter-featured__date"
                :datetime="visiblePosts[0].pubDate.toISOString()"
              >
                {{ visiblePosts[0].pubDateFormatted }}
              </time>
              <p
                class="newsletter-featured__excerpt"
                v-html="visiblePosts[0].featuredExcerptHtml"
              ></p>
              <RouterLink
                :to="{
                  name: 'newsletter-issue',
                  params: { slug: visiblePosts[0].slug || visiblePosts[0].id }
                }"
                class="newsletter-featured__read"
              >
                Read the full issue →
              </RouterLink>
            </article>

            <hr v-if="visiblePosts.length > 1" class="newsletter-feed__divider" />

            <section v-if="visiblePosts.length > 1" class="newsletter-previous">
              <h2 class="newsletter-previous__heading">Previous Issues</h2>
              <div class="newsletter-feed">
                <article
                  v-for="post in visiblePosts.slice(1)"
                  :key="post.guid"
                  class="newsletter-issue-card"
                >
                  <time
                    v-if="post.pubDate"
                    class="newsletter-issue-card__date"
                    :datetime="post.pubDate.toISOString()"
                  >
                    {{ post.pubDateFormatted }}
                  </time>
                  <h3 class="newsletter-issue-card__title">
                    <RouterLink
                      :to="{ name: 'newsletter-issue', params: { slug: post.slug || post.id } }"
                    >
                      {{ post.title }}
                    </RouterLink>
                  </h3>
                  <p class="newsletter-issue-card__excerpt" v-html="post.excerptHtml"></p>
                </article>
              </div>
            </section>
          </template>

          <div v-else-if="visiblePosts.length" class="newsletter-feed">
            <article v-for="post in visiblePosts" :key="post.guid" class="newsletter-issue-card">
              <time
                v-if="post.pubDate"
                class="newsletter-issue-card__date"
                :datetime="post.pubDate.toISOString()"
              >
                {{ post.pubDateFormatted }}
              </time>
              <h2 class="newsletter-issue-card__title">
                <RouterLink
                  :to="{ name: 'newsletter-issue', params: { slug: post.slug || post.id } }"
                >
                  {{ post.title }}
                </RouterLink>
              </h2>
              <p class="newsletter-issue-card__excerpt" v-html="post.excerptHtml"></p>
            </article>
          </div>
          <p v-else class="newsletter-empty">
            No issues are available on this archive page.
            <RouterLink to="/newsletter">Return to the latest issues</RouterLink>
          </p>

          <div v-if="hasMore" class="newsletter-archive">
            <button type="button" @click="loadMore">Older archives →</button>
          </div>
        </template>

        <div v-else class="newsletter-empty">
          No recent issues are available here. Browse the
          <a href="https://buttondown.email/indyhackers/archive/">full archive</a>
          or the <RouterLink to="/newsletter/archive">older archive</RouterLink>.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue'
import { useNewsletter } from '@/composables/useNewsletter'
import { hasAdminRole } from '@/utils/authSession'
import NewsletterSubscribe from './NewsletterSubscribe.vue'

const pocketbase = inject('pocketbase')
const isAdmin = ref(false)
let authUnsubscribe

const updateAdminStatus = async () => {
  const authRecord = pocketbase.authStore.record
  const userId = authRecord?.id
  isAdmin.value = pocketbase.authStore.isValid && hasAdminRole(authRecord)
  if (!pocketbase.authStore.isValid || isAdmin.value || !userId) return

  try {
    const user = await pocketbase.collection('users').getOne(userId, { expand: 'roles' })
    isAdmin.value =
      pocketbase.authStore.isValid &&
      pocketbase.authStore.record?.id === userId &&
      hasAdminRole(user)
  } catch (error) {
    console.error('Could not verify newsletter admin status:', error)
    isAdmin.value = false
  }
}

const { posts, visiblePosts, hasMore, loadMore, archivePage, loading, error, fetchNewsletter } =
  useNewsletter({ initialCount: 5, loadMoreCount: 10 })

onMounted(() => {
  authUnsubscribe = pocketbase.authStore.onChange(updateAdminStatus, true)
  fetchNewsletter()
})

onUnmounted(() => {
  authUnsubscribe?.()
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

/* Content section */
.newsletter-content {
  padding: 3rem 0 4rem;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.newsletter-dev-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px dashed color-mix(in srgb, var(--focus-ring) 45%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--focus-ring) 5%, transparent);
}

.newsletter-dev-bar__label {
  color: var(--focus-ring);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.newsletter-dev-bar__description {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.newsletter-dev-bar__link {
  flex-shrink: 0;
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

.newsletter-empty {
  color: var(--text-secondary);
}

@media (max-width: 30rem) {
  .newsletter-dev-bar {
    align-items: flex-start;
    flex-direction: column;
  }
}

.newsletter-feed {
  max-width: 48rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.newsletter-featured {
  max-width: 48rem;
  margin: 0 auto;
  padding: 1.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-deep) 28%, var(--border));
  border-left: 3px solid var(--accent-deep);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-1) 72%, transparent);
}

.newsletter-featured__label {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

.newsletter-featured__title {
  font-family: var(--font-mono);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: bold;
  line-height: 1.2;
  margin: 0 0 0.5rem;
}

.newsletter-featured__title a {
  color: var(--text-primary);
  text-decoration: none;
}

.newsletter-featured__title a:hover {
  color: var(--link-hover);
}

.newsletter-featured__date {
  display: block;
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.newsletter-featured__excerpt {
  color: var(--text-secondary);
  font-size: 1.125rem;
  line-height: 1.7;
  margin: 0;
}

.newsletter-featured__excerpt :deep(a),
.newsletter-issue-card__excerpt :deep(a) {
  color: var(--accent-deep);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.newsletter-featured__excerpt :deep(a:hover),
.newsletter-issue-card__excerpt :deep(a:hover) {
  color: var(--link-hover);
}

.newsletter-featured__read {
  display: inline-block;
  margin-top: 1rem;
  color: var(--accent-deep);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  text-decoration: none;
}

.newsletter-featured__read:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.newsletter-feed__divider {
  max-width: 48rem;
  width: 100%;
  margin: 3rem auto;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
}

.newsletter-previous {
  margin: 0 auto;
}

.newsletter-previous__heading {
  max-width: 48rem;
  margin: 0 auto 2rem;
  font-size: 1.25rem;
}

.newsletter-previous .newsletter-issue-card:not(:last-child) {
  padding-bottom: 2rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
}

.newsletter-issue-card__date {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.newsletter-issue-card__title {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: bold;
  line-height: 1.2;
  margin: 0 0 0.75rem;
}

.newsletter-issue-card__title a {
  color: var(--text-secondary);
  text-decoration: none;
}

.newsletter-issue-card__title a:hover {
  color: var(--link-hover);
}

.newsletter-issue-card__excerpt {
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
  margin: 0;
}

.newsletter-archive {
  max-width: 48rem;
  margin: 3rem auto 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  padding: 3rem 0 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.newsletter-archive button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent-deep);
  font: inherit;
  cursor: pointer;
}

.newsletter-archive button:hover {
  color: var(--text-primary);
  text-decoration: underline;
}
</style>
