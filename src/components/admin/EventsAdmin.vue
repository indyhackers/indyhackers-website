<template>
  <section class="events-admin">
    <div class="ih-container">
      <AdminBar />
      <h1>Events</h1>
      <p class="events-admin__sub">
        Review submitted events, grant ownership claims, and edit any event on the calendar.
      </p>

      <div v-if="authError" class="events-admin__notice">
        You need to be signed in as a board admin to manage events.
        <RouterLink to="/login">Log in</RouterLink>.
      </div>

      <template v-else>
        <!-- Pending submissions -->
        <h2 class="events-admin__heading">Pending submissions</h2>
        <div v-if="loading" class="events-admin__notice">Loading…</div>
        <div v-else-if="!pending.length" class="events-admin__notice">🎉 Nothing waiting to review.</div>
        <table v-else class="events-admin__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>When</th>
              <th>Submitted by</th>
              <th class="events-admin__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in pending" :key="event.id">
              <td>{{ event.title }}</td>
              <td>{{ formatWhen(event) }}</td>
              <td>{{ personLabel(event.expand?.submitted_by) || event.submitted_by || '—' }}</td>
              <td class="events-admin__actions">
                <button class="ih-btn-primary events-admin__btn" :disabled="busyId === event.id" @click="approve(event)">
                  Approve
                </button>
                <button class="ih-btn-outline events-admin__btn" :disabled="busyId === event.id" @click="reject(event)">
                  Reject
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Ownership claims -->
        <h2 class="events-admin__heading">Ownership claims</h2>
        <div v-if="loading" class="events-admin__notice">Loading…</div>
        <div v-else-if="!claims.length" class="events-admin__notice">No pending ownership claims.</div>
        <table v-else class="events-admin__table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Requested by</th>
              <th>Note</th>
              <th class="events-admin__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="claim in claims" :key="claim.id">
              <td>{{ claim.expand?.event?.title || claim.event }}</td>
              <td>{{ personLabel(claim.expand?.requested_by) || claim.requested_by }}</td>
              <td>{{ claim.note || '—' }}</td>
              <td class="events-admin__actions">
                <button class="ih-btn-primary events-admin__btn" :disabled="busyId === claim.id" @click="grantClaim(claim)">
                  Grant
                </button>
                <button class="ih-btn-outline events-admin__btn" :disabled="busyId === claim.id" @click="denyClaim(claim)">
                  Deny
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- All events -->
        <h2 class="events-admin__heading">All events</h2>
        <input v-model="search" class="events-admin__search" type="search" placeholder="Search events…" />
        <div v-if="loading" class="events-admin__notice">Loading…</div>
        <div v-else-if="!filteredAll.length" class="events-admin__notice">No events match.</div>
        <ul v-else class="events-admin__list">
          <li v-for="event in filteredAll" :key="event.id" class="events-admin__item">
            <div class="events-admin__row">
              <div class="events-admin__info">
                <span class="events-admin__title">{{ event.title }}</span>
                <span class="events-admin__meta">
                  {{ formatWhen(event) }} · {{ event.source || 'google' }}
                  <template v-if="event.owner"> · owner: {{ personLabel(event.expand?.owner) || event.owner }}</template>
                </span>
              </div>
              <div class="events-admin__badges">
                <span
                  class="events-admin__badge"
                  :class="event.approved ? 'events-admin__badge--live' : 'events-admin__badge--pending'"
                >
                  {{ event.approved ? 'Live' : 'Hidden' }}
                </span>
                <button class="ih-btn-outline events-admin__btn" :disabled="busyId === event.id" @click="toggleApprove(event)">
                  {{ event.approved ? 'Unpublish' : 'Publish' }}
                </button>
                <button v-if="event.owner" class="ih-btn-outline events-admin__btn" :disabled="busyId === event.id" @click="releaseOwner(event)">
                  Release owner
                </button>
                <button class="ih-btn-outline events-admin__btn" @click="toggleEdit(event.id)">
                  {{ editingId === event.id ? 'Close' : 'Edit' }}
                </button>
                <button class="ih-btn-outline events-admin__btn" :disabled="busyId === event.id" @click="remove(event)">
                  Delete
                </button>
              </div>
            </div>
            <div v-if="editingId === event.id" class="events-admin__editor">
              <EventForm
                ref="formRef"
                :event="{ ...event, topics: event.expand?.topics || event.topics || [] }"
                submit-label="Save changes"
                :busy="busyId === event.id"
                @submit="(payload) => saveEdit(event, payload)"
                @cancel="toggleEdit(event.id)"
              />
            </div>
          </li>
        </ul>
      </template>

      <div v-if="message" class="events-admin__message">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import AdminBar from './AdminBar.vue'
import EventForm from '../events/EventForm.vue'

const pocketbase = inject('pocketbase')

const pending = ref([])
const claims = ref([])
const allEvents = ref([])
const loading = ref(true)
const authError = ref(false)
const busyId = ref(null)
const message = ref('')
const editingId = ref(null)
const search = ref('')
const formRef = ref(null)

const personLabel = (record) => (record ? record.name || record.email || record.id : '')

const formatWhen = (event) => {
  if (!event.starts_at) return ''
  const d = new Date(event.starts_at)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(event.all_day ? {} : { hour: 'numeric', minute: '2-digit' })
  })
}

const filteredAll = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return allEvents.value
  return allEvents.value.filter((e) => (e.title || '').toLowerCase().includes(q))
})

const load = async () => {
  loading.value = true
  authError.value = false
  try {
    // Two concurrent reads hit the same `events` collection; without distinct
    // request keys the PocketBase SDK auto-cancels one as a duplicate and the
    // whole load rejects.
    const [pendingRes, claimsRes, allRes] = await Promise.all([
      pocketbase.collection('events').getList(1, 200, {
        filter: pocketbase.filter('approved = false'),
        sort: '-starts_at',
        expand: 'submitted_by',
        requestKey: 'events-pending'
      }),
      pocketbase.collection('event_ownership_requests').getList(1, 200, {
        filter: pocketbase.filter('status = {:s}', { s: 'pending' }),
        sort: '-created',
        expand: 'event,requested_by'
      }),
      pocketbase.collection('events').getFullList({
        sort: '-starts_at',
        expand: 'topics,owner,submitted_by',
        requestKey: 'events-all'
      })
    ])
    // Dev mock ignores filters, so scope client-side too.
    pending.value = pendingRes.items.filter((e) => e.approved === false)
    claims.value = claimsRes.items.filter((c) => c.status === 'pending')
    allEvents.value = allRes
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) authError.value = true
    else message.value = 'Could not load events. Please try again.'
  } finally {
    loading.value = false
  }
}

const approve = async (event) => {
  busyId.value = event.id
  message.value = ''
  try {
    // Grant the submitter ownership on approval; lock so the sync leaves it be.
    await pocketbase.collection('events').update(event.id, {
      approved: true,
      owner: event.submitted_by || '',
      locked: true
    })
    pending.value = pending.value.filter((e) => e.id !== event.id)
    message.value = `Approved "${event.title}".`
    await load()
  } catch {
    message.value = `Could not approve "${event.title}".`
  } finally {
    busyId.value = null
  }
}

const reject = async (event) => {
  if (!window.confirm(`Reject and delete "${event.title}"? This can't be undone.`)) return
  busyId.value = event.id
  message.value = ''
  try {
    await pocketbase.collection('events').delete(event.id)
    pending.value = pending.value.filter((e) => e.id !== event.id)
    allEvents.value = allEvents.value.filter((e) => e.id !== event.id)
    message.value = `Rejected "${event.title}".`
  } catch {
    message.value = `Could not reject "${event.title}".`
  } finally {
    busyId.value = null
  }
}

const grantClaim = async (claim) => {
  busyId.value = claim.id
  message.value = ''
  try {
    const me = pocketbase.authStore.record
    await pocketbase.collection('events').update(claim.event, {
      owner: claim.requested_by,
      locked: true
    })
    await pocketbase.collection('event_ownership_requests').update(claim.id, {
      status: 'approved',
      reviewed_by: me ? me.id : ''
    })
    claims.value = claims.value.filter((c) => c.id !== claim.id)
    message.value = 'Ownership granted.'
    await load()
  } catch {
    message.value = 'Could not grant that claim.'
  } finally {
    busyId.value = null
  }
}

const denyClaim = async (claim) => {
  busyId.value = claim.id
  message.value = ''
  try {
    const me = pocketbase.authStore.record
    await pocketbase.collection('event_ownership_requests').update(claim.id, {
      status: 'rejected',
      reviewed_by: me ? me.id : ''
    })
    claims.value = claims.value.filter((c) => c.id !== claim.id)
    message.value = 'Claim denied.'
  } catch {
    message.value = 'Could not deny that claim.'
  } finally {
    busyId.value = null
  }
}

const toggleApprove = async (event) => {
  busyId.value = event.id
  message.value = ''
  try {
    const updated = await pocketbase.collection('events').update(event.id, {
      approved: !event.approved,
      locked: true
    })
    replaceInAll(event.id, updated)
    message.value = updated.approved ? `Published "${event.title}".` : `Unpublished "${event.title}".`
  } catch {
    message.value = `Could not update "${event.title}".`
  } finally {
    busyId.value = null
  }
}

const releaseOwner = async (event) => {
  busyId.value = event.id
  message.value = ''
  try {
    const updated = await pocketbase.collection('events').update(event.id, { owner: '' })
    replaceInAll(event.id, updated)
    message.value = `Cleared ownership of "${event.title}".`
  } catch {
    message.value = `Could not update "${event.title}".`
  } finally {
    busyId.value = null
  }
}

const remove = async (event) => {
  if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) return
  busyId.value = event.id
  message.value = ''
  try {
    await pocketbase.collection('events').delete(event.id)
    allEvents.value = allEvents.value.filter((e) => e.id !== event.id)
    pending.value = pending.value.filter((e) => e.id !== event.id)
    message.value = `Deleted "${event.title}".`
  } catch {
    message.value = `Could not delete "${event.title}".`
  } finally {
    busyId.value = null
  }
}

const toggleEdit = (id) => {
  editingId.value = editingId.value === id ? null : id
  message.value = ''
}

const saveEdit = async (event, payload) => {
  busyId.value = event.id
  message.value = ''
  try {
    const updated = await pocketbase.collection('events').update(event.id, payload, {
      expand: 'topics,owner,submitted_by'
    })
    replaceInAll(event.id, updated)
    editingId.value = null
    message.value = `Saved "${payload.title}".`
  } catch {
    const f = Array.isArray(formRef.value) ? formRef.value[0] : formRef.value
    f?.showError('Could not save your changes. Please try again.')
  } finally {
    busyId.value = null
  }
}

const replaceInAll = (id, updated) => {
  const idx = allEvents.value.findIndex((e) => e.id === id)
  if (idx !== -1) allEvents.value[idx] = { ...allEvents.value[idx], ...updated }
}

onMounted(load)
</script>

<style scoped>
.events-admin {
  padding: 3rem 0;
}

.events-admin h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 0.75rem;
}

.events-admin__sub {
  color: var(--text-secondary);
  max-width: 40rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.events-admin__heading {
  font-size: 1.25rem;
  margin: 2.5rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
}

.events-admin__notice {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  color: var(--text-secondary);
  padding: 1rem 0;
}

.events-admin__notice a {
  color: var(--accent-deep);
}

.events-admin__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.events-admin__table th,
.events-admin__table td {
  text-align: left;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.events-admin__table th {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.events-admin__actions-col {
  width: 1%;
  white-space: nowrap;
}

.events-admin__actions {
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
}

.events-admin__search {
  width: 100%;
  max-width: 22rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
}

.events-admin__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.events-admin__item {
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: 0.85rem 1.1rem;
}

.events-admin__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.events-admin__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.events-admin__title {
  font-weight: 600;
  color: var(--text-primary);
}

.events-admin__meta {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.events-admin__badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.events-admin__badge {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
}

.events-admin__badge--live {
  background: color-mix(in srgb, var(--success, #16a34a) 15%, transparent);
  color: var(--success, #16a34a);
}

.events-admin__badge--pending {
  background: color-mix(in srgb, var(--warning, #d97706) 15%, transparent);
  color: var(--warning, #d97706);
}

.events-admin__btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8125rem;
}

.events-admin__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.events-admin__editor {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
}

.events-admin__message {
  margin-top: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
