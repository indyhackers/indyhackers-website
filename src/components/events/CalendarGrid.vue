<template>
  <div ref="wrapEl" class="cal-wrap">
    <div class="cal">
      <!-- Month navigation -->
      <div class="cal__nav">
        <!-- The sync only covers the current month onward, so there is nothing
             behind it to navigate to. -->
        <button
          class="cal__arrow"
          aria-label="Previous month"
          :disabled="isCurrentMonth"
          @click="$emit('prev')"
        >
          ←
        </button>
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
      <div class="cal__grid" :style="gridStyle">
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
                v-for="event in dayEvents(date)"
                :key="event.id"
                class="cal__dot"
                :style="{ backgroundColor: dotColor(event) }"
              />
            </div>

            <!-- Desktop: titled chips. Every event is listed — the cells are
                 sized to the busiest day so nothing needs hiding behind a
                 "+N more" a reader has no way to open. -->
            <div class="cal__chips">
              <router-link
                v-for="event in dayEvents(date)"
                :key="event.id"
                :to="`/event/${event.id}`"
                class="cal__chip"
                @mouseenter="showInfo(event, $event)"
                @mouseleave="hideInfo"
                @focus="showInfo(event, $event)"
                @blur="hideInfo"
              >
                <span class="cal__chip-dot" :style="{ backgroundColor: dotColor(event) }" />
                <span class="cal__chip-text">
                  <span class="cal__chip-time">{{ chipTime(event) }}</span>
                  {{ event.title }}
                </span>
              </router-link>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Hover/focus detail for a chip. Purely informational: the chip itself is
         the link, so there is nothing here to reach with the pointer — which a
         hover card that vanishes on mouseleave could never offer reliably. -->
    <div
      v-if="info"
      class="cal__info"
      :class="{ 'cal__info--below': info.below }"
      :style="info.style"
      role="tooltip"
    >
      <p class="cal__info-when">{{ info.when }}</p>
      <p class="cal__info-title">{{ info.event.title }}</p>
      <p v-if="info.event.location" class="cal__info-location">{{ info.event.location }}</p>
      <p v-if="info.cadence" class="cal__info-cadence">{{ info.cadence }}</p>
      <p class="cal__info-hint">Click for details</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { dateKey } from '@/composables/useEvents'
import { eventScheduleLabel } from '@/recurrence'

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
  return (
    now.getFullYear() === props.month.getFullYear() && now.getMonth() === props.month.getMonth()
  )
})

function inMonth(date) {
  return (
    date.getMonth() === props.month.getMonth() && date.getFullYear() === props.month.getFullYear()
  )
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

// The most events on any one day in the visible grid. Every cell is sized to
// this, so the calendar has a steady rhythm and the busiest day still shows all
// of its events.
const maxDayEvents = computed(() => {
  let max = 0
  props.weeks.forEach((week) => {
    week.forEach((date) => {
      const count = dayEvents(date).length
      if (count > max) max = count
    })
  })
  return max
})

// Handed to CSS rather than computed as a height here, so the stylesheet keeps
// ownership of the chip metrics.
const gridStyle = computed(() => ({ '--cal-max-events': String(maxDayEvents.value) }))

// --- Hover detail ------------------------------------------------------------

// Kept in sync with .cal__info in the stylesheet: the clamping below needs to
// know how wide the card is before it renders.
const INFO_WIDTH = 240
const INFO_GAP = 8
// Roughly the card's height. Only used to decide whether it fits above the
// chip; being a little out just flips it to below, which is also fine.
const INFO_HEIGHT = 130

const wrapEl = ref(null)
const info = ref(null)

function showInfo(event, domEvent) {
  const target = domEvent.currentTarget
  const wrap = wrapEl.value
  if (!target || !wrap) return

  const chip = target.getBoundingClientRect()
  const bounds = wrap.getBoundingClientRect()

  // Centred on the chip, then clamped so a card on the Sunday or Saturday
  // column doesn't hang off the side of the calendar.
  const half = INFO_WIDTH / 2
  const centre = chip.left - bounds.left + chip.width / 2
  const left = Math.min(Math.max(centre, half), Math.max(half, bounds.width - half))

  // Above the chip by default; below when the top rows have no room for it.
  const below = chip.top - bounds.top < INFO_HEIGHT
  const top = below ? chip.bottom - bounds.top + INFO_GAP : chip.top - bounds.top - INFO_GAP

  info.value = {
    event,
    below,
    when: infoWhen(event),
    // A month cell already shows the specific occurrence, so the cadence is
    // extra context rather than a replacement for the date.
    cadence: eventScheduleLabel(event),
    style: { left: `${left}px`, top: `${top}px`, width: `${INFO_WIDTH}px` }
  }
}

function hideInfo() {
  info.value = null
}

// "Wed, Oct 7 · 6:00 PM – 8:00 PM"
function infoWhen(event) {
  const start = new Date(event.start)
  if (Number.isNaN(start.getTime())) return ''
  const date = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  if (event.isAllDay) return `${date} · All day`

  const time = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  let range = time(start)
  if (event.end) {
    const end = new Date(event.end)
    if (!Number.isNaN(end.getTime())) range += ` – ${time(end)}`
  }
  return `${date} · ${range}`
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
.cal-wrap {
  position: relative;
}

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

.cal__arrow:disabled {
  opacity: 0.35;
  cursor: default;
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

/* Sits outside .cal, whose overflow:hidden would otherwise clip it. Positioned
   in script; `top` is the chip's edge and the translate lifts it clear. */
.cal__info {
  position: absolute;
  z-index: 5;
  transform: translate(-50%, -100%);
  padding: 0.625rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  box-shadow: var(--shadow-md);
  pointer-events: none;
}

.cal__info--below {
  transform: translate(-50%, 0);
}

.cal__info-when {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-deep);
}

.cal__info-title {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

.cal__info-location {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--text-muted);
}

.cal__info-cadence {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.cal__info-hint {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  color: var(--text-muted);
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

@media (min-width: 640px) {
  .cal__dots {
    display: none;
  }

  .cal__chips {
    display: flex;
  }

  /* Room for the day number plus one chip per event on the busiest day, never
     shorter than the empty-cell height. --cal-max-events is set in script; the
     fallback keeps the cell sane if it is ever missing. */
  /* Sits outside .cal, whose overflow:hidden would otherwise clip it. Positioned
   in script; `top` is the chip's edge and the translate lifts it clear. */
  .cal__info {
    position: absolute;
    z-index: 5;
    transform: translate(-50%, -100%);
    padding: 0.625rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
    border-radius: var(--radius-md);
    background: var(--surface-1);
    box-shadow: var(--shadow-md);
    pointer-events: none;
  }

  .cal__info--below {
    transform: translate(-50%, 0);
  }

  .cal__info-when {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--accent-deep);
  }

  .cal__info-title {
    margin: 0.25rem 0 0;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .cal__info-location {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: var(--text-muted);
  }

  .cal__info-cadence {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .cal__info-hint {
    margin: 0.5rem 0 0;
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .cal__cell {
    min-height: max(7rem, calc(2.4rem + var(--cal-max-events, 3) * 1.45rem));
  }
}

@media (max-width: 639px) {
  /* Sits outside .cal, whose overflow:hidden would otherwise clip it. Positioned
   in script; `top` is the chip's edge and the translate lifts it clear. */
  .cal__info {
    position: absolute;
    z-index: 5;
    transform: translate(-50%, -100%);
    padding: 0.625rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
    border-radius: var(--radius-md);
    background: var(--surface-1);
    box-shadow: var(--shadow-md);
    pointer-events: none;
  }

  .cal__info--below {
    transform: translate(-50%, 0);
  }

  .cal__info-when {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--accent-deep);
  }

  .cal__info-title {
    margin: 0.25rem 0 0;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .cal__info-location {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.35;
    color: var(--text-muted);
  }

  .cal__info-cadence {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .cal__info-hint {
    margin: 0.5rem 0 0;
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .cal__cell {
    min-height: 4.5rem;
  }
}
</style>
