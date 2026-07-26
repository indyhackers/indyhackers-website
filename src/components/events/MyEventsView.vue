<template>
  <section class="my-events">
    <div class="ih-container">
      <div class="my-events__head">
        <div>
          <h1>Your events</h1>
          <p class="my-events__sub">Events you've submitted or own. Approved events are live on the calendar.</p>
        </div>
        <router-link to="/events/submit" class="ih-btn-primary my-events__new">Submit an event</router-link>
      </div>

      <div v-if="authError" class="my-events__notice">
        You need to be signed in to manage your events. <router-link to="/login">Log in</router-link>.
      </div>
      <div v-else-if="loading" class="my-events__notice">Loading…</div>
      <div v-else-if="!events.length" class="my-events__notice">
        You haven't submitted any events yet.
        <router-link to="/events/submit">Submit your first one</router-link>.
      </div>

      <ul v-else class="my-events__list">
        <li v-for="event in events" :key="event.id" class="my-events__item">
          <div class="my-events__row">
            <div class="my-events__info">
              <span class="my-events__title">{{ event.title }}</span>
              <span class="my-events__meta">{{ formatWhen(event) }}</span>
            </div>
            <div class="my-events__badges">
              <span
                class="my-events__badge"
                :class="event.approved ? 'my-events__badge--live' : 'my-events__badge--pending'"
              >
                {{ event.approved ? 'Live' : 'Pending review' }}
              </span>
              <button class="ih-btn-outline my-events__btn" @click="toggle(event.id)">
                {{ editingId === event.id ? 'Close' : 'Edit' }}
              </button>
            </div>
          </div>

          <div v-if="editingId === event.id" class="my-events__editor">
            <EventForm
              ref="formRef"
              :event="event"
              submit-label="Save changes"
              :busy="busyId === event.id"
              @submit="(payload) => save(event, payload)"
              @cancel="toggle(event.id)"
            />
          </div>
        </li>
      </ul>

      <div v-if="message" class="my-events__message">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import EventForm from './EventForm.vue'

const pocketbase = inject('pocketbase')

const events = ref([])
const loading = ref(true)
const authError = ref(false)
const editingId = ref(null)
const busyId = ref(null)
const message = ref('')
const formRef = ref(null)

const formatWhen = (event) => {
  if (!event.starts_at) return ''
  const d = new Date(event.starts_at)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(event.all_day ? {} : { hour: 'numeric', minute: '2-digit' })
  })
}

const load = async () => {
  loading.value = true
  authError.value = false
  const me = pocketbase.authStore.record
  if (!me) {
    authError.value = true
    loading.value = false
    return
  }
  try {
    const res = await pocketbase.collection('events').getList(1, 200, {
      filter: pocketbase.filter('owner = {:id} || submitted_by = {:id}', { id: me.id }),
      sort: '-starts_at',
      expand: 'topics'
    })
    // Belt-and-suspenders: the dev mock ignores filters, so scope client-side.
    events.value = res.items
      .filter((e) => e.owner === me.id || e.submitted_by === me.id)
      .map((e) => ({ ...e, topics: e.expand?.topics || e.topics || [] }))
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) authError.value = true
    else message.value = 'Could not load your events. Please try again.'
  } finally {
    loading.value = false
  }
}

const toggle = (id) => {
  editingId.value = editingId.value === id ? null : id
  message.value = ''
}

const save = async (event, payload) => {
  busyId.value = event.id
  message.value = ''
  try {
    const updated = await pocketbase.collection('events').update(event.id, payload, {
      expand: 'topics'
    })
    const idx = events.value.findIndex((e) => e.id === event.id)
    if (idx !== -1) {
      events.value[idx] = {
        ...events.value[idx],
        ...updated,
        topics: updated.expand?.topics || updated.topics || []
      }
    }
    editingId.value = null
    message.value = `Saved "${payload.title}".`
  } catch (err) {
    console.error('Could not save event:', err)
    const msg =
      err?.status === 403
        ? 'You can only edit events you own.'
        : 'Could not save your changes. Please try again.'
    // formRef is an array when v-for'd; grab the mounted one.
    const f = Array.isArray(formRef.value) ? formRef.value[0] : formRef.value
    f?.showError(msg)
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.my-events {
  padding: 3rem 0;
}

.my-events__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.my-events h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 0.5rem;
}

.my-events__sub {
  color: var(--text-secondary);
  margin: 0;
}

.my-events__new {
  white-space: nowrap;
}

.my-events__notice {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  color: var(--text-secondary);
  padding: 1.5rem 0;
}

.my-events__notice a {
  color: var(--accent-deep);
}

.my-events__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.my-events__item {
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: 1rem 1.25rem;
}

.my-events__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.my-events__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.my-events__title {
  font-weight: 600;
  color: var(--text-primary);
}

.my-events__meta {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.my-events__badges {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.my-events__badge {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
}

.my-events__badge--live {
  background: color-mix(in srgb, var(--success, #16a34a) 15%, transparent);
  color: var(--success, #16a34a);
}

.my-events__badge--pending {
  background: color-mix(in srgb, var(--warning, #d97706) 15%, transparent);
  color: var(--warning, #d97706);
}

.my-events__btn {
  padding: 0.35rem 0.9rem;
  font-size: 0.8125rem;
}

.my-events__editor {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
}

.my-events__message {
  margin-top: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
