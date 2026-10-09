import { ref, computed, inject, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  buildNewsletterExcerpt,
  generateNewsletterExcerpt,
  generateNewsletterExcerptHtml
} from '@/utils/newsletterExcerpt'

export function useNewsletter({ initialCount = 3, loadMoreCount } = {}) {
  const pocketbase = inject('pocketbase')
  const route = useRoute()
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
        const featuredExcerptSource =
          newsletter.excerpt ||
          newsletter.description ||
          (newsletter.link ? buildNewsletterExcerpt(newsletter.content || '') : newsletter.content)
        const excerptSource = newsletter.link
          ? newsletter.content
          : newsletter.excerpt || newsletter.description || newsletter.content
        const excerpt = generateNewsletterExcerpt(excerptSource || '')

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
          description: excerpt,
          excerptHtml: generateNewsletterExcerptHtml(excerptSource || ''),
          featuredExcerptHtml: generateNewsletterExcerptHtml(
            featuredExcerptSource || '',
            Number.POSITIVE_INFINITY
          )
        }
      })
    } catch (err) {
      console.error('Error fetching newsletter:', err)
      error.value = err.message || 'Failed to fetch newsletter'
    } finally {
      loading.value = false
    }
  }

  const additionalCount = ref(0)
  const archivePage = computed(() => {
    const page = Number.parseInt(String(route.params.page || '1'), 10)
    return Number.isInteger(page) && page > 0 ? page : 1
  })
  const initialVisibleCount = computed(() => (archivePage.value === 1 ? initialCount : batchSize))
  const archiveOffset = computed(() =>
    archivePage.value === 1 ? 0 : initialCount + (archivePage.value - 2) * batchSize
  )
  watch(archivePage, () => {
    additionalCount.value = 0
  })
  const visiblePosts = computed(() =>
    posts.value.slice(
      archiveOffset.value,
      archiveOffset.value + initialVisibleCount.value + additionalCount.value
    )
  )
  const hasMore = computed(
    () => archiveOffset.value + visiblePosts.value.length < posts.value.length
  )
  const nextPage = computed(() => archivePage.value + 1)

  function loadMore() {
    additionalCount.value += batchSize
  }

  return {
    posts,
    visiblePosts,
    hasMore,
    loadMore,
    archivePage,
    nextPage,
    loading,
    error,
    fetchNewsletter
  }
}
