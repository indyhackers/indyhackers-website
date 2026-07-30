<template>
  <div class="alerts-signup">
    <h3 class="alerts-signup__heading">Get Event Alerts</h3>
    <p class="alerts-signup__hint">
      Pick your topics and we'll email you a weekly digest of matching events.
    </p>

    <div v-if="subscribed" class="alerts-signup__success">
      {{ successMsg }}
    </div>

    <form v-else class="alerts-signup__form" @submit.prevent="subscribe">
      <div class="alerts-signup__channels" role="group" aria-label="Notification channel">
        <button type="button" class="channel-btn channel-btn--active" aria-pressed="true">
          Email
        </button>
        <button type="button" class="channel-btn" disabled title="Coming soon">
          Text <span class="channel-badge">Soon</span>
        </button>
        <button type="button" class="channel-btn" disabled title="Coming soon">
          Slack <span class="channel-badge">Soon</span>
        </button>
      </div>

      <fieldset class="alerts-signup__topics">
        <legend class="alerts-signup__label">Topics</legend>
        <template v-for="group in groupedTopics" :key="group.kind">
          <p v-if="group.topics.length" class="alerts-signup__group-label">{{ group.label }}</p>
          <label v-for="topic in group.topics" :key="topic.id" class="alerts-signup__checkbox">
            <input v-model="selectedTopics" type="checkbox" :value="topic.id" />
            <span
              class="alerts-signup__dot"
              :style="{ backgroundColor: topic.color || '#121212' }"
            />
            {{ topic.name }}
          </label>
        </template>
      </fieldset>

      <input
        v-model="email"
        type="email"
        required
        placeholder="you@example.com"
        class="alerts-signup__input"
        aria-label="Email address"
        :disabled="submitting"
      />

      <!-- Honeypot: hidden from humans, bots tend to fill it. Server drops it. -->
      <input
        v-model="website"
        type="text"
        name="website"
        class="alerts-signup__hp"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
      />

      <button type="submit" class="ih-btn-primary alerts-signup__btn" :disabled="submitting">
        {{ submitting ? 'Subscribing…' : 'Get alerts' }}
      </button>

      <p v-if="error" class="alerts-signup__error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  topics: { type: Array, required: true }
})

const email = ref('')
const website = ref('') // honeypot — must stay empty
const selectedTopics = ref([])
const submitting = ref(false)
const subscribed = ref(false)
const successMsg = ref('')
const error = ref(null)

const groupedTopics = computed(() => {
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

async function subscribe() {
  if (!selectedTopics.value.length) {
    error.value = 'Pick at least one topic.'
    return
  }

  submitting.value = true
  error.value = null

  try {
    const response = await fetch('/api/event-alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        topics: selectedTopics.value,
        website: website.value
      })
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      error.value = data.message || 'Something went wrong. Try again?'
      return
    }

    subscribed.value = true
    successMsg.value = data.msg || 'Check your email to confirm.'
  } catch {
    error.value = 'Could not connect. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.alerts-signup {
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
}

.alerts-signup__heading {
  font-size: 1rem;
  margin: 0 0 0.375rem;
}

.alerts-signup__hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 1rem;
}

.alerts-signup__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alerts-signup__channels {
  display: flex;
  gap: 0.375rem;
}

.channel-btn {
  flex: 1;
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  background: transparent;
  border-radius: var(--radius-sm);
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  cursor: pointer;
}

.channel-btn--active {
  background: var(--accent-brand);
  color: var(--text-primary);
  border-color: transparent;
  font-weight: 600;
  cursor: default;
}

.channel-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.channel-badge {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alerts-signup__topics {
  border: none;
  margin: 0;
  padding: 0;
  max-height: 12rem;
  overflow-y: auto;
}

.alerts-signup__label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0;
  margin-bottom: 0.375rem;
}

.alerts-signup__group-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0.625rem 0 0.25rem;
}

.alerts-signup__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding: 0.25rem 0;
  cursor: pointer;
}

.alerts-signup__dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.alerts-signup__input {
  padding: 0.625rem 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  color: var(--text-primary);
  background: var(--surface-2);
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  outline: none;
}

.alerts-signup__input:focus {
  border-color: var(--focus-ring);
}

.alerts-signup__input:disabled {
  opacity: 0.6;
}

.alerts-signup__hp {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.alerts-signup__btn {
  width: 100%;
  text-align: center;
}

.alerts-signup__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alerts-signup__success {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: bold;
  color: var(--success);
}

.alerts-signup__error {
  font-size: 0.8125rem;
  color: var(--danger);
  margin: 0;
}
</style>
