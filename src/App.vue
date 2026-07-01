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
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  ORGANIZATION_SCHEMA,
  jsonLd,
  pageTitle,
  canonicalUrl
} from '@/seo'

export default {
  name: 'App',
  components: {
    NavigationBar,
    BottomLinkTree,
    RouterView
  },
  // Site-wide, route-driven document head. Each route supplies its own
  // `meta.title` / `meta.description` (see router); pages with dynamic content
  // (e.g. a single job listing) override title/description via their own
  // `head()` option, which unhead dedupes so the more specific page wins.
  head() {
    const meta = this.$route.meta || {}
    const title = pageTitle(meta.title)
    const description = meta.description || DEFAULT_DESCRIPTION
    const url = canonicalUrl(this.$route.path)
    return {
      title,
      link: [{ rel: 'canonical', href: url }],
      meta: [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:image', content: DEFAULT_OG_IMAGE },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: DEFAULT_OG_IMAGE }
      ],
      // Site-wide Organization structured data.
      script: [jsonLd(ORGANIZATION_SCHEMA, 'ld-organization')]
    }
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

