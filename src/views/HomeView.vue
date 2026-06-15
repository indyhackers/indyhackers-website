<template>
  <!-- Hero -->
  <section class="hero">
    <div class="ih-container hero__layout">
      <div class="hero__copy">
        <h1 class="hero__heading">Indiana's tech community<br />since 2017</h1>
        <p class="hero__sub">
          What started as a few devs meeting for coffee is now 3,000 members strong.
          Come hang out.
        </p>
        <div class="hero__ctas">
          <RouterLink to="/slack" class="ih-btn-primary">Slack it to me!</RouterLink>
          <RouterLink to="/calendar" class="ih-btn-outline">Upcoming Events</RouterLink>
        </div>
      </div>
      <div class="hero__photo">
        <picture>
          <source
            srcset="/images/welcome-640.webp 640w, /images/welcome-1024.webp 1024w, /images/welcome.webp 2048w"
            sizes="(max-width: 768px) 100vw, 50vw"
            type="image/webp"
          />
          <img
            src="/images/welcome.jpg"
            alt="IndyHackers community event"
            fetchpriority="high"
          />
        </picture>
      </div>
    </div>
  </section>

  <!-- Community Proof -->
  <section class="proof">
    <div class="ih-container">
      <div class="proof__strip">
        <div class="proof__item">
          <span class="proof__number">3,000+</span>
          <span class="proof__label">members on Slack</span>
        </div>
        <div class="proof__item">
          <span class="proof__number">42+</span>
          <span class="proof__label">meetups a year</span>
        </div>
        <div class="proof__item">
          <span class="proof__number">&gt;9,000</span>
          <span class="proof__label">cups of coffee</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Upcoming Events -->
  <section class="events-section ih-full-bleed">
    <div class="ih-container">
      <EventsView :limit="3" />
    </div>
  </section>

</template>
<script>
import EventsView from '../components/EventsView.vue'

export default {
  name: 'HomeView',
  components: {
    EventsView
  },
}
</script>

<style scoped>
/* Hero */
.hero {
  padding: 7rem 0 5rem;
}

.hero__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero__heading {
  font-size: clamp(2.5rem, 5vw, 3.75rem);
  font-weight: bold;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
}

.hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 32rem;
  margin-bottom: 2rem;
}

.hero__ctas {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero__photo picture {
  display: block;
  width: 100%;
}

.hero__photo img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  box-shadow: var(--shadow-lg);
}

/* Community Proof */
.proof {
  padding: 3rem 0 4rem;
}

.proof__strip {
  display: flex;
  gap: 4rem;
}

.proof__item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.proof__number {
  font-family: var(--font-mono);
  font-size: clamp(2rem, 3.5vw, 2.75rem);
  font-weight: bold;
  line-height: 1;
  letter-spacing: -0.02em;
}

.proof__label {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

/* Events */
.events-section {
  padding: 4rem 0 5rem;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

@media (max-width: 768px) {
  .hero {
    padding: 5rem 0 3rem;
  }

  .hero__layout {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .proof__strip {
    flex-direction: column;
    gap: 2rem;
  }
}
</style>
