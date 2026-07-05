<template>
  <section class="calendar-hero">
    <div class="ih-container">
      <h1>Event Calendar</h1>
      <p class="calendar-hero__sub">Meetups, workshops, and community events across Indiana tech.</p>
    </div>
  </section>

  <section class="calendar-page">
    <div class="ih-container calendar-page__layout">
      <!-- Sidebar -->
      <aside class="calendar-page__sidebar">
        <TopicFilters :topics="topics" :selected-slug="selectedSlug" @select="selectTopic" />

        <div class="calendar-actions">
          <a
            class="ih-btn-primary"
            target="_blank"
            href="https://docs.google.com/forms/d/e/1FAIpQLSdlfIqF42uU8iyoYyqKDFPEYRsNCOCFYpFJwMTvdVOkK3otSg/viewform?usp=sf_link"
          >Recommend an Event</a>
          <a
            class="ih-btn-outline"
            href="webcal://calendar.google.com/calendar/ical/ig7e0j6v8ub9q6kga256n77048%40group.calendar.google.com/public/basic.ics"
          >Subscribe to Calendar</a>
        </div>
      </aside>

      <!-- Main -->
      <div class="calendar-page__main">
        <div class="calendar-page__controls">
          <div class="tabs">
            <button
              class="tabs__btn"
              :class="{ 'tabs__btn--active': view === 'list' }"
              @click="view = 'list'"
            >List</button>
            <button
              class="tabs__btn"
              :class="{ 'tabs__btn--active': view === 'calendar' }"
              @click="view = 'calendar'"
            >Calendar</button>
          </div>

          <input
            v-model="query"
            type="search"
            class="search"
            placeholder="Search events…"
            aria-label="Search events"
          />
        </div>

        <p v-if="loading" class="calendar-page__state">Loading events…</p>
        <p v-else-if="error" class="calendar-page__state calendar-page__state--error">{{ error }}</p>

        <template v-else>
          <CalendarGrid
            v-if="view === 'calendar'"
            :month="month"
            :weeks="grid.weeks"
            :events-by-date="grid.eventsByDate"
            @prev="changeMonth(-1)"
            @next="changeMonth(1)"
            @today="goToday"
          />
          <EventList v-else :groups="listGroups" />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TopicFilters from './events/TopicFilters.vue'
import CalendarGrid from './events/CalendarGrid.vue'
import EventList from './events/EventList.vue'
import {
  useEvents,
  filterEvents,
  upcomingByDay,
  buildMonthGrid
} from '@/composables/useEvents'

const { events, topics, loading, error, fetchAll } = useEvents()

const view = ref('list')
const selectedSlug = ref(null)
const query = ref('')
const month = ref(startOfMonth(new Date()))

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const filtered = computed(() =>
  filterEvents(events.value, { topicSlug: selectedSlug.value, query: query.value })
)

const listGroups = computed(() => upcomingByDay(filtered.value))
const grid = computed(() => buildMonthGrid(month.value, filtered.value))

function selectTopic(slug) {
  selectedSlug.value = slug
}

function changeMonth(delta) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1)
}

function goToday() {
  month.value = startOfMonth(new Date())
}

onMounted(fetchAll)
</script>

<style scoped>
.calendar-hero {
  padding: 3rem 0 1.5rem;
}

.calendar-hero h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1rem;
}

.calendar-hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.calendar-page {
  padding: 0 0 4rem;
}

.calendar-page__layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 2rem;
  align-items: start;
}

.calendar-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.calendar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.calendar-page__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.tabs {
  display: inline-flex;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-full);
  padding: 0.125rem;
  background: var(--surface-1);
}

.tabs__btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.375rem 1rem;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
}

.tabs__btn--active {
  background: var(--accent-brand);
  color: var(--text-primary);
}

.search {
  flex: 1;
  min-width: 12rem;
  max-width: 20rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  background: var(--surface-1);
}

.search:focus {
  outline: none;
  border-color: var(--accent-warm);
}

.calendar-page__state {
  padding: 2rem 0;
  color: var(--text-muted);
}

.calendar-page__state--error {
  color: var(--danger);
}

@media (max-width: 768px) {
  .calendar-page__layout {
    grid-template-columns: 1fr;
  }

  .calendar-page__sidebar {
    order: 2;
  }
}
</style>
