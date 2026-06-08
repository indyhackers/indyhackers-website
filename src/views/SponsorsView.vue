<template>
  <!-- Intro -->
  <section class="sponsors-hero">
    <div class="ih-container">
      <h1 class="sponsors-hero__heading">Support Indy Hackers</h1>
      <p class="sponsors-hero__sub">
        Indy Hackers is volunteer-run. Donations and sponsorships pay for event
        spaces, food, and the tools that keep the community running.
      </p>
    </div>
  </section>

  <!-- Member donations -->
  <section class="donate ih-full-bleed">
    <div class="ih-container">
      <h2 class="donate__heading">Chip in monthly</h2>
      <p class="donate__sub">Pick an amount that works for you. Every dollar goes directly to community events and infrastructure.</p>
      <div class="donate__options">
        <a
          href="https://donate.stripe.com/bJeeVcdEvcOpdnE0oQgrS01"
          target="_blank"
          rel="noopener noreferrer"
          class="donate__card"
        >
          <span class="donate__amount">$5</span>
          <span class="donate__interval">/ month</span>
        </a>
        <a
          href="https://donate.stripe.com/aFaeVcasj5lX4R80oQgrS02"
          target="_blank"
          rel="noopener noreferrer"
          class="donate__card"
        >
          <span class="donate__amount">$15</span>
          <span class="donate__interval">/ month</span>
        </a>
        <a
          href="https://donate.stripe.com/8x2bJ0cAr9CddnE9ZqgrS03"
          target="_blank"
          rel="noopener noreferrer"
          class="donate__card"
        >
          <span class="donate__amount">$25</span>
          <span class="donate__interval">/ month</span>
        </a>
        <a
          href="https://donate.stripe.com/bIY17XcYL77c0HSdQQ"
          target="_blank"
          rel="noopener noreferrer"
          class="donate__card donate__card--custom"
        >
          <span class="donate__amount">Custom</span>
          <span class="donate__interval">one-time</span>
        </a>
      </div>
    </div>
  </section>

  <!-- Corporate sponsorship -->
  <section class="corporate">
    <div class="ih-container">
      <div class="corporate__layout">
        <div class="corporate__copy">
          <h2 class="corporate__heading">Become a corporate sponsor</h2>
          <p class="corporate__text">
            Annual corporate sponsors help Indy Hackers plan ahead and invest in
            bigger, better events for the Indiana tech community.
          </p>
          <ul class="corporate__perks">
            <li>Logo on the Indy Hackers website</li>
            <li>Shoutout at community events</li>
            <li>Mentioned in our newsletter</li>
            <li>Discounted event sponsorship</li>
          </ul>
        </div>
        <div class="corporate__cta">
          <a href="mailto:sponsors@indyhackers.org" class="ih-btn-primary">
            Get in touch
          </a>
          <span class="corporate__email">sponsors@indyhackers.org</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Current sponsors -->
  <section class="sponsors-list ih-full-bleed">
    <div class="ih-container">
      <h2 class="sponsors-list__heading">Our sponsors</h2>
      <div class="sponsors-list__grid">
        <a
          v-for="sponsor in sponsors"
          :key="sponsor.id"
          :href="sponsor.link"
          target="_blank"
          rel="noopener noreferrer"
          class="sponsor-logo"
        >
          <img
            :src="sponsor.logo"
            :alt="sponsor.name"
            class="sponsor-logo__img"
            @error="handleImageError"
          />
          
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const sponsors = ref([
  {
    id: 1,
    name: 'PureInsights',
    link: 'https://mypureinsights.com/?utm_campaign=indy_hackers',
    logo: '/images/sponsors/pureinsights.png'
  },
  {
    id: 2,
    name: 'MadeLabs',
    link: 'https://www.madelabs.io/?utm_campaign=indy_hackers',
    logo: '/images/sponsors/madelabs.png'
  },
  {
    id: 3,
    name: 'Java House',
    link: 'https://www.javahouse.com/?utm_campaign=indy_hackers',
    logo: '/images/sponsors/java_house.png'
  },
  {
    id: 4,
    name: 'E-gineering',
    link: 'https://www.e-gineering.com/?utm_campaign=indy_hackers',
    logo: '/images/sponsors/egineering-logo.png'
  },
  {
    id: 5,
    name: 'Panfactum',
    link: 'https://www.panfactum.com/?utm_campaign=indy_hackers',
    logo: '/images/sponsors/panfactum-logo.png'
  }
])

const handleImageError = (e) => {
  e.target.style.display = 'none'
}
</script>

<style scoped>
/* Hero */
.sponsors-hero {
  padding: 3rem 0;
}

.sponsors-hero__heading {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1.25rem;
}

.sponsors-hero__sub {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 38rem;
}

/* Donate */
.donate {
  padding: 3rem 0;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.donate__heading {
  margin-bottom: 0.5rem;
}

.donate__sub {
  font-size: 1rem;
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  max-width: 32rem;
}

.donate__options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.donate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1.5rem 1rem;
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: box-shadow 0.2s ease;
}

.donate__card:hover {
  box-shadow: var(--shadow-md);
}

.donate__card:active {
  transform: scale(0.98);
}

.donate__amount {
  font-family: var(--font-mono);
  font-size: 1.75rem;
  font-weight: bold;
  color: var(--text-primary);
}

.donate__interval {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.donate__card--custom .donate__amount {
  font-size: 1.25rem;
}

/* Corporate */
.corporate {
  padding: 3rem 0;
}

.corporate__layout {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  align-items: start;
}

.corporate__heading {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.corporate__text {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 32rem;
  margin: 0 0 1.25rem;
}

.corporate__perks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.corporate__perks li {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  padding-left: 1.25rem;
  position: relative;
}

.corporate__perks li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--accent-deep);
  font-weight: bold;
}

.corporate__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.corporate__email {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Sponsors list */
.sponsors-list {
  padding: 3rem 0 4rem;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.sponsors-list__heading {
  margin-bottom: 1.5rem;
}

.sponsors-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.sponsor-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  padding: 1.5rem;
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  border-radius: var(--radius-lg);
  transition: box-shadow 0.2s ease;
}

.sponsor-logo:hover {
  box-shadow: var(--shadow-md);
}

.sponsor-logo__img {
  height: 60px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}

.sponsor-logo__name {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: bold;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .donate__options {
    grid-template-columns: repeat(2, 1fr);
  }

  .corporate__layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .corporate__cta {
    align-items: flex-start;
  }
}

</style>
