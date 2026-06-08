import { ref, computed } from 'vue'

export function useNewsletter({ initialCount = 3, loadMoreCount } = {}) {
  const batchSize = loadMoreCount ?? initialCount
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)

  const RSS_FEED_URL = 'https://buttondown.com/indyhackers/rss'

  const fetchNewsletter = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(RSS_FEED_URL)

      if (!response.ok) {
        throw new Error(`Failed to fetch newsletter: ${response.status} ${response.statusText}`)
      }

      const xmlText = await response.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror')
      if (parseError) {
        throw new Error('Failed to parse RSS feed')
      }

      // Extract items from RSS feed
      const items = xmlDoc.querySelectorAll('item')
      posts.value = Array.from(items).map((item) => {
        // Helper function to get text content safely
        const getTextContent = (tagName) => {
          const element = item.querySelector(tagName)
          return element ? element.textContent : ''
        }

        // Extract description/content HTML
        const description = getTextContent('description')

        // Extract and parse pubDate
        const pubDateStr = getTextContent('pubDate')
        const pubDate = pubDateStr ? new Date(pubDateStr) : null

        return {
          title: getTextContent('title'),
          link: getTextContent('link'),
          description: description,
          pubDate: pubDate,
          pubDateFormatted: pubDate
            ? pubDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : '',
          guid: getTextContent('guid')
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
