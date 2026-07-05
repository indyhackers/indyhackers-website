<template>
  <section class="slack-admin">
    <div class="ih-container">
      <AdminBar />
      <h1>Slack invite requests</h1>
      <p class="slack-admin__sub">
        Pending requests that weren't auto-approved. Approve to send the Slack invite,
        or reject to drop it.
      </p>

      <div
        v-if="autoApprove !== null"
        class="slack-admin__mode"
        :class="autoApprove ? 'slack-admin__mode--on' : 'slack-admin__mode--off'"
      >
        <template v-if="autoApprove">
          🟢 Auto-approval is <strong>ON</strong> — low-risk requests (US visitor + reCAPTCHA
          pass) are invited automatically, so only requests that need a human land here.
        </template>
        <template v-else>
          🔴 Auto-approval is <strong>OFF</strong> — every invite request is queued here for
          manual review.
        </template>
      </div>

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
              <dd>{{ geoText(inv) }}</dd>
            </div>
            <div v-if="inv.signals?.geo?.postal">
              <dt>Postal code</dt>
              <dd>{{ inv.signals.geo.postal }}</dd>
            </div>
            <div v-if="inv.signals?.geo?.metro_code">
              <dt>Metro code</dt>
              <dd>{{ inv.signals.geo.metro_code }}</dd>
            </div>
            <div v-if="geoCoords(inv)">
              <dt>Coordinates</dt>
              <dd>
                {{ geoCoords(inv) }}
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
            <div v-if="tzText(inv)">
              <dt>Time zone</dt>
              <dd>{{ tzText(inv) }}</dd>
            </div>
            <div>
              <dt>Code of conduct</dt>
              <dd>{{ inv.coc_agreed ? '✓ agreed' : '⚠ not agreed' }}</dd>
            </div>
          </dl>

          <div v-if="inv.signals" class="slack-admin__signals">
            <p class="slack-admin__signals-title">Auto-approval signals</p>
            <dl class="slack-admin__meta">
              <div>
                <dt>US visitor</dt>
                <dd>{{ yesNo(inv.signals.is_us) }}</dd>
              </div>
              <div>
                <dt>reCAPTCHA</dt>
                <dd>{{ captchaLabel(inv) }}</dd>
              </div>
              <div>
                <dt>Disposable email</dt>
                <dd>{{ yesNo(inv.signals.disposable) }}</dd>
              </div>
            </dl>
          </div>

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
const autoApprove = ref(null) // null until /api/slack/config resolves

const formatDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString()
}

const fullName = (inv) => [inv.first_name, inv.last_name].filter(Boolean).join(' ') || '(no name given)'

const yesNo = (v) => (v ? 'Yes' : 'No')

// The reCAPTCHA signal: numeric v3 score vs. threshold when available, falling
// back to the stored pass/fail for older rows that predate score capture.
const captchaLabel = (inv) => {
  const s = inv.signals || {}
  if (s.captcha_ok === 'not_configured') return 'not configured'
  if (typeof s.captcha_score === 'number') {
    const min = typeof s.captcha_min_score === 'number' ? ` (min ${s.captcha_min_score})` : ''
    return `${s.captcha_score}${min} — ${s.captcha_ok ? 'pass' : 'below threshold'}`
  }
  return s.captcha_ok ? 'pass' : 'fail'
}

// Links are stored as free text, so a user may omit the scheme.
const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

// Approximate IP geolocation captured from Cloudflare headers, stashed under
// signals.geo. Empty unless Cloudflare's visitor-location headers are enabled.
const CONTINENTS = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America'
}
const continentName = (code) => CONTINENTS[String(code || '').toUpperCase()] || code || ''

const hasGeo = (inv) => {
  const g = inv.signals?.geo || {}
  return !!(g.city || g.region || g.continent || (g.lat && g.lon))
}

const geoText = (inv) => {
  if (!hasGeo(inv)) return ''
  const g = inv.signals?.geo || {}
  const region = g.region && g.region_code ? `${g.region} (${g.region_code})` : g.region || g.region_code || ''
  const locality = [g.city, region].filter(Boolean).join(', ')
  const wider = [continentName(g.continent), inv.country].filter(Boolean).join(' · ')
  return [locality, wider].filter(Boolean).join(' · ')
}

const geoCoords = (inv) => {
  const g = inv.signals?.geo || {}
  return g.lat && g.lon ? `${g.lat}, ${g.lon}` : ''
}

// IANA timezone from Cloudflare + how it relates to Indianapolis (Eastern).
const tzText = (inv) => {
  const g = inv.signals?.geo || {}
  if (!g.timezone) return ''
  if (g.same_tz_as_indy === true) return `${g.timezone} — same as Indianapolis`
  if (g.same_tz_as_indy === false) return `${g.timezone} — different from Indianapolis`
  return g.timezone
}

const mapUrl = (inv) => {
  const g = inv.signals?.geo || {}
  if (!g.lat || !g.lon) return ''
  return `https://www.google.com/maps?q=${encodeURIComponent(g.lat)},${encodeURIComponent(g.lon)}`
}

const loadConfig = async () => {
  try {
    const res = await fetch('/api/slack/config')
    if (!res.ok) return
    const cfg = await res.json()
    if (typeof cfg.autoApprove === 'boolean') autoApprove.value = cfg.autoApprove
  } catch {
    // Non-fatal: the mode banner just stays hidden.
  }
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

onMounted(() => {
  loadConfig()
  load()
})
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

.slack-admin__mode {
  font-size: 0.875rem;
  line-height: 1.6;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.slack-admin__mode--on {
  border-color: color-mix(in srgb, var(--success) 40%, transparent);
  background: color-mix(in srgb, var(--success) 10%, transparent);
}

.slack-admin__mode--off {
  border-color: color-mix(in srgb, var(--warning) 45%, transparent);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
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

/* Grid cells default to min-width:auto, so a long unbreakable value (e.g. an
   IPv6 address) forces the cell wider and overlaps its neighbours. Let cells
   shrink and let their values wrap. */
.slack-admin__meta > div {
  min-width: 0;
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
  overflow-wrap: anywhere;
}

.slack-admin__signals {
  margin-top: 1.25rem;
}

.slack-admin__signals-title {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}

.slack-admin__signals .slack-admin__meta {
  margin: 0;
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
