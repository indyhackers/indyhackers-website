<template>
  <section class="newsletter-create">
    <div class="ih-container">
      <div class="newsletter-create__header">
        <div>
          <RouterLink to="/newsletter" class="newsletter-create__back">
            &larr; Back to Newsletter
          </RouterLink>
          <h1>Create Newsletter Issue</h1>
        </div>
        <span class="newsletter-create__badge">Dev Mode</span>
      </div>

      <form class="newsletter-create__form" @submit.prevent="openConfirmModal">
        <div class="newsletter-create__field">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            minlength="4"
            required
            placeholder="e.g. Kick off TechTober with us"
            @input="autoGenerateSlug"
          />
        </div>

        <div class="newsletter-create__grid">
          <div class="newsletter-create__field">
            <label for="slug">Slug (URL)</label>
            <input
              id="slug"
              v-model="form.slug"
              type="text"
              required
              placeholder="kick-off-techtober-with-us"
            />
          </div>
          <div class="newsletter-create__field">
            <label for="published_at">Published Date</label>
            <input id="published_at" v-model="form.published_at" type="datetime-local" required />
          </div>
        </div>

        <div class="newsletter-create__field">
          <label for="excerpt">Excerpt / Preview Text</label>
          <p class="newsletter-create__hint">Shown on the main newsletter page.</p>
          <textarea
            id="excerpt"
            v-model="form.excerpt"
            rows="3"
            placeholder="Summary preview that readers see before opening the full issue..."
          ></textarea>
        </div>

        <div class="newsletter-create__field">
          <label for="content">Full Issue Content</label>
          <p class="newsletter-create__hint">Rendered on the issue detail page.</p>
          <TipTapEditor v-model="form.content" />
        </div>

        <label class="newsletter-create__featured" for="featured">
          <input id="featured" v-model="form.featured" type="checkbox" />
          <span>Pin as Featured Issue (top of list)</span>
        </label>

        <div class="newsletter-create__actions">
          <p
            v-if="statusMessage"
            class="newsletter-create__status"
            :class="{ 'newsletter-create__status--error': statusIsError }"
            role="status"
            aria-live="polite"
          >
            {{ statusMessage }}
          </p>
          <button class="ih-btn-outline" type="button" @click="openPreview">
            Preview in New Tab
          </button>
          <button class="ih-btn-primary" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Publishing...' : 'Publish Issue' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showConfirmModal"
      class="newsletter-create__modal-backdrop"
      @click.self="showConfirmModal = false"
      @keydown.esc="showConfirmModal = false"
    >
      <section
        class="newsletter-create__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-confirm-title"
      >
        <h2 id="newsletter-confirm-title">Ready to publish?</h2>
        <p><strong>Title:</strong> {{ form.title }}</p>
        <p><strong>Slug:</strong> /newsletter/{{ form.slug }}</p>
        <p><strong>Featured:</strong> {{ form.featured ? 'Yes (Pinned to top)' : 'No' }}</p>
        <p class="newsletter-create__modal-note">
          Once published, this issue will immediately be visible on the public site.
        </p>
        <div class="newsletter-create__modal-actions">
          <button class="ih-btn-outline" type="button" @click="openPreview">Preview Again</button>
          <button
            class="ih-btn-outline"
            type="button"
            :disabled="isSubmitting"
            @click="showConfirmModal = false"
          >
            Cancel
          </button>
          <button
            class="ih-btn-primary"
            type="button"
            :disabled="isSubmitting"
            @click="publishConfirmed"
          >
            {{ isSubmitting ? 'Publishing...' : 'Confirm & Publish' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { inject, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TipTapEditor from '../TipTapEditor.vue'

const DRAFT_STORAGE_KEY = 'ih_newsletter_draft'

const router = useRouter()
const pocketbase = inject('pocketbase')

const isSubmitting = ref(false)
const showConfirmModal = ref(false)
const statusMessage = ref('')
const statusIsError = ref(false)

const now = new Date()
const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16)

const form = reactive({
  title: '',
  slug: '',
  published_at: localIso,
  excerpt: '',
  content: '',
  featured: false
})

onMounted(() => {
  try {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) return

    const draft = JSON.parse(savedDraft)
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      throw new Error('Saved newsletter draft has an invalid format.')
    }

    Object.assign(form, {
      title: typeof draft.title === 'string' ? draft.title : '',
      slug: typeof draft.slug === 'string' ? draft.slug : '',
      published_at: typeof draft.published_at === 'string' ? draft.published_at : form.published_at,
      excerpt: typeof draft.excerpt === 'string' ? draft.excerpt : '',
      content: typeof draft.content === 'string' ? draft.content : '',
      featured: Boolean(draft.featured)
    })
    statusMessage.value = 'Restored your saved draft.'
  } catch (err) {
    console.error('Could not restore newsletter draft:', err)
    statusIsError.value = true
    statusMessage.value = 'Could not restore the saved draft from this browser.'
  }
})

watch(
  form,
  (draft) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch (err) {
      console.error('Could not save newsletter draft:', err)
      statusIsError.value = true
      statusMessage.value = 'Could not save your draft in this browser.'
    }
  },
  { deep: true }
)

const autoGenerateSlug = () => {
  form.slug = form.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const openPreview = () => {
  statusMessage.value = ''
  statusIsError.value = false

  try {
    sessionStorage.setItem(
      'ih_newsletter_preview',
      JSON.stringify({
        title: form.title || 'Untitled Issue',
        slug: form.slug || 'preview',
        published_at: form.published_at
          ? new Date(form.published_at).toISOString()
          : new Date().toISOString(),
        excerpt: form.excerpt,
        content: form.content,
        featured: Boolean(form.featured)
      })
    )
  } catch (err) {
    console.error('Could not save newsletter preview:', err)
    statusIsError.value = true
    statusMessage.value = 'Could not prepare the preview in this browser.'
    return
  }

  const previewWindow = window.open('/newsletter/preview', '_blank')
  if (!previewWindow) {
    statusIsError.value = true
    statusMessage.value = 'The preview tab was blocked. Allow pop-ups and try again.'
  }
}

const openConfirmModal = () => {
  statusMessage.value = ''
  statusIsError.value = false

  if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
    statusIsError.value = true
    statusMessage.value = 'Title, slug, and content are required before publishing.'
    return
  }

  showConfirmModal.value = true
}

const publishConfirmed = async () => {
  isSubmitting.value = true
  showConfirmModal.value = false
  statusMessage.value = ''
  statusIsError.value = false

  try {
    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      featured: Boolean(form.featured)
    }

    // Only include link if non-empty
    if (form.link && form.link.trim() !== '') {
      payload.link = form.link.trim()
    }

    const record = await pocketbase.collection('newsletters').create(payload)
    const publishedSlug = record.slug || record.id
    if ('BroadcastChannel' in window) {
      try {
        const previewChannel = new BroadcastChannel('ih_newsletter_channel')
        previewChannel.postMessage({ type: 'POST_PUBLISHED', slug: publishedSlug })
        previewChannel.close()
      } catch (channelError) {
        console.error('Could not notify open newsletter preview tabs:', channelError)
      }
    }

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (storageError) {
      console.error('Could not clear saved newsletter draft:', storageError)
    }
    try {
      sessionStorage.removeItem('ih_newsletter_preview')
    } catch (storageError) {
      console.error('Could not clear newsletter preview data:', storageError)
    }

    statusMessage.value = 'Published successfully! Redirecting...'
    setTimeout(() => {
      router.push(`/newsletter/${publishedSlug}`)
    }, 1000)
  } catch (err) {
    console.error('PocketBase Create Error:', err.data || err)
    statusIsError.value = true

    // Unpack specific field validation errors if available
    if (err?.data?.data && Object.keys(err.data.data).length > 0) {
      const fieldErrors = Object.entries(err.data.data)
        .map(([k, v]) => `${k}: ${v.message}`)
        .join(', ')
      statusMessage.value = `Validation error: ${fieldErrors}`
    } else {
      statusMessage.value =
        err?.data?.message || err?.message || 'Failed to create newsletter issue'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.newsletter-create {
  padding: 3rem 0 4rem;
}

.newsletter-create__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.newsletter-create__header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.newsletter-create__back {
  display: inline-block;
  margin-bottom: 0.6rem;
  color: var(--focus-ring);
  text-decoration: none;
}

.newsletter-create__back:hover {
  text-decoration: underline;
}

.newsletter-create__badge {
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.newsletter-create__form {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
}

.newsletter-create__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.newsletter-create__field {
  min-width: 0;
}

.newsletter-create__field > label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.newsletter-create__field input,
.newsletter-create__field textarea {
  width: 100%;
  padding: 0.7rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  font: inherit;
}

.newsletter-create__field input:focus,
.newsletter-create__field textarea:focus {
  border-color: var(--focus-ring);
  outline: 2px solid color-mix(in srgb, var(--focus-ring) 25%, transparent);
}

.newsletter-create__field textarea {
  resize: vertical;
}

.newsletter-create__hint {
  margin: -0.15rem 0 0.5rem;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.newsletter-create__featured {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.9rem;
}

.newsletter-create__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
}

.newsletter-create__actions button + button {
  margin-left: 0.75rem;
}

.newsletter-create__actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.newsletter-create__status {
  margin: 0;
  color: var(--success);
  font-size: 0.9rem;
}

.newsletter-create__status--error {
  color: var(--danger);
}

.newsletter-create__modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 70%);
}

.newsletter-create__modal {
  width: min(100%, 32rem);
  padding: 1.75rem;
  border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
}

.newsletter-create__modal h2 {
  margin: 0 0 1.25rem;
  font-size: 1.5rem;
}

.newsletter-create__modal p {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.newsletter-create__modal-note {
  margin-top: 1rem !important;
  font-size: 0.875rem;
}

.newsletter-create__modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.newsletter-create__modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 40rem) {
  .newsletter-create__header {
    flex-direction: column;
  }

  .newsletter-create__grid {
    grid-template-columns: 1fr;
  }

  .newsletter-create__form {
    padding: 1rem;
  }

  .newsletter-create__actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
