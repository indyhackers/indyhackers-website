<template>
  <section class="admin-home">
    <div class="ih-container">
      <h1>Admin</h1>
      <p class="admin-home__sub">Tools for IndyHackers board members.</p>

      <div class="admin-home__tools">
        <RouterLink
          v-for="tool in tools"
          :key="tool.to"
          :to="tool.to"
          class="admin-tool"
        >
          <h2 class="admin-tool__title">{{ tool.title }}</h2>
          <p class="admin-tool__desc">{{ tool.desc }}</p>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
const tools = [
  {
    to: '/admin/slack-invites',
    title: 'Slack invite requests',
    desc: 'Approve or reject pending Slack join requests.'
  },
  {
    to: '/admin/jobs',
    title: 'Job approvals',
    desc: 'Review and publish jobs submitted to the board.'
  },
  {
    to: '/admin/console',
    title: 'PocketBase admin console',
    desc: 'Open the database admin console to manage all collections.'
  }
]
</script>

<style scoped>
.admin-home {
  padding: 3rem 0;
}

.admin-home h1 {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  margin-bottom: 0.75rem;
}

.admin-home__sub {
  color: var(--text-secondary);
  margin-bottom: 2.5rem;
}

.admin-home__tools {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1.25rem;
}

.admin-tool {
  display: block;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.1s ease;
}

.admin-tool:hover {
  border-color: var(--focus-ring);
  transform: translateY(-2px);
}

.admin-tool__title {
  font-size: 1.125rem;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.admin-tool__desc {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}
</style>
