<template>
  <main class="container mx-auto px-4 py-8 max-w-4xl">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <RouterLink to="/newsletter" class="text-sm text-primary hover:underline inline-block mb-2">
          &larr; Back to Newsletter
        </RouterLink>
        <h1 class="text-2xl font-bold">Create Newsletter Issue</h1>
      </div>
      <span class="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 font-semibold uppercase tracking-wider">
        Dev Mode
      </span>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6 bg-[var(--surface-1)] p-6 rounded-lg border border-[var(--border)]">
      <!-- Title -->
      <div>
        <label class="block text-sm font-medium mb-1" for="title">Title</label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          required
          class="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. Kick off TechTober with us"
          @input="autoGenerateSlug"
        />
      </div>

      <!-- Slug & Publication Date Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1" for="slug">Slug (URL)</label>
          <input
            id="slug"
            v-model="form.slug"
            type="text"
            required
            class="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="kick-off-techtober-with-us"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="published_at">Published Date</label>
          <input
            id="published_at"
            v-model="form.published_at"
            type="datetime-local"
            required
            class="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- Excerpt (Main Page Preview) -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium" for="excerpt">Excerpt / Preview Text</label>
          <span class="text-xs text-muted-foreground">Shown on the main /newsletter page card</span>
        </div>
        <textarea
          id="excerpt"
          v-model="form.excerpt"
          rows="3"
          class="w-full px-3 py-2 rounded border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Summary preview that readers see before clicking 'Read full issue'..."
        ></textarea>
      </div>

      <!-- Full Body (TipTap Editor) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium">Full Issue Content</label>
          <span class="text-xs text-muted-foreground">Rendered on the issue detail page</span>
        </div>
        <TipTapEditor v-model="form.content" />
      </div>

      <!-- Featured Toggle -->
      <div class="flex items-center gap-2">
        <input
          id="featured"
          v-model="form.featured"
          type="checkbox"
          class="rounded border-[var(--border)] text-primary focus:ring-primary"
        />
        <label for="featured" class="text-sm font-medium cursor-pointer">
          Pin as Featured Issue (top of list)
        </label>
      </div>

      <!-- Submit Actions -->
      <div class="pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <span v-if="statusMessage" :class="statusIsError ? 'text-red-500' : 'text-green-500'" class="text-sm font-medium">
          {{ statusMessage }}
        </span>
        <div v-else></div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-5 py-2.5 rounded bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {{ isSubmitting ? 'Publishing...' : 'Publish Issue' }}
        </button>
      </div>
    </form>
  </main>
</template>

<script setup>
import { reactive, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import TipTapEditor from '@/components/TipTapEditor.vue'

const router = useRouter()
const pocketbase = inject('pocketbase')

const isSubmitting = ref(false)
const statusMessage = ref('')
const statusIsError = ref(false)

// Default published_at to current local date/time in YYYY-MM-DDTHH:mm
const now = new Date()
const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const form = reactive({
  title: '',
  slug: '',
  published_at: localIso,
  excerpt: '',
  content: '',
  featured: false
})

const autoGenerateSlug = () => {
  form.slug = form.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const handleSubmit = async () => {
  isSubmitting.value = true
  statusMessage.value = ''
  statusIsError.value = false

  try {
    // Format timestamp as "YYYY-MM-DD HH:MM:SS.000Z" for PocketBase
    const pubDate = new Date(form.published_at).toISOString().replace('T', ' ')

    const record = await pocketbase.collection('newsletters').create({
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      published_at: pubDate,
      featured: form.featured,
      link: ''
    })

    statusMessage.value = 'Published successfully! Redirecting...'
    setTimeout(() => {
      router.push(`/newsletter/${record.slug || record.id}`)
    }, 1000)
  } catch (err) {
    statusIsError.value = true
    statusMessage.value = err?.data?.message || err?.message || 'Failed to create newsletter issue'
  } finally {
    isSubmitting.value = false
  }
}
</script>
