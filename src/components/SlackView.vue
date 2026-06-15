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
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="slack-form__input"
            aria-label="Email address"
            :disabled="submitting"
          />
        </div>

        <!-- reCAPTCHA renders here when a site key is configured -->
        <div v-show="siteKey" ref="recaptchaEl" class="slack-form__captcha"></div>

        <button type="submit" class="ih-btn-primary slack-form__btn" :disabled="submitting">
          {{ submitting ? 'Sending…' : 'Send me an invite' }}
        </button>

        <div v-if="error" class="slack-error">{{ error }}</div>
      </form>

      <p class="slack-coc">
        By joining you agree to our
        <RouterLink to="/code-of-conduct">code of conduct</RouterLink>.
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const email = ref('')
const siteKey = ref('')
const recaptchaEl = ref(null)

const submitting = ref(false)
const error = ref(null)
const result = ref(null)

let widgetId = null

const renderCaptcha = () => {
  if (!siteKey.value || widgetId !== null) return
  if (!window.grecaptcha || !window.grecaptcha.render || !recaptchaEl.value) return
  widgetId = window.grecaptcha.render(recaptchaEl.value, { sitekey: siteKey.value })
}

const loadCaptcha = () => {
  if (!siteKey.value) return
  if (window.grecaptcha && window.grecaptcha.render) {
    renderCaptcha()
    return
  }
  // Implicit-render callback fired by the reCAPTCHA script once it loads.
  window.__onIhRecaptchaLoad = renderCaptcha
  if (document.querySelector('script[data-ih-recaptcha]')) return
  const s = document.createElement('script')
  s.src = 'https://www.google.com/recaptcha/api.js?onload=__onIhRecaptchaLoad&render=explicit'
  s.async = true
  s.defer = true
  s.dataset.ihRecaptcha = 'true'
  document.head.appendChild(s)
}

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

  let captchaToken = ''
  if (siteKey.value) {
    captchaToken = window.grecaptcha ? window.grecaptcha.getResponse(widgetId) : ''
    if (!captchaToken) {
      error.value = 'Please complete the captcha.'
      return
    }
  }

  submitting.value = true
  try {
    const res = await fetch('/api/slack/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        'g-recaptcha-response': captchaToken
      })
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok && data.ok) {
      result.value = data
    } else {
      error.value = data.message || 'Something went wrong. Please try again.'
      if (siteKey.value && window.grecaptcha) window.grecaptcha.reset(widgetId)
    }
  } catch {
    error.value = 'Could not connect. Check your connection and try again.'
    if (siteKey.value && window.grecaptcha) window.grecaptcha.reset(widgetId)
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

.slack-coc {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 1.5rem;
}

.slack-coc a {
  color: var(--accent-deep);
}

.slack-coc a:hover {
  color: var(--text-primary);
}

@media (max-width: 480px) {
  .slack-form__btn {
    align-self: stretch;
    text-align: center;
  }
}
</style>
