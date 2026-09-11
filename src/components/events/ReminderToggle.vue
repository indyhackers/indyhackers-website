<template>
  <div class="reminder">
    <!-- Not signed in -->
    <template v-if="!isAuthed">
      <p class="reminder__hint">Sign in to get an email reminder before each occurrence.</p>
      <router-link to="/login" class="ih-btn-primary reminder__btn">Sign in</router-link>
    </template>

    <!-- Subscribed -->
    <template v-else-if="subscription">
      <p class="reminder__active"><span aria-hidden="true">✓</span> You're subscribed</p>
      <label class="reminder__label">Remind me</label>
      <select v-model.number="leadTime" class="reminder__select" @change="changeLeadTime">
        <option v-for="opt in leadTimes" :key="opt.minutes" :value="opt.minutes">
          {{ opt.label }}
        </option>
      </select>
      <button class="reminder__off" :disabled="busy" @click="unsubscribe">Turn off reminders</button>
    </template>

    <!-- Not subscribed -->
    <template v-else>
      <label class="reminder__label">Remind me</label>
      <select v-model.number="leadTime" class="reminder__select">
        <option v-for="opt in leadTimes" :key="opt.minutes" :value="opt.minutes">
          {{ opt.label }}
        </option>
      </select>
      <button class="ih-btn-primary reminder__btn" :disabled="busy" @click="subscribe">
        Subscribe to reminders
      </button>
    </template>

    <p v-if="errorMsg" class="reminder__error">{{ errorMsg }}</p>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { LEAD_TIMES } from '@/composables/useEvents'

const props = defineProps({
  series: { type: Object, required: true }
})

const pocketbase = inject('pocketbase')
const leadTimes = LEAD_TIMES

const isAuthed = ref(!!(pocketbase.authStore && pocketbase.authStore.isValid))
const subscription = ref(null)
const leadTime = ref(1440)
const busy = ref(false)
const errorMsg = ref('')

function userId() {
  return pocketbase.authStore.record ? pocketbase.authStore.record.id : pocketbase.authStore.model?.id
}

async function loadSubscription() {
  if (!isAuthed.value) return
  try {
    const found = await pocketbase
      .collection('subscriptions')
      .getFirstListItem(`event_series="${props.series.id}" && user="${userId()}"`)
    subscription.value = found
    leadTime.value = found.lead_time_minutes
  } catch (_) {
    subscription.value = null
  }
}

async function subscribe() {
  busy.value = true
  errorMsg.value = ''
  try {
    subscription.value = await pocketbase.collection('subscriptions').create({
      user: userId(),
      event_series: props.series.id,
      lead_time_minutes: leadTime.value
    })
  } catch (err) {
    errorMsg.value = err.message || 'Could not subscribe'
  } finally {
    busy.value = false
  }
}

async function changeLeadTime() {
  if (!subscription.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    subscription.value = await pocketbase
      .collection('subscriptions')
      .update(subscription.value.id, { lead_time_minutes: leadTime.value })
  } catch (err) {
    errorMsg.value = err.message || 'Could not update reminder'
  } finally {
    busy.value = false
  }
}

async function unsubscribe() {
  if (!subscription.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    await pocketbase.collection('subscriptions').delete(subscription.value.id)
    subscription.value = null
  } catch (err) {
    errorMsg.value = err.message || 'Could not unsubscribe'
  } finally {
    busy.value = false
  }
}

onMounted(loadSubscription)
</script>

<style scoped>
.reminder {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.reminder__hint {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.reminder__active {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent-cool);
}

.reminder__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.reminder__select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--surface-1);
}

.reminder__select:focus {
  outline: none;
  border-color: var(--accent-warm);
}

.reminder__btn {
  text-align: center;
}

.reminder__off {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  background: transparent;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-muted);
}

.reminder__off:hover {
  background: var(--surface-2);
}

.reminder__error {
  font-size: 0.8125rem;
  color: var(--danger);
}
</style>
