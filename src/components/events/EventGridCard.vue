<template>
  <router-link :to="`/event/${event.id}`" class="event-tile">
    <div class="event-tile__cover">
      <img
        v-if="coverSrc"
        class="event-tile__img"
        :src="coverSrc"
        :alt="`Cover image for ${event.title}`"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="event-tile__fallback" :style="fallbackStyle" aria-hidden="true">
        <span class="event-tile__initials">{{ initials }}</span>
      </div>
      <span v-if="scheduleLabel" class="event-tile__badge">{{ scheduleLabel }}</span>
    </div>

    <div class="event-tile__body">
      <p class="event-tile__when">
        {{ whenLabel }}
        <span v-if="scheduleLabel" class="event-tile__next">· Next</span>
      </p>
      <h3 class="event-tile__title">{{ event.title }}</h3>
      <p v-if="event.location" class="event-tile__location">{{ event.location }}</p>
      <p v-if="summary" class="event-tile__summary">{{ summary }}</p>

      <div v-if="event.topics.length" class="event-tile__topics">
        <TopicBadge v-for="topic in event.topics.slice(0, 3)" :key="topic.id" :topic="topic" />
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import TopicBadge from './TopicBadge.vue'
import { stripHtml } from '@/seo'
import { eventScheduleLabel } from '@/recurrence'

const props = defineProps({
  event: { type: Object, required: true }
})

// A broken/expired file URL would otherwise leave a torn-image box where the
// cover should be; fall back to the generated one instead.
const imageFailed = ref(false)
watch(
  () => props.event.id,
  () => {
    imageFailed.value = false
  }
)

const coverSrc = computed(() => {
  if (imageFailed.value) return ''
  return props.event.imageThumb || props.event.image || ''
})

// Date + time on one line, the way meetup.com leads its cards:
// "THU, JUN 18 · 5:30 PM".
const whenLabel = computed(() => {
  const start = new Date(props.event.start)
  if (Number.isNaN(start.getTime())) return ''
  const date = start
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase()
  if (props.event.isAllDay) return `${date} · ALL DAY`
  const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time.toUpperCase()}`
})

// A recurring series shows one tile for the whole series, so the cadence goes
// on the cover and the date below it is flagged as the next occurrence.
const scheduleLabel = computed(() => eventScheduleLabel(props.event))

// Descriptions are TipTap HTML; the card wants two clamped lines of plain text.
const summary = computed(() => stripHtml(props.event.description, 180))

// Darken a #rgb/#rrggbb toward black by `amount` (0-1), or null if the topic's
// color isn't a hex we understand.
function darken(hex, amount) {
  const raw = String(hex).replace('#', '')
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  const channels = [0, 2, 4].map((i) => {
    const value = Math.round(parseInt(full.slice(i, i + 2), 16) * (1 - amount))
    return value.toString(16).padStart(2, '0')
  })
  return `#${channels.join('')}`
}

// Fallback cover: a gradient keyed off the event's first topic color (so the
// wall of cards reads as varied rather than uniform), or a hue hashed from the
// title when the event has no topics.
//
// Only the two stops travel inline, as custom properties; the gradient itself
// lives in the stylesheet below. Passing the whole `linear-gradient(...)` as an
// inline style would work in a browser but jsdom's CSS parser drops it, which
// would leave the fallback untestable.
const fallbackStyle = computed(() => {
  const base = props.event.topics[0]?.color
  const dark = base ? darken(base, 0.55) : null
  if (dark) {
    return { '--cover-from': base, '--cover-to': dark }
  }
  let hash = 0
  for (const char of props.event.title) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360
  }
  return {
    '--cover-from': `hsl(${hash}, 55%, 48%)`,
    '--cover-to': `hsl(${(hash + 40) % 360}, 55%, 30%)`
  }
})

// Up to two initials for the generated cover. Leading punctuation is dropped
// first, so "Indy .NET User Group" reads "IN" rather than "I.".
const initials = computed(() =>
  props.event.title
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+/i, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
)
</script>

<style scoped>
.event-tile {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
  text-decoration: none;
  height: 100%;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}

.event-tile:hover {
  border-color: var(--accent-warm);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.event-tile__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-2);
}

.event-tile__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.event-tile__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Stops come from the inline --cover-from/--cover-to set in script. */
  background: linear-gradient(135deg, var(--cover-from) 0%, var(--cover-to) 100%);
}

.event-tile__initials {
  font-family: var(--font-mono);
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.92);
}

.event-tile__badge {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface-1) 88%, transparent);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.event-tile__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.875rem 1rem 1rem;
}

.event-tile__next {
  color: var(--text-muted);
}

.event-tile__when {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent-deep);
}

.event-tile__title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-tile__location {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-tile__summary {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-tile__topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: auto;
  padding-top: 0.625rem;
}
</style>
