<template>
  <div class="auth-layout">
    <b-card class="auth-card">
      <h1>{{ title }}</h1>
      <slot></slot>
    </b-card>
  </div>
</template>

<script>
import { BCard } from 'bootstrap-vue-next'

export default {
  components: { BCard },
  props: {
    title: {
      type: String,
      required: true
    }
  }
}
</script>

<style>
.auth-layout {
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.auth-card {
  border-radius: 12px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s;
}

.auth-layout h1 {
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.5rem;
}

.auth-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
