<template>
  <section class="slack-admin">
    <div class="ih-container">
      <AdminBar />
      <h1>Slack invite requests</h1>
      <p class="slack-admin__sub">
        Pending requests that weren't auto-approved. Approve to send the Slack invite,
        or reject to drop it.
      </p>

      <div v-if="authError" class="slack-admin__notice">
        You need to be signed in as a board admin to review invites.
        <RouterLink to="/login">Log in</RouterLink>.
      </div>

      <div v-else-if="loading" class="slack-admin__notice">Loading…</div>

      <div v-else-if="!invites.length" class="slack-admin__notice">
        🎉 Nothing waiting — the queue is empty.
      </div>

      <table v-else class="slack-admin__table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Country</th>
            <th>IP</th>
            <th>Requested</th>
            <th class="slack-admin__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invites" :key="inv.id">
            <td>{{ inv.email }}</td>
            <td>{{ inv.country || '—' }}</td>
            <td>{{ inv.ip || '—' }}</td>
            <td>{{ formatDate(inv.created) }}</td>
            <td class="slack-admin__actions">
              <button
                class="ih-btn-primary slack-admin__btn"
                :disabled="busyId === inv.id"
                @click="decide(inv, 'approved')"
              >
                Approve
              </button>
              <button
                class="ih-btn-outline slack-admin__btn"
                :disabled="busyId === inv.id"
                @click="decide(inv, 'rejected')"
              >
                Reject
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="message" class="slack-admin__message">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import AdminBar from './AdminBar.vue'

const pocketbase = inject('pocketbase')

const invites = ref([])
const loading = ref(true)
const authError = ref(false)
const busyId = ref(null)
const message = ref('')

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString()
}

const load = async () => {
  loading.value = true
  authError.value = false
  try {
    const res = await pocketbase.collection('slack_invites').getList(1, 100, {
      filter: 'status = "pending"',
      sort: '-created'
    })
    invites.value = res.items
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      authError.value = true
    } else {
      message.value = 'Could not load invites. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const decide = async (inv, status) => {
  busyId.value = inv.id
  message.value = ''
  try {
    await pocketbase.collection('slack_invites').update(inv.id, {
      status,
      reviewed_by: pocketbase.authStore.record?.id || null
    })
    invites.value = invites.value.filter((i) => i.id !== inv.id)
    message.value =
      status === 'approved'
        ? `Approved ${inv.email} — Slack invite sent.`
        : `Rejected ${inv.email}.`
  } catch {
    message.value = `Could not ${status === 'approved' ? 'approve' : 'reject'} ${inv.email}.`
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.slack-admin {
  padding: 3rem 0;
}

.slack-admin h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 0.75rem;
}

.slack-admin__sub {
  color: var(--text-secondary);
  max-width: 40rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.slack-admin__notice {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  color: var(--text-secondary);
  padding: 1.5rem 0;
}

.slack-admin__notice a {
  color: var(--accent-deep);
}

.slack-admin__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.slack-admin__table th,
.slack-admin__table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.slack-admin__table th {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.slack-admin__actions-col {
  width: 1%;
  white-space: nowrap;
}

.slack-admin__actions {
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
}

.slack-admin__btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
}

.slack-admin__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slack-admin__message {
  margin-top: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
