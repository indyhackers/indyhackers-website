function decodeHtml(html) {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}

import { ref, computed, inject } from 'vue'

export function useNewsletter({ initialCount = 3, loadMoreCount } = {}) {
  const pocketbase = inject('pocketbase')
  const batchSize = loadMoreCount ?? initialCount
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchNewsletters = async (page = 1, perPage = 100) => {
    if (!pocketbase) {
      throw new Error('PocketBase client not injected')
    }
    const result = await pocketbase.collection('newsletters').getList(page, perPage, {
      sort: '-published_at'
    })
    return result.items
  }

  const fetchNewsletter = async () => {
    loading.value = true
    error.value = null

    try {
      const newsletters = await fetchNewsletters()
      posts.value = newsletters.map((newsletter) => {
        const pubDate = newsletter.published_at ? new Date(newsletter.published_at) : null

        return {
          ...newsletter,
          pubDate,
          pubDateFormatted: pubDate
            ? pubDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : '',
          guid: newsletter.slug || newsletter.id,
          description: typeof document !== 'undefined'
            ? decodeHtml(newsletter.excerpt || newsletter.description || '')
            : (newsletter.excerpt || newsletter.description || '')
        }
      })
    } catch (err) {
      console.error('Error fetching newsletter:', err)
      error.value = err.message || 'Failed to fetch newsletter'
    } finally {
      loading.value = false
    }
  }

  const visibleCount = ref(initialCount)
  const visiblePosts = computed(() => posts.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < posts.value.length)

  function loadMore() {
    visibleCount.value += batchSize
  }

  return {
    posts,
    visiblePosts,
    hasMore,
    loadMore,
    loading,
    error,
    fetchNewsletter
  }
}
