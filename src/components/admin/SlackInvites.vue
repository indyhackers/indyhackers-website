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

      <ul v-else class="slack-admin__list">
        <li v-for="inv in invites" :key="inv.id" class="slack-admin__card">
          <div class="slack-admin__card-head">
            <div class="slack-admin__who">
              <h2 class="slack-admin__name">{{ fullName(inv) }}</h2>
              <a :href="`mailto:${inv.email}`" class="slack-admin__email">{{ inv.email }}</a>
            </div>
            <div class="slack-admin__actions">
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
            </div>
          </div>

          <dl class="slack-admin__meta">
            <div>
              <dt>Location</dt>
              <dd>{{ inv.city_region || '—' }}<span v-if="inv.country"> · {{ inv.country }}</span></dd>
            </div>
            <div>
              <dt>Requested</dt>
              <dd>{{ formatDate(inv.created) }}</dd>
            </div>
            <div>
              <dt>IP</dt>
              <dd>{{ inv.ip || '—' }}</dd>
            </div>
            <div v-if="geoText(inv)">
              <dt>Approx. location (IP)</dt>
              <dd>
                {{ geoText(inv) }}
                <a
                  v-if="mapUrl(inv)"
                  :href="mapUrl(inv)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="slack-admin__maplink"
                >
                  map ↗
                </a>
              </dd>
            </div>
            <div>
              <dt>Code of conduct</dt>
              <dd>{{ inv.coc_agreed ? '✓ agreed' : '⚠ not agreed' }}</dd>
            </div>
          </dl>

          <div v-if="inv.indiana_connection" class="slack-admin__connection">
            <dt>Connection to Indiana</dt>
            <p>{{ inv.indiana_connection }}</p>
          </div>

          <div v-if="inv.linkedin || inv.github" class="slack-admin__links">
            <a v-if="inv.linkedin" :href="normalizeUrl(inv.linkedin)" target="_blank" rel="noopener noreferrer">
              LinkedIn ↗
            </a>
            <a v-if="inv.github" :href="normalizeUrl(inv.github)" target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          </div>
        </li>
      </ul>

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

const fullName = (inv) => [inv.first_name, inv.last_name].filter(Boolean).join(' ') || '(no name given)'

// Links are stored as free text, so a user may omit the scheme.
const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

// Approximate IP geolocation captured from Cloudflare headers, stashed under
// signals.geo. Empty unless Cloudflare's visitor-location headers are enabled.
const geoText = (inv) => {
  const g = inv.signals?.geo || {}
  const parts = [g.city, g.region].filter(Boolean)
  if (!parts.length) return ''
  return inv.country ? `${parts.join(', ')} · ${inv.country}` : parts.join(', ')
}

const mapUrl = (inv) => {
  const g = inv.signals?.geo || {}
  if (!g.lat || !g.lon) return ''
  return `https://www.google.com/maps?q=${encodeURIComponent(g.lat)},${encodeURIComponent(g.lon)}`
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

.slack-admin__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.slack-admin__card {
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  background: var(--surface-1);
}

.slack-admin__card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.slack-admin__name {
  font-size: 1.125rem;
  margin: 0 0 0.15rem;
}

.slack-admin__email {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--accent-deep);
}

.slack-admin__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem 1.5rem;
  margin: 1.25rem 0 0;
}

.slack-admin__meta dt,
.slack-admin__connection dt {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
}

.slack-admin__meta dd {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-primary);
}

.slack-admin__maplink {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent-deep);
  margin-left: 0.35rem;
  white-space: nowrap;
}

.slack-admin__connection {
  margin-top: 1.25rem;
}

.slack-admin__connection p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.slack-admin__links {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.slack-admin__links a {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--accent-deep);
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
