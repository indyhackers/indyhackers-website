<template>
  <div id="app">
    <NavigationBar />
    <main>
      <RouterView class="content" />
    </main>
    <BottomLinkTree class="bottom" />
  </div>
</template>

<script>
import { RouterView } from 'vue-router'
import NavigationBar from './components/NavigationBar.vue'
import BottomLinkTree from './components/BottomLinkTree.vue'

export default {
  name: 'App',
  components: {
    NavigationBar,
    BottomLinkTree,
    RouterView
  },
  computed: {
    isLoggedIn() {
      return this.pocketbase.authStore.isValid
    },
    currentUser() {
      return this.pocketbase.authStore.model
    }
  },
  mounted() {
    // Givebutter floating donate widget
    const widget = document.createElement('givebutter-widget')
    widget.setAttribute('id', 'pdVAqB')
    document.body.appendChild(widget)

    const script = document.createElement('script')
    script.src = 'https://widgets.givebutter.com/latest.umd.cjs?acct=H4rBBvimtKt1fpCm&p=other'
    script.async = true
    document.head.appendChild(script)
  },
}
</script>

<style>
@import '@/assets/base.scss';
@import '@/styles/main.scss';
</style>

<style lang="scss">
body {
  font-size: 1rem;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 400;
  background-color: var(--surface-1);
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--surface-1);
}

main {
  flex: 1;
}

.bottom {
  margin-top: auto;
  z-index: 1;
}
</style>

