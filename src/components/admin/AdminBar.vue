<template>
  <div class="admin-bar">
    <RouterLink v-if="!isHome" to="/admin" class="admin-bar__back">← Admin</RouterLink>
    <span v-else></span>
    <button type="button" class="ih-btn-outline admin-bar__logout" @click="logout">Log out</button>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  isHome: { type: Boolean, default: false }
})

const pocketbase = inject('pocketbase')
const router = useRouter()

const logout = () => {
  pocketbase.authStore.clear()
  router.push('/login')
}
</script>

<style scoped>
.admin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.admin-bar__back {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--accent-deep);
  text-decoration: none;
}

.admin-bar__back:hover {
  color: var(--text-primary);
}

.admin-bar__logout {
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
}
</style>
