<template>
  <section
    id="newsletter-subscribe"
    class="newsletter-subscribe"
    aria-labelledby="newsletter-subscribe-heading"
  >
    <h2 id="newsletter-subscribe-heading">Don't miss what's next.</h2>
    <p>Subscribe to Hacks &amp;&amp; Happenings:</p>

    <p v-if="subscribed" class="signup-success" role="status">
      You're in. Check your inbox to confirm.
    </p>
    <form v-else class="signup-form" @submit.prevent="subscribe">
      <label class="signup-form__label" for="newsletter-email">Email</label>
      <input
        id="newsletter-email"
        v-model="email"
        type="email"
        required
        placeholder="you@example.com"
        class="signup-form__input"
        :disabled="submitting"
      />
      <button type="submit" class="ih-btn-primary signup-form__btn" :disabled="submitting">
        {{ submitting ? 'Subscribing...' : 'Subscribe' }}
      </button>
    </form>
    <p v-if="subscribeError" class="signup-error" role="alert">{{ subscribeError }}</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const submitting = ref(false)
const subscribed = ref(false)
const subscribeError = ref('')

const subscribe = async () => {
  submitting.value = true
  subscribeError.value = ''

  try {
    const form = new FormData()
    form.append('email', email.value)

    const response = await fetch(
      'https://buttondown.email/api/emails/embed-subscribe/indyhackers',
      { method: 'POST', body: form }
    )

    if (response.ok || response.status === 201) {
      subscribed.value = true
    } else {
      subscribeError.value = 'Something went wrong. Try again?'
    }
  } catch {
    subscribeError.value = 'Could not connect. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.newsletter-subscribe {
  margin-top: 3rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--border) 18%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-1) 55%, transparent);
}

.newsletter-subscribe h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.newsletter-subscribe > p {
  color: var(--text-secondary);
}

.signup-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 28rem;
}

.signup-form__label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.signup-form__input {
  min-width: 0;
  flex: 1;
  padding: 0.875rem 1rem;
  border: 1px solid color-mix(in srgb, var(--border) 25%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
}

.signup-form__input::placeholder {
  color: var(--text-muted);
}

.signup-form__input:focus {
  border-color: var(--focus-ring);
  outline: 2px solid color-mix(in srgb, var(--focus-ring) 25%, transparent);
}

.signup-form__btn {
  flex-shrink: 0;
  text-transform: uppercase;
}

.signup-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.signup-success {
  color: var(--success);
}

.signup-error {
  margin: 0.5rem 0 0;
  color: var(--danger);
}

@media (max-width: 30rem) {
  .newsletter-subscribe {
    padding: 1rem;
  }

  .signup-form {
    flex-direction: column;
    align-items: stretch;
  }

  .signup-form__label {
    align-self: flex-start;
  }
}
</style>
