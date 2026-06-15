<template>
  <section class="job-admin">
    <div class="ih-container">
      <AdminBar />
      <h1>Job approvals</h1>
      <p class="job-admin__sub">
        Jobs submitted to the board that are waiting to be published. Approve to make a
        listing live, or reject to remove it.
      </p>

      <div v-if="authError" class="job-admin__notice">
        You need to be signed in as a board admin to review jobs.
        <RouterLink to="/login">Log in</RouterLink>.
      </div>

      <div v-else-if="loading" class="job-admin__notice">Loading…</div>

      <div v-else-if="!jobs.length" class="job-admin__notice">
        🎉 Nothing waiting — no jobs to review.
      </div>

      <table v-else class="job-admin__table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Salary</th>
            <th>Submitted</th>
            <th class="job-admin__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id">
            <td>{{ job.title }}</td>
            <td>{{ job.company }}</td>
            <td>{{ salary(job) }}</td>
            <td>{{ formatDate(job.created) }}</td>
            <td class="job-admin__actions">
              <button
                class="ih-btn-primary job-admin__btn"
                :disabled="busyId === job.id"
                @click="approve(job)"
              >
                Approve
              </button>
              <button
                class="ih-btn-outline job-admin__btn"
                :disabled="busyId === job.id"
                @click="reject(job)"
              >
                Reject
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="message" class="job-admin__message">{{ message }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import AdminBar from './AdminBar.vue'

const pocketbase = inject('pocketbase')

const jobs = ref([])
const loading = ref(true)
const authError = ref(false)
const busyId = ref(null)
const message = ref('')

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString()
}

const salary = (job) => {
  const fmt = (n) => (n ? '$' + n + 'k' : '—')
  if (!job.salary_min && !job.salary_max) return 'Not specified'
  return fmt(job.salary_min) + ' – ' + fmt(job.salary_max)
}

const load = async () => {
  loading.value = true
  authError.value = false
  try {
    const res = await pocketbase.collection('jobs').getList(1, 100, {
      filter: 'approved = false',
      sort: '-created'
    })
    // Safety net: keep only unapproved (in case the backend ignores the filter).
    jobs.value = res.items.filter((j) => !j.approved)
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      authError.value = true
    } else {
      message.value = 'Could not load jobs. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const approve = async (job) => {
  busyId.value = job.id
  message.value = ''
  try {
    await pocketbase.collection('jobs').update(job.id, { approved: true })
    jobs.value = jobs.value.filter((j) => j.id !== job.id)
    message.value = `Approved "${job.title}" — it's now live.`
  } catch {
    message.value = `Could not approve "${job.title}".`
  } finally {
    busyId.value = null
  }
}

const reject = async (job) => {
  if (!window.confirm(`Reject and delete "${job.title}"? This can't be undone.`)) return
  busyId.value = job.id
  message.value = ''
  try {
    await pocketbase.collection('jobs').delete(job.id)
    jobs.value = jobs.value.filter((j) => j.id !== job.id)
    message.value = `Rejected "${job.title}".`
  } catch {
    message.value = `Could not reject "${job.title}".`
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.job-admin {
  padding: 3rem 0;
}

.job-admin h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 0.75rem;
}

.job-admin__sub {
  color: var(--text-secondary);
  max-width: 40rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.job-admin__notice {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  color: var(--text-secondary);
  padding: 1.5rem 0;
}

.job-admin__notice a {
  color: var(--accent-deep);
}

.job-admin__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.job-admin__table th,
.job-admin__table td {
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

.job-admin__table th {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.job-admin__actions-col {
  width: 1%;
  white-space: nowrap;
}

.job-admin__actions {
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
}

.job-admin__btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
}

.job-admin__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.job-admin__message {
  margin-top: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}
</style>
