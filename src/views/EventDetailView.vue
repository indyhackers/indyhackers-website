<template>
  <section class="event-detail">
    <div class="ih-container">
      <div class="event-detail__back">
        <router-link to="/calendar" class="event-detail__back-link">← All events</router-link>
      </div>

      <p v-if="loading" class="event-detail__state">Loading…</p>
      <p v-else-if="error" class="event-detail__state event-detail__state--error">{{ error }}</p>

      <div v-else-if="event" class="event-detail__grid">
        <article class="event-detail__main">
          <div v-if="event.topics.length" class="event-detail__topics">
            <TopicBadge v-for="topic in event.topics" :key="topic.id" :topic="topic" />
          </div>

          <h1 class="event-detail__title">{{ event.title }}</h1>

          <dl class="event-detail__facts">
            <div class="event-detail__fact">
              <dt>When</dt>
              <dd>{{ whenLabel }}</dd>
            </div>
            <div v-if="event.location" class="event-detail__fact">
              <dt>Where</dt>
              <dd>{{ event.location }}</dd>
            </div>
          </dl>

          <div
            v-if="event.description"
            class="event-detail__desc"
            v-html="sanitized"
          ></div>

          <div v-if="event.url" class="event-detail__cal-link">
            <a :href="event.url" target="_blank" rel="noopener">View on Google Calendar</a>
          </div>
        </article>

        <aside class="event-detail__aside">
          <div class="event-detail__card">
            <template v-if="event.series">
              <h2 class="event-detail__card-title">Reminders</h2>
              <p class="event-detail__card-sub">
                This is a recurring event. Subscribe to get an email before each occurrence.
              </p>
              <ReminderToggle :series="event.series" />
            </template>
            <template v-else>
              <h2 class="event-detail__card-title">One-off event</h2>
              <p class="event-detail__card-sub">
                Reminders are available for recurring events. Add this one to your calendar from the
                Google Calendar link.
              </p>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DOMPurify from 'dompurify'
import TopicBadge from '@/components/events/TopicBadge.vue'
import ReminderToggle from '@/components/events/ReminderToggle.vue'

const route = useRoute()
const pocketbase = inject('pocketbase')

const event = ref(null)
const loading = ref(true)
const error = ref(null)

function normalize(record) {
  const expand = record.expand || {}
  const series = expand.event_series || null
  return {
    id: record.id,
    title: record.title || '(untitled event)',
    description: record.description || '',
    location: record.location || '',
    url: record.url || '',
    start: record.starts_at,
    end: record.ends_at || null,
    isAllDay: !!record.all_day,
    series: series ? { id: series.id, title: series.title } : null,
    topics: (expand.topics || []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      kind: t.kind
    }))
  }
}

const whenLabel = computed(() => {
  if (!event.value) return ''
  const start = new Date(event.value.start)
  const dayPart = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  if (event.value.isAllDay) return `All day · ${dayPart}`

  const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  let timePart = fmtTime(start)
  if (event.value.end) timePart += ` – ${fmtTime(new Date(event.value.end))}`
  return `${dayPart} · ${timePart}`
})

const sanitized = computed(() =>
  event.value
    ? DOMPurify.sanitize(event.value.description, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target']
      })
    : ''
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const record = await pocketbase
      .collection('events')
      .getOne(route.params.id, { expand: 'topics,event_series' })
    event.value = normalize(record)
  } catch (err) {
    console.error('Error loading event:', err)
    error.value = 'Event not found.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.event-detail {
  padding: 2.5rem 0 4rem;
}

.event-detail__back {
  margin-bottom: 1.5rem;
}

.event-detail__back-link {
  font-size: 0.875rem;
  color: var(--text-muted);
  text-decoration: none;
}

.event-detail__back-link:hover {
  color: var(--text-primary);
}

.event-detail__state {
  padding: 2rem 0;
  color: var(--text-muted);
}

.event-detail__state--error {
  color: var(--danger);
}

.event-detail__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

.event-detail__topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.event-detail__title {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.event-detail__facts {
  margin: 1.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-detail__fact {
  display: flex;
  gap: 0.75rem;
}

.event-detail__fact dt {
  font-weight: 600;
  color: var(--text-muted);
  width: 4rem;
  flex-shrink: 0;
}

.event-detail__fact dd {
  margin: 0;
  color: var(--text-primary);
}

.event-detail__desc {
  margin-top: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-line;
}

.event-detail__desc:deep(a) {
  color: var(--accent-deep);
  text-decoration: underline;
}

.event-detail__cal-link {
  margin-top: 1.5rem;
}

.event-detail__cal-link a {
  color: var(--accent-cool);
  font-weight: 600;
  font-size: 0.875rem;
}

.event-detail__card {
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
  padding: 1.25rem;
}

.event-detail__card-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.event-detail__card-sub {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.25rem 0 1rem;
}

@media (max-width: 768px) {
  .event-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
