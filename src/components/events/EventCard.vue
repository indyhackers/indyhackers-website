<template>
  <router-link :to="`/event/${event.id}`" class="event-card">
    <div class="event-card__meta">
      <span class="event-card__time">{{ timeLabel }}</span>
      <span v-if="event.seriesId" class="event-card__recurring">Recurring</span>
    </div>

    <h4 class="event-card__title">{{ event.title }}</h4>

    <p v-if="event.location" class="event-card__location">📍 {{ event.location }}</p>

    <div v-if="event.topics.length" class="event-card__topics">
      <TopicBadge v-for="topic in event.topics" :key="topic.id" :topic="topic" />
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import TopicBadge from './TopicBadge.vue'

const props = defineProps({
  event: { type: Object, required: true }
})

const timeLabel = computed(() => {
  if (props.event.isAllDay) return 'All day'
  return new Date(props.event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
})
</script>

<style scoped>
.event-card {
  display: block;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  text-decoration: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.event-card:hover {
  border-color: var(--accent-warm);
  box-shadow: var(--shadow-sm);
}

.event-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.event-card__time {
  font-weight: 600;
  color: var(--text-primary);
}

.event-card__recurring {
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.5rem;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--accent-brand) 30%, transparent);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.event-card__title {
  margin: 0.25rem 0 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-primary);
}

.event-card__location {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.event-card__topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
</style>
