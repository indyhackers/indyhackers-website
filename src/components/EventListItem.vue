<template>
  <article class="event-row">
    <div class="event-row__date">
      <span class="event-row__month">{{ monthAbbr }}</span>
      <span class="event-row__day">{{ dayNum }}</span>
    </div>

    <div class="event-row__body">
      <div class="event-row__headline">
        <h3 class="event-row__title">{{ event.title }}</h3>
        <span v-if="event.isAllDay" class="all-day-pill">All Day</span>
      </div>

      <div class="event-row__meta">
        <span class="event-row__time">
          <icon-carbon-time class="event-row__icon" />
          <template v-if="event.isAllDay">{{ formatDate(event.start) }}</template>
          <template v-else>
            {{ formatTime(event.start) }}
            <span v-if="event.end"> – {{ formatTime(event.end) }}</span>
          </template>
        </span>
        <span v-if="event.location" class="event-row__location">
          <icon-carbon-location class="event-row__icon" />
          {{ event.location }}
        </span>
      </div>

      <div
        v-if="event.description"
        class="event-row__desc"
        v-html="sanitizeHtml(event.description)"
      ></div>

      <RouterLink :to="`/event/${event.id}`" class="event-row__link">View details →</RouterLink>
    </div>
  </article>
</template>

<script setup>
import DOMPurify from 'dompurify'

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
})

const startDate = new Date(props.event.start)
const monthAbbr = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
const dayNum = startDate.getDate()

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const sanitizeHtml = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target']
  })
}
</script>

<style scoped>
.event-row {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.event-row:last-child {
  border-bottom: none;
}

/* Date block */
.event-row__date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.5rem;
  padding-top: 0.125rem;
}

.event-row__month {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  color: var(--accent-deep);
  line-height: 1;
}

.event-row__day {
  font-family: var(--font-mono);
  font-size: 1.75rem;
  font-weight: bold;
  line-height: 1.1;
  color: var(--text-primary);
}

/* Body */
.event-row__body {
  flex: 1;
  min-width: 0;
}

.event-row__headline {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
}

.event-row__title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
  color: var(--text-primary);
}

/* Meta */
.event-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.event-row__time,
.event-row__location {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.event-row__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.6;
}

/* Description */
.event-row__desc {
  margin-top: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  line-height: 1.6;
  max-height: 4.8em;
  overflow: hidden;
}

.event-row__desc:deep(a) {
  color: var(--text-primary);
  text-decoration: underline;
}

.event-row__desc:deep(a:hover) {
  color: var(--link-hover);
}

/* Calendar link */
.event-row__link {
  display: inline-block;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: bold;
  color: var(--accent-deep);
  text-decoration: none;
  letter-spacing: 0.02em;
}

.event-row__link:hover {
  color: var(--text-primary);
}

/* All day pill */
.all-day-pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--accent-warm-subtle);
  border: 1px solid var(--accent-warm);
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: bold;
  letter-spacing: 0.05em;
  color: var(--accent-deep);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .event-row__date {
    min-width: 2.75rem;
  }

  .event-row__day {
    font-size: 1.375rem;
  }

  .event-row__meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
