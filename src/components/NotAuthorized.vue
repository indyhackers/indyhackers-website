<template>
  <section class="not-authorized">
    <div class="ih-container">
      <h1>Not authorized</h1>
      <p>
        You're signed in, but your account doesn't have admin access. If you think this is
        a mistake, reach out to a board organizer.
      </p>
      <div class="not-authorized__actions">
        <RouterLink to="/" class="ih-btn-primary">Back home</RouterLink>
        <RouterLink to="/login" class="ih-btn-outline">Log in as someone else</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup></script>

<style scoped>
.not-authorized {
  padding: 4rem 0;
}

.not-authorized h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 1rem;
}

.not-authorized p {
  color: var(--text-secondary);
  max-width: 36rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.not-authorized__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
