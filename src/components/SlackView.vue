<template>
  <section class="slack-hero">
    <div class="ih-container">
      <h1>Join us on Slack</h1>
      <p class="slack-hero__sub">
        IndyHackers lives on Slack — where Indianapolis developers swap ideas, share
        gigs, plan meetups, and help each other ship. Drop your email and we'll send you
        an invite.
      </p>

      <div v-if="result" class="slack-success">
        <p>{{ result.msg }}</p>
        <a v-if="result.url" :href="result.url" class="ih-btn-primary" target="_blank" rel="noopener noreferrer">
          Open Slack →
        </a>
      </div>

      <form v-else class="slack-form" @submit.prevent="requestInvite">
        <div class="slack-form__row">
          <label class="slack-form__label" for="slack-email">Email</label>
          <input
            id="slack-email"
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="slack-form__input"
            :disabled="submitting"
          />
        </div>

        <div class="slack-form__names">
          <div class="slack-form__row">
            <label class="slack-form__label" for="slack-first">First name</label>
            <input
              id="slack-first"
              v-model="firstName"
              type="text"
              required
              autocomplete="given-name"
              class="slack-form__input"
              :disabled="submitting"
            />
          </div>
          <div class="slack-form__row">
            <label class="slack-form__label" for="slack-last">Last name</label>
            <input
              id="slack-last"
              v-model="lastName"
              type="text"
              required
              autocomplete="family-name"
              class="slack-form__input"
              :disabled="submitting"
            />
          </div>
        </div>

        <div class="slack-form__row">
          <label class="slack-form__label" for="slack-connection">What is your connection to Indiana?</label>
          <textarea
            id="slack-connection"
            v-model="indianaConnection"
            required
            rows="3"
            class="slack-form__input slack-form__textarea"
            :disabled="submitting"
          ></textarea>
        </div>

        <div class="slack-form__row">
          <label class="slack-form__label" for="slack-city">City or region you're currently based in?</label>
          <input
            id="slack-city"
            v-model="cityRegion"
            type="text"
            required
            class="slack-form__input"
            :disabled="submitting"
          />
        </div>

        <div class="slack-form__row">
          <label class="slack-form__label" for="slack-linkedin">LinkedIn profile (optional)</label>
          <input
            id="slack-linkedin"
            v-model="linkedin"
            type="text"
            inputmode="url"
            placeholder="https://linkedin.com/in/…"
            class="slack-form__input"
            :disabled="submitting"
          />
        </div>

        <div class="slack-form__row">
          <label class="slack-form__label" for="slack-github">GitHub profile (optional)</label>
          <input
            id="slack-github"
            v-model="github"
            type="text"
            inputmode="url"
            placeholder="https://github.com/…"
            class="slack-form__input"
            :disabled="submitting"
          />
        </div>

        <!-- Honeypot: hidden from humans, bots tend to fill it. Server drops it. -->
        <input
          v-model="website"
          type="text"
          name="website"
          class="slack-form__hp"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />

        <!-- reCAPTCHA v3 is invisible: no widget here. When a site key is
             configured, a token is fetched via grecaptcha.execute() on submit
             and Google shows its badge in the corner of the page. -->

        <label class="slack-form__check">
          <input v-model="cocAgreed" type="checkbox" required :disabled="submitting" />
          <span>
            I agree to the
            <RouterLink to="/code-of-conduct" target="_blank" rel="noopener noreferrer">code of conduct</RouterLink>.
          </span>
        </label>

        <button type="submit" class="ih-btn-primary slack-form__btn" :disabled="submitting">
          {{ submitting ? 'Sending…' : 'Send me an invite' }}
        </button>

        <div v-if="error" class="slack-error">{{ error }}</div>
      </form>

    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const CAPTCHA_ACTION = 'slack_invite'

const email = ref('')
const firstName = ref('')
const lastName = ref('')
const indianaConnection = ref('')
const cityRegion = ref('')
const linkedin = ref('')
const github = ref('')
const cocAgreed = ref(false)
const website = ref('') // honeypot — must stay empty
const siteKey = ref('')

const submitting = ref(false)
const error = ref(null)
const result = ref(null)

// reCAPTCHA v3: load the script with the site key so grecaptcha.execute() is
// available. There's no visible widget — a token is minted per submission.
const loadCaptcha = () => {
  if (!siteKey.value) return
  if (window.grecaptcha && window.grecaptcha.execute) return
  if (document.querySelector('script[data-ih-recaptcha]')) return
  const s = document.createElement('script')
  s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey.value)}`
  s.async = true
  s.defer = true
  s.dataset.ihRecaptcha = 'true'
  document.head.appendChild(s)
}

// Resolve a fresh v3 token for this submission (empty string if captcha isn't
// configured or the script failed to load — the server decides what to enforce).
const getCaptchaToken = () =>
  new Promise((resolve) => {
    if (!siteKey.value || !window.grecaptcha || !window.grecaptcha.execute) {
      resolve('')
      return
    }
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(siteKey.value, { action: CAPTCHA_ACTION })
        .then(resolve)
        .catch(() => resolve(''))
    })
  })

const fetchConfig = async () => {
  try {
    const res = await fetch('/api/slack/config')
    if (!res.ok) return
    const cfg = await res.json()
    siteKey.value = cfg.siteKey || ''
    loadCaptcha()
  } catch {
    // Non-fatal: the form still works, the server enforces what it needs.
  }
}

const requestInvite = async () => {
  error.value = null
  submitting.value = true
  try {
    const captchaToken = await getCaptchaToken()
    if (siteKey.value && !captchaToken) {
      error.value = 'Captcha check failed. Please try again.'
      return
    }

    const res = await fetch('/api/slack/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        first_name: firstName.value,
        last_name: lastName.value,
        indiana_connection: indianaConnection.value,
        city_region: cityRegion.value,
        linkedin: linkedin.value,
        github: github.value,
        coc_agreed: cocAgreed.value,
        website: website.value,
        'g-recaptcha-response': captchaToken
      })
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok && data.ok) {
      result.value = data
    } else {
      error.value = data.message || 'Something went wrong. Please try again.'
    }
  } catch {
    error.value = 'Could not connect. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchConfig)
</script>

<style scoped>
.slack-hero {
  padding: 3rem 0;
}

.slack-hero h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1.25rem;
}

.slack-hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  max-width: 38rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.slack-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 28rem;
}

.slack-form__row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.slack-form__label {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.slack-form__input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-primary);
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--border) 25%, transparent);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.2s ease;
}

.slack-form__input::placeholder {
  color: var(--text-muted);
}

.slack-form__input:focus {
  border-color: var(--focus-ring);
}

.slack-form__input:disabled {
  opacity: 0.6;
}

.slack-form__textarea {
  resize: vertical;
  min-height: 3.5rem;
  line-height: 1.5;
}

.slack-form__names {
  display: flex;
  gap: 1rem;
}

.slack-form__names .slack-form__row {
  flex: 1;
}

.slack-form__check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.slack-form__check input {
  margin-top: 0.2rem;
  flex-shrink: 0;
}

.slack-form__check a {
  color: var(--accent-deep);
}

.slack-form__check a:hover {
  color: var(--text-primary);
}

/* Honeypot — off-screen, not display:none, so bots still fill it. */
.slack-form__hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.slack-form__btn {
  align-self: flex-start;
}

.slack-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.slack-success {
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  color: var(--success);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  max-width: 28rem;
}

.slack-error {
  font-size: 0.875rem;
  color: var(--danger);
}

@media (max-width: 480px) {
  .slack-form__names {
    flex-direction: column;
  }

  .slack-form__btn {
    align-self: stretch;
    text-align: center;
  }
}
</style>
