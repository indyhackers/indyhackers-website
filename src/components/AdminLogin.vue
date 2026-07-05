<template>
  <b-container class="py-5">
    <b-card>
      <b-card-title>Admin Login</b-card-title>
      <b-card-body>
        <b-form @submit.prevent="promoteToAdmin">
          <b-button type="submit" variant="primary" :disabled="loading">
            Promote to Admin
          </b-button>
        </b-form>
        <b-alert v-if="errorMessage" variant="danger" dismissible>{{ errorMessage }}</b-alert>
      </b-card-body>
    </b-card>
  </b-container>
</template>

<script>
import { ref, inject, onMounted } from 'vue'

export default {
  name: 'AdminLogin',
  setup() {
    const loading = ref(false)
    const errorMessage = ref('')
    const pocketbase = inject('pocketbase')

    onMounted(() => {
      promoteToAdmin()
    })

    const promoteToAdmin = async () => {
      loading.value = true
      errorMessage.value = ''

      try {
        const response = await fetch('/api/admin/promote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pocketbase.authStore.token
          },
          body: JSON.stringify({ hello: 'moto' })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Unknown error')
        }

        // The promote endpoint ensures this user has a _superusers record so
        // they can reach the console. We intentionally do NOT persist the
        // returned superuser token in web storage: a superuser JWT sitting in
        // localStorage is readable by any XSS on the page and would escalate
        // straight to full backend compromise. (Nothing read this key anyway —
        // PocketBase's admin console manages its own auth.) Hand off to /_/.
        window.location.href = '/_/'
      } catch (error) {
        errorMessage.value = error.message || 'Failed to promote user to admin'
      } finally {
        loading.value = false
      }
    }

    return {
      loading,
      errorMessage,
      promoteToAdmin
    }
  }
}
</script>

<style scoped>
.b-card {
  max-width: 600px;
  margin: 0 auto;
}
</style>
