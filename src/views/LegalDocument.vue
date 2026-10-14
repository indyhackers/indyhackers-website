<template>
  <div class="content clearfix">
    <div class="ih-container legal-body" v-html="html"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import terms from '../../legal/terms.md?raw'
import privacy from '../../legal/privacy.md?raw'
import codeOfConduct from '../../legal/code-of-conduct.md?raw'

const documents = {
  terms,
  privacy,
  'code-of-conduct': codeOfConduct
}

const props = defineProps({
  slug: {
    type: String,
    required: true
  }
})

const markdown = new MarkdownIt({ html: false, linkify: true })
const html = computed(() => markdown.render(documents[props.slug] ?? ''))
</script>

<style scoped>
.legal-body {
  padding-top: 4rem;
  padding-bottom: 4rem;
  max-width: 820px;
}

.legal-body :deep(h1 + p) {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.legal-body :deep(h2) {
  margin-top: 2rem;
}

.legal-body :deep(h3) {
  margin-top: 1.5rem;
}

.legal-body :deep(ul) {
  margin-bottom: 1rem;
}

.legal-body :deep(li) {
  margin-bottom: 0.5rem;
}
</style>
