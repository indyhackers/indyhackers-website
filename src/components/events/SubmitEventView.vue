<template>
  <div class="event-submit">
    <div class="ih-container">
      <div class="event-submit__content">
        <router-link to="/calendar" class="back-link">← Back to calendar</router-link>
        <h1 class="title">Submit an Event</h1>
        <p class="subtitle">
          Add a tech event, meetup, or workshop to the community calendar. A board member reviews
          every submission before it goes live. Once it's approved, it's yours to edit anytime from
          <router-link to="/events/mine">your events</router-link>.
        </p>

        <b-card class="form-card">
          <b-alert v-model="done" variant="success">
            🎉 Thanks! Your event was submitted and is pending board approval. You can track it under
            <router-link to="/events/mine">your events</router-link>.
          </b-alert>

          <EventForm
            v-if="!done"
            ref="formRef"
            submit-label="Submit for review"
            :busy="busy"
            @submit="submit"
            @cancel="$router.push('/calendar')"
          />
        </b-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import EventForm from './EventForm.vue'

const pocketbase = inject('pocketbase')

const busy = ref(false)
const done = ref(false)
const formRef = ref(null)

async function submit(payload) {
  busy.value = true
  try {
    const me = pocketbase.authStore.record
    await pocketbase.collection('events').create({
      ...payload,
      // Satisfy the create rule; the events_guard hook re-forces these
      // server-side so a crafted request can't self-approve or self-own.
      source: 'user',
      submitted_by: me ? me.id : '',
      owner: '',
      approved: false
    })
    done.value = true
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    console.error('Event submission failed:', err)
    const msg =
      err?.status === 401 || err?.status === 403
        ? 'You need to be signed in to submit an event.'
        : 'Something went wrong submitting your event. Please try again.'
    formRef.value?.showError(msg)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.event-submit {
  background-color: var(--surface-2);
  padding: 3rem 0;
}

.event-submit__content {
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--text-muted);
  text-decoration: none;
}

.back-link:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.15rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.form-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border) !important;
  background: var(--surface-1) !important;
  padding: 2rem;
}
</style>
