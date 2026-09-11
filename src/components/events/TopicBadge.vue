<template>
  <span class="topic-badge">
    <span class="topic-badge__dot" :style="{ backgroundColor: topic.color || '#121212' }" />
    {{ topic.name }}
  </span>
</template>

<script setup>
defineProps({
  topic: { type: Object, required: true }
})
</script>

<style scoped>
.topic-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  white-space: nowrap;
}

.topic-badge__dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
</style>
