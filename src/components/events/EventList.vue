<template>
  <div class="event-list">
    <p v-if="!groups.length" class="event-list__empty">
      No upcoming events match your filters.
    </p>

    <section v-for="group in groups" :key="group.key" class="event-list__day">
      <h3 class="event-list__day-label">{{ group.label }}</h3>
      <div class="event-list__events">
        <EventCard v-for="event in group.events" :key="event.id" :event="event" />
      </div>
    </section>
  </div>
</template>

<script setup>
import EventCard from './EventCard.vue'

defineProps({
  groups: { type: Array, required: true }
})
</script>

<style scoped>
.event-list__empty {
  padding: 2rem 0;
  color: var(--text-muted);
}

.event-list__day {
  margin-bottom: 1.75rem;
}

.event-list__day-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.event-list__events {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
