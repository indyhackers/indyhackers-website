<template>
  <nav class="filters">
    <button
      class="filters__item"
      :class="{ 'filters__item--active': !selectedSlug }"
      @click="$emit('select', null)"
    >
      All events
    </button>

    <template v-for="group in grouped" :key="group.kind">
      <p v-if="group.topics.length" class="filters__heading">{{ group.label }}</p>
      <button
        v-for="topic in group.topics"
        :key="topic.id"
        class="filters__item"
        :class="{ 'filters__item--active': selectedSlug === topic.slug }"
        @click="$emit('select', topic.slug)"
      >
        <span class="filters__dot" :style="{ backgroundColor: topic.color || '#121212' }" />
        {{ topic.name }}
      </button>
    </template>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  topics: { type: Array, required: true },
  selectedSlug: { type: String, default: null }
})

defineEmits(['select'])

const grouped = computed(() => {
  const byKind = (kind) => props.topics.filter((t) => t.kind === kind)
  const known = ['language', 'framework', 'area']
  return [
    { kind: 'language', label: 'Languages', topics: byKind('language') },
    { kind: 'framework', label: 'Frameworks', topics: byKind('framework') },
    { kind: 'area', label: 'Areas', topics: byKind('area') },
    {
      kind: 'other',
      label: 'Other',
      topics: props.topics.filter((t) => !known.includes(t.kind))
    }
  ]
})
</script>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.filters__heading {
  margin: 1rem 0 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.filters__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.filters__item:hover {
  background: var(--surface-2);
}

.filters__item--active {
  background: color-mix(in srgb, var(--accent-brand) 30%, transparent);
  color: var(--text-primary);
  font-weight: 600;
}

.filters__dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
</style>
