<template>
  <section class="resources-section">
    <div class="ih-container">
      <div class="resources-card">
        <h1>{{ title }}</h1>
        <p>{{ content }}</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'Resources',
  props: {
    title: String,
    content: String
  }
}
</script>

<style scoped>
.placeholder-section {
  padding: 5rem 0;
}

.placeholder-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 3rem;
  max-width: 800px;
}

.placeholder-card h1 {
  margin-bottom: 1rem;
}

.placeholder-card p {
  font-family: 'Space Grotesk', sans-serif;
  color: var(--muted-foreground);
  font-size: 1.125rem;
}
</style>
