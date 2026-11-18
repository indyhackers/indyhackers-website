<template>
  <section class="calendar-hero">
    <div class="ih-container calendar-hero__inner">
      <div>
        <h1 class="calendar-hero__title">Indy Tech Events</h1>
        <p class="calendar-hero__sub">Meetups, workshops, and community events across Indiana.</p>
      </div>

      <RouterLink class="ih-btn-primary calendar-hero__cta" to="/events/submit">
        Submit an Event
      </RouterLink>
    </div>
  </section>

  <section class="calendar-page">
    <div class="ih-container calendar-page__layout">
      <div class="calendar-page__main">
        <div class="calendar-page__controls">
          <div class="calendar-page__controls-group">
            <div class="tabs">
              <button
                class="tabs__btn"
                :class="{ 'tabs__btn--active': view === 'list' }"
                @click="view = 'list'"
              >
                List
              </button>
              <button
                class="tabs__btn"
                :class="{ 'tabs__btn--active': view === 'calendar' }"
                @click="view = 'calendar'"
              >
                Calendar
              </button>
              <button
                class="tabs__btn"
                :class="{ 'tabs__btn--active': view === 'map' }"
                @click="view = 'map'"
              >
                Map
              </button>
            </div>

            <!-- Filters every view: the list, the map legend and the month grid
                 all read from the same filtered list. -->
            <label class="calendar-recurring">
              <input v-model="showRecurring" type="checkbox" class="calendar-recurring__box" />
              Show recurring events
            </label>
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
        <p v-else-if="error" class="calendar-page__state calendar-page__state--error">
          {{ error }}
        </p>

        <template v-else>
          <EventList v-if="view === 'list'" :groups="listGroups" />
          <CalendarGrid
            v-else-if="view === 'calendar'"
            :month="month"
            :weeks="grid.weeks"
            :events-by-date="grid.eventsByDate"
            @prev="changeMonth(-1)"
            @next="changeMonth(1)"
            @today="goToday"
          />
          <EventMap v-else :events="visibleEvents" />
        </template>

        <!-- Subscribing pulls the whole calendar into your own, so it belongs
             with the date-based views rather than the map. -->
        <p v-if="view !== 'map'" class="calendar-subscribe">
          <a
            class="calendar-subscribe__link"
            href="webcal://calendar.google.com/calendar/ical/ig7e0j6v8ub9q6kga256n77048%40group.calendar.google.com/public/basic.ics"
            >Subscribe to this calendar</a
          >
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CalendarGrid from './events/CalendarGrid.vue'
import EventList from './events/EventList.vue'
import EventMap from './events/EventMap.vue'
import {
  useEvents,
  filterEvents,
  upcomingEvents,
  collapseSeries,
  upcomingByDay,
  buildMonthGrid
} from '@/composables/useEvents'

const { events, loading, error, fetchAll } = useEvents()

// The month grid is the landing view on a wide screen: it answers "what's on
// when" at a glance. On a phone the grid's columns are too narrow for titles, so
// the agenda-style list lands instead (see onMounted). The map stays a click
// away for anyone asking "what's near me" — and the home page already carries a
// map of the recurring series.
const view = ref('calendar')
const query = ref('')
// On by default, so the calendar shows everything until someone narrows it.
const showRecurring = ref(true)
const month = ref(startOfMonth(new Date()))

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const filtered = computed(() => {
  const matched = filterEvents(events.value, { query: query.value })
  // Applied to the shared base so the map and the month grid can't disagree
  // about what is on show.
  return showRecurring.value ? matched : matched.filter((event) => !event.seriesId)
})

// One entry per recurring series rather than one per occurrence. The month grid
// below keeps every occurrence, since a calendar should mark each date the
// event actually happens.
const visibleEvents = computed(() => collapseSeries(upcomingEvents(filtered.value)))
// Every occurrence, like the month grid: the list is an agenda, so a weekly
// meetup belongs under each date it happens.
const listGroups = computed(() => upcomingByDay(filtered.value))
const grid = computed(() => buildMonthGrid(month.value, filtered.value))

function changeMonth(delta) {
  const next = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1)
  // The sync only covers the current month onward, so earlier months would
  // always render empty. CalendarGrid disables the arrow too; this is the
  // invariant behind it.
  if (next < startOfMonth(new Date())) return
  month.value = next
}

function goToday() {
  month.value = startOfMonth(new Date())
}

// Matches the breakpoint where CalendarGrid swaps titled chips for dots.
const NARROW_SCREEN = '(max-width: 639px)'

onMounted(() => {
  // Decided once, on load: the page is prerendered without a window, and
  // flipping views when a phone rotates would yank the reader out of what they
  // were looking at.
  if (window.matchMedia?.(NARROW_SCREEN).matches) view.value = 'list'
  fetchAll()
})
</script>

<style scoped>
.calendar-hero {
  padding: 3rem 0 1.5rem;
}

.calendar-hero__inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.calendar-hero__cta {
  flex-shrink: 0;
}

/* An h1 for document structure — search engines and screen readers both expect
   the page's one top-level heading here — but sized like the h2 it replaced, so
   the hero stays visually subordinate to the map below it. Matches the global
   h2 metrics rather than the much larger default h1. */
.calendar-hero__title {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.calendar-hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.calendar-page {
  padding: 0 0 4rem;
}

/* Single column since the topic filters went: the map wants the full width,
   and the actions read better as a footer row than a stub of a sidebar. */
.calendar-page__layout {
  display: block;
}

.calendar-subscribe {
  margin: 1rem 0 0;
  text-align: right;
}

.calendar-subscribe__link {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.calendar-subscribe__link:hover {
  color: var(--text-primary);
}

.calendar-page__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.calendar-page__controls-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.calendar-recurring {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.calendar-recurring__box {
  width: 0.9375rem;
  height: 0.9375rem;
  accent-color: var(--accent-brand);
  cursor: pointer;
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
  .calendar-subscribe {
    text-align: left;
  }
}
</style>
