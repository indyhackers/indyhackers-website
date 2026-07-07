<template>
  <b-container class="events-markdown-page py-4">
    <b-row>
      <b-col>
        <div class="text-center mb-4">
          <h2>Events Markdown (Next 6 Weeks)</h2>
          <p class="text-muted">Copy and paste the markdown below</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <b-spinner variant="primary" label="Loading events..."></b-spinner>
          <p class="mt-3 text-muted">Loading events...</p>
        </div>

        <!-- Error State -->
        <b-alert v-else-if="error" variant="danger" show class="my-4">
          <h5>Unable to load events</h5>
          <p>{{ error }}</p>
          <b-button variant="danger" @click="fetchEvents">Retry</b-button>
        </b-alert>

        <!-- Markdown Output -->
        <div v-else>
          <div class="d-flex justify-content-end mb-3">
            <b-button variant="primary" @click="copyToClipboard" size="sm">
              {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
            </b-button>
          </div>

          <div class="markdown-output">
            <pre>{{ markdownText }}</pre>
          </div>

          <div class="mt-3 text-muted text-center">
            <small>{{ filteredEvents.length }} events in the next 6 weeks</small>
          </div>
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { BContainer, BRow, BCol, BButton, BAlert, BSpinner } from 'bootstrap-vue-next'
import { useCalendar } from '../composables/useCalendar'

const { events, loading, error, fetchEvents } = useCalendar()
const copied = ref(false)

// Calculate the date 6 weeks from now
const sixWeeksFromNow = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 42) // 6 weeks = 42 days
  return date
})

// Filter events to only those within the next 6 weeks
const filteredEvents = computed(() => {
  // Start of today (not the current instant) so events earlier today still show.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endDate = sixWeeksFromNow.value

  return events.value.filter(event => {
    const eventDate = new Date(event.start)
    return eventDate >= startOfToday && eventDate <= endDate
  })
})

// Format a single event as markdown
const formatEventAsMarkdown = (event) => {
  const eventDate = new Date(event.start)

  // Format the date
  const dateStr = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })

  // Format the time
  let timeStr = ''
  if (!event.isAllDay) {
    timeStr = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Build the markdown string
  const title = event.title
  const link = event.link || '#'

  if (event.isAllDay) {
    return `[${title}](${link}) - ${dateStr}\n`
  } else {
    return `[${title}](${link}) - ${dateStr} at ${timeStr}\n`
  }
}

// Generate the complete markdown text
const markdownText = computed(() => {
  if (filteredEvents.value.length === 0) {
    return 'No events scheduled in the next 6 weeks.'
  }

  return filteredEvents.value
    .map(event => formatEventAsMarkdown(event))
    .join('\n')
})

// Copy to clipboard function
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(markdownText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

onMounted(() => {
  fetchEvents()
})
</script>

<style scoped>
.events-markdown-page {
  max-width: 900px;
}

.markdown-output {
  background-color: var(--surface-2);
  border: 1px solid color-mix(in srgb, var(--border) 30%, var(--surface-1));
  border-radius: 0.375rem;
  padding: 1.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.markdown-output pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-primary);
}
</style>
