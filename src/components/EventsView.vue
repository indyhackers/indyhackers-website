<template>
  <div class="events-view">
    <div class="events-header">
      <h2>Upcoming Events</h2>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="events-loading">
      <b-spinner variant="primary" label="Loading events..."></b-spinner>
      <p>Loading events...</p>
    </div>

    <!-- Error State -->
    <b-alert v-else-if="error" variant="danger" show class="my-4">
      <h5>Unable to load events</h5>
      <p>{{ error }}</p>
      <button class="ih-btn-outline" @click="fetchAll">Retry</button>
    </b-alert>

    <!-- No Events State -->
    <b-alert v-else-if="upcoming.length === 0" variant="info" show class="my-4">
      <h5>No upcoming events</h5>
      <p>Check back soon for new events, or recommend one below!</p>
    </b-alert>

    <!-- Events List -->
    <div v-else class="events-list">
      <EventListItem
        v-for="event in visibleEvents"
        :key="event.id"
        :event="event"
      />
      <div v-if="hasMore" class="load-more">
        <button class="ih-btn-outline" @click="loadMore">Load More</button>
      </div>
    </div>

    <!-- Actions -->
    <div class="events-actions">
      <a
        class="ih-btn-primary"
        target="_blank"
        rel="noopener noreferrer"
        href="https://docs.google.com/forms/d/e/1FAIpQLSdlfIqF42uU8iyoYyqKDFPEYRsNCOCFYpFJwMTvdVOkK3otSg/viewform?usp=sf_link"
      >
        Recommend an Event
      </a>
      <a
        class="ih-btn-outline"
        href="webcal://calendar.google.com/calendar/ical/ig7e0j6v8ub9q6kga256n77048%40group.calendar.google.com/public/basic.ics"
      >
        Subscribe to Calendar
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { BAlert, BSpinner } from 'bootstrap-vue-next'
import { useEvents } from '@/composables/useEvents'
import { jsonLd, stripHtml, SITE_NAME, SITE_URL } from '@/seo'
import EventListItem from '@/components/EventListItem.vue'

const props = defineProps({
  limit: {
    type: Number,
    default: 5
  }
})

const { events, loading, error, fetchAll } = useEvents()

// The synced `events` collection holds past and future events; this widget only
// shows upcoming ones (the old Google-Calendar path filtered with timeMin=now).
const upcoming = computed(() =>
  events.value.filter((e) => new Date(e.start) >= new Date())
)

// Local pagination (previously provided by useCalendar): show `limit` at first,
// reveal 5 more per click.
const visibleCount = ref(props.limit)
const visibleEvents = computed(() => upcoming.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < upcoming.value.length)
function loadMore() {
  visibleCount.value += 5
}

// Event structured data for the upcoming events shown here → eligible for
// Google's event rich results. Rebuilds reactively as events load.
const eventsSchema = computed(() =>
  visibleEvents.value
    .filter((e) => e.title && e.start)
    .map((e) => {
      const node = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: e.title,
        startDate: e.start,
        eventStatus: 'https://schema.org/EventScheduled',
        organizer: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
      }
      if (e.end) node.endDate = e.end
      if (e.description) node.description = stripHtml(e.description)
      if (e.link) node.url = e.link
      if (e.location) {
        node.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode'
        node.location = { '@type': 'Place', name: e.location, address: e.location }
      } else {
        node.eventAttendanceMode = 'https://schema.org/OnlineEventAttendanceMode'
        node.location = { '@type': 'VirtualLocation', url: e.link || SITE_URL }
      }
      return node
    })
)

useHead(
  computed(() => ({
    script: eventsSchema.value.length ? [jsonLd(eventsSchema.value, 'ld-events')] : []
  }))
)

onMounted(() => {
  fetchAll()
})
</script>

<style scoped>
.events-view {
  width: 100%;
}

.events-header {
  margin-bottom: 2rem;
}

.events-loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-muted);
}

.events-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 2rem;
}

.load-more {
  text-align: center;
  padding-top: 1.5rem;
}

.events-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}
</style>
