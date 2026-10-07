<template>
  <div class="event-grid">
    <p v-if="!events.length" class="event-grid__empty">No upcoming events match your filters.</p>

    <template v-else>
      <div class="event-grid__tiles">
        <EventGridCard v-for="event in pageEvents" :key="event.id" :event="event" />
      </div>

      <nav v-if="totalPages > 1" class="event-grid__pager" aria-label="Event pages">
        <button
          class="event-grid__page-btn"
          type="button"
          :disabled="page === 1"
          @click="go(page - 1)"
        >
          ← Prev
        </button>

        <button
          v-for="n in totalPages"
          :key="n"
          class="event-grid__page-num"
          :class="{ 'event-grid__page-num--active': n === page }"
          type="button"
          :aria-current="n === page ? 'page' : undefined"
          @click="go(n)"
        >
          {{ n }}
        </button>

        <button
          class="event-grid__page-btn"
          type="button"
          :disabled="page === totalPages"
          @click="go(page + 1)"
        >
          Next →
        </button>
      </nav>

      <p class="event-grid__count">
        Showing {{ rangeStart }}–{{ rangeEnd }} of {{ events.length }} upcoming events
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import EventGridCard from './EventGridCard.vue'

// 3 columns x 4 rows at desktop width. The column count drops on narrower
// screens (see the media queries below) but the page size stays 12 so the
// pagination doesn't shift under the reader as the window resizes.
const PER_PAGE = 12

const props = defineProps({
  events: { type: Array, required: true }
})

const page = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(props.events.length / PER_PAGE)))

const pageEvents = computed(() => {
  const start = (page.value - 1) * PER_PAGE
  return props.events.slice(start, start + PER_PAGE)
})

const rangeStart = computed(() => (props.events.length ? (page.value - 1) * PER_PAGE + 1 : 0))
const rangeEnd = computed(() => Math.min(page.value * PER_PAGE, props.events.length))

// Filtering or searching shrinks the list; a page that no longer exists would
// otherwise render empty.
watch(
  () => props.events,
  () => {
    if (page.value > totalPages.value) page.value = totalPages.value
  }
)

function go(n) {
  if (n < 1 || n > totalPages.value) return
  page.value = n
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.event-grid__empty {
  padding: 2rem 0;
  color: var(--text-muted);
}

.event-grid__tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.event-grid__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 2rem;
}

.event-grid__page-btn,
.event-grid__page-num {
  border: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
}

.event-grid__page-num {
  min-width: 2.25rem;
}

.event-grid__page-btn:hover:not(:disabled),
.event-grid__page-num:hover {
  border-color: var(--accent-warm);
}

.event-grid__page-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.event-grid__page-num--active {
  background: var(--accent-brand);
  border-color: var(--accent-brand);
  color: var(--text-primary);
}

.event-grid__count {
  margin: 0.875rem 0 0;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

@media (max-width: 992px) {
  .event-grid__tiles {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .event-grid__tiles {
    grid-template-columns: 1fr;
  }
}
</style>
