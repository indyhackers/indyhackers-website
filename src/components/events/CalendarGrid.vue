<template>
  <div class="cal">
    <!-- Month navigation -->
    <div class="cal__nav">
      <button class="cal__arrow" aria-label="Previous month" @click="$emit('prev')">←</button>
      <div class="cal__title-wrap">
        <h2 class="cal__title">{{ monthLabel }}</h2>
        <button v-if="!isCurrentMonth" class="cal__today" @click="$emit('today')">Today</button>
      </div>
      <button class="cal__arrow" aria-label="Next month" @click="$emit('next')">→</button>
    </div>

    <!-- Weekday header -->
    <div class="cal__weekdays">
      <div v-for="wd in weekdays" :key="wd" class="cal__weekday">{{ wd }}</div>
    </div>

    <!-- Day grid -->
    <div class="cal__grid">
      <template v-for="(week, wi) in weeks" :key="wi">
        <div
          v-for="date in week"
          :key="date.toISOString()"
          class="cal__cell"
          :class="{ 'cal__cell--out': !inMonth(date) }"
        >
          <div class="cal__daynum-wrap">
            <span
              class="cal__daynum"
              :class="{ 'cal__daynum--today': isToday(date), 'cal__daynum--out': !inMonth(date) }"
            >
              {{ date.getDate() }}
            </span>
          </div>

          <!-- Mobile: colored dots -->
          <div class="cal__dots">
            <span
              v-for="event in dayEvents(date).slice(0, 5)"
              :key="event.id"
              class="cal__dot"
              :style="{ backgroundColor: dotColor(event) }"
            />
          </div>

          <!-- Desktop: titled chips -->
          <div class="cal__chips">
            <router-link
              v-for="event in dayEvents(date).slice(0, 3)"
              :key="event.id"
              :to="`/event/${event.id}`"
              class="cal__chip"
              :title="event.title"
            >
              <span class="cal__chip-dot" :style="{ backgroundColor: dotColor(event) }" />
              <span class="cal__chip-text">
                <span class="cal__chip-time">{{ chipTime(event) }}</span>
                {{ event.title }}
              </span>
            </router-link>
            <span v-if="dayEvents(date).length > 3" class="cal__more">
              +{{ dayEvents(date).length - 3 }} more
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { dateKey } from '@/composables/useEvents'

const props = defineProps({
  month: { type: Date, required: true },
  weeks: { type: Array, required: true },
  eventsByDate: { type: Object, required: true }
})

defineEmits(['prev', 'next', 'today'])

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const monthLabel = computed(() =>
  props.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

const isCurrentMonth = computed(() => {
  const now = new Date()
  return now.getFullYear() === props.month.getFullYear() && now.getMonth() === props.month.getMonth()
})

function inMonth(date) {
  return date.getMonth() === props.month.getMonth() && date.getFullYear() === props.month.getFullYear()
}

function isToday(date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function dayEvents(date) {
  return props.eventsByDate[dateKey(date)] || []
}

function dotColor(event) {
  return (event.topics[0] && event.topics[0].color) || '#121212'
}

function chipTime(event) {
  if (event.isAllDay) return ''
  const d = new Date(event.start)
  const minutes = d.getMinutes()
  return d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: minutes ? '2-digit' : undefined
    })
    .replace(' ', '')
    .toLowerCase()
}
</script>

<style scoped>
.cal {
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
  overflow: hidden;
}

.cal__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.cal__arrow {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 1rem;
}

.cal__arrow:hover {
  background: var(--surface-2);
}

.cal__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cal__title {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-primary);
}

.cal__today {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-cool);
}

.cal__today:hover {
  text-decoration: underline;
}

.cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--surface-2);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.cal__weekday {
  padding: 0.5rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.cal__cell {
  /* min-width: 0 keeps long event titles from blowing out the 1fr column,
     so empty days stay the same width as days with events. */
  min-width: 0;
  min-height: 7rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
  padding: 0.375rem;
}

.cal__cell--out {
  background: color-mix(in srgb, var(--accent-deep-subtle) 50%, transparent);
}

.cal__daynum-wrap {
  display: flex;
  justify-content: flex-end;
}

.cal__daynum {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.75rem;
  border-radius: var(--radius-full);
  color: var(--text-primary);
}

.cal__daynum--today {
  background: var(--text-primary);
  color: var(--accent-brand);
  font-weight: 700;
}

.cal__daynum--out {
  color: color-mix(in srgb, var(--text-primary) 30%, transparent);
}

.cal__dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem;
  margin-top: 0.25rem;
}

.cal__dot {
  display: inline-block;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
}

.cal__chips {
  display: none;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
  min-width: 0;
}

.cal__chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  padding: 0.05rem 0.25rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  text-decoration: none;
  transition: background 0.15s;
}

.cal__chip:hover {
  background: color-mix(in srgb, var(--accent-brand) 40%, transparent);
}

.cal__chip-dot {
  display: inline-block;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.cal__chip-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.cal__chip-time {
  color: var(--text-muted);
}

.cal__more {
  font-size: 0.625rem;
  color: var(--text-muted);
  padding-left: 0.25rem;
}

@media (min-width: 640px) {
  .cal__dots {
    display: none;
  }

  .cal__chips {
    display: flex;
  }
}

@media (max-width: 639px) {
  .cal__cell {
    min-height: 4.5rem;
  }
}
</style>
