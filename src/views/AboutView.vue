<template>
  <!-- Story -->
  <section class="about-hero">
    <div class="ih-container">
      <h1 class="about-hero__heading">About Indy Hackers</h1>
      <div class="about-hero__columns">
        <div class="about-hero__story">
          <p>
            In 2017, a few Ruby developers in Indianapolis started meeting for coffee.
            No agenda, no sponsors, just people who liked building things and wanted to
            know who else was doing the same.
          </p>
          <p>
            That group grew. Language-specific meetups spun up, then cross-discipline ones.
            Today, Indy Hackers is 3,000 members strong across Slack, with dozens of
            meetups a year and a community that spans languages and technologies.
          </p>
          <p>
            We're volunteer-run and always will be. If you build things in Indiana,
            you're one of us.
          </p>
          <div class="about-hero__mission">
            <h2 class="about-hero__mission-heading">Our mission</h2>
            <p class="about-hero__mission-text">
              IndyHackers strives to help tech people in Indiana grow by fostering
              community connections and celebrating individual successes.
            </p>
          </div>
        </div>
        <div class="about-hero__coc">
          <h2 class="about-hero__coc-heading">Code of Conduct</h2>
          <p class="about-hero__coc-text">
            Everyone deserves to feel welcome here. Our Code of Conduct spells out what that means.
          </p>
          <RouterLink to="/code-of-conduct" class="about-hero__coc-link">
            Read it here →
          </RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- Board -->
  <section class="board ih-full-bleed">
    <div class="ih-container">
      <h2 class="board__heading">Board Members</h2>
      <div class="board__grid">
        <BoardMemberCard
          firstName="Andrew"
          lastName="Poland"
          imageUrl="/images/board/andrew.jpeg"
          linkedin="https://www.linkedin.com/in/polandandrew"
        />
        <BoardMemberCard
          firstName="Ben"
          lastName="Cochran"
          title="Vice President"
          imageUrl="/images/board/ben.jpg"
          email="mailto:ben@indyhackers.org"
          linkedin="https://www.linkedin.com/in/cochranb"
        />
        <BoardMemberCard
          firstName="Chris"
          lastName="Vannoy"
          title="President"
          imageUrl="/images/board/chris.jpeg"
          linkedin="https://www.linkedin.com/in/cvannoy"
        />
        <BoardMemberCard
          firstName="Josh"
          lastName="Hurst"
          title="Treasurer"
          imageUrl="/images/board/joshhurst.jpg"
          linkedin="https://www.linkedin.com/in/josh-hurst42"
        />
        <BoardMemberCard
          firstName="Katie"
          lastName="Hughes"
          title="Secretary"
          imageUrl="/images/board/katiehughes.jpg"
          email="mailto:katie@indyhackers.org"
          linkedin="https://www.linkedin.com/in/katiehughes"
        />
        <BoardMemberCard
          firstName="Michael"
          lastName="Welling"
          imageUrl="/images/board/michaelwelling.jpg"
          linkedin="https://www.linkedin.com/in/mewelling"
        />
        <BoardMemberCard
          firstName="Mike"
          lastName="Hockerman"
          imageUrl="/images/board/mikehockerman.png"
          linkedin="https://www.linkedin.com/in/mhoc"
        />
        <BoardMemberCard
          firstName="Nicole"
          lastName="Dobias"
          imageUrl="/images/board/nichole.jpeg"
          email="mailto:nicole@indyhackers.org"
          linkedin="https://www.linkedin.com/in/nicole-dobias"
        />
        <BoardMemberCard
          firstName="Stanton"
          lastName="Sievers"
          imageUrl="/images/board/stantonsievers.jpeg"
          linkedin="https://www.linkedin.com/in/stantonsievers"
        />
      </div>
    </div>
  </section>

</template>

<script setup>
import BoardMemberCard from '@/components/about/BoardMemberCard.vue'
</script>

<style scoped>
/* Story */
.about-hero {
  padding: 3rem 0 4rem;
}

.about-hero__heading {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1.25rem;
}

.about-hero__columns {
  display: grid;
  grid-template-columns: 1fr 20rem;
  gap: 3rem;
  align-items: start;
}

.about-hero__story {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.about-hero__story p {
  font-size: 1.125rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
}

.about-hero__mission {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
}

.about-hero__mission-heading {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-deep);
  margin: 0 0 0.5rem;
}

.about-hero__mission-text {
  font-size: 1.125rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
}

.about-hero__coc {
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
}

.about-hero__coc-heading {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.about-hero__coc-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

.about-hero__coc-link {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--accent-deep);
  text-decoration: none;
}

.about-hero__coc-link:hover {
  color: var(--text-primary);
}

/* Board */
.board {
  padding: 4rem 0 5rem;
  background: var(--surface-2);
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.board__heading {
  margin-bottom: 2.5rem;
}

.board__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem 2rem;
}

@media (max-width: 768px) {
  .about-hero {
    padding: 5rem 0 3rem;
  }

  .about-hero__columns {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .board__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem 1.5rem;
  }
}
</style>
