<template>
  <b-form @submit.prevent="onSubmit">
    <b-alert v-model="alert.visible" :variant="alert.variant" dismissible>{{ alert.message }}</b-alert>

    <b-form-group label="Title" label-for="event-title">
      <b-form-input id="event-title" v-model="form.title" required />
    </b-form-group>

    <b-form-group label="Description" class="mt-3">
      <tip-tap-editor class="event-form__desc" v-model="form.description" />
    </b-form-group>

    <b-form-group label="Cover image (optional)" label-for="event-image" class="mt-3">
      <p class="event-form__hint">
        Shown on the grid view of the calendar. Landscape images look best (16:9, up to 5 MB).
        Without one, we draw a placeholder from the event's topic.
      </p>

      <div v-if="imagePreview" class="event-form__image">
        <img :src="imagePreview" alt="Cover image preview" class="event-form__image-preview" />
        <b-button size="sm" variant="tertiary" type="button" @click="removeImage">Remove</b-button>
      </div>

      <input
        id="event-image"
        ref="imageInput"
        class="form-control"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        @change="onImagePicked"
      />
    </b-form-group>

    <b-row class="mt-3">
      <b-col md="6">
        <b-form-group label="Location" label-for="event-location">
          <b-form-input id="event-location" v-model="form.location" placeholder="Venue and address" />
        </b-form-group>
      </b-col>
      <b-col md="6">
        <b-form-group label="Link (optional)" label-for="event-url">
          <b-form-input id="event-url" v-model="form.url" type="url" placeholder="https://…" />
        </b-form-group>
      </b-col>
    </b-row>

    <b-form-group class="mt-2">
      <b-form-checkbox v-model="form.all_day">All-day event</b-form-checkbox>
    </b-form-group>

    <b-row>
      <b-col md="6">
        <b-form-group :label="form.all_day ? 'Start date' : 'Starts'" label-for="event-start">
          <b-form-input
            id="event-start"
            v-model="form.startLocal"
            :type="form.all_day ? 'date' : 'datetime-local'"
            required
          />
        </b-form-group>
      </b-col>
      <b-col md="6">
        <b-form-group :label="form.all_day ? 'End date (optional)' : 'Ends (optional)'" label-for="event-end">
          <b-form-input
            id="event-end"
            v-model="form.endLocal"
            :type="form.all_day ? 'date' : 'datetime-local'"
          />
        </b-form-group>
      </b-col>
    </b-row>

    <b-form-group label="Topics" class="mt-2">
      <p class="event-form__hint">Tag the technologies or areas this event covers.</p>
      <div class="event-form__topics">
        <b-form-checkbox
          v-for="topic in topics"
          :key="topic.id"
          v-model="form.topics"
          :value="topic.id"
          inline
        >
          {{ topic.name }}
        </b-form-checkbox>
      </div>
    </b-form-group>

    <div class="event-form__actions mt-3">
      <b-button variant="tertiary" type="button" :disabled="busy" @click="$emit('cancel')">Cancel</b-button>
      <b-button variant="primary" type="submit" class="ms-2" :disabled="busy">
        {{ busy ? 'Saving…' : submitLabel }}
      </b-button>
    </div>
  </b-form>
</template>

<script setup>
import { computed, reactive, ref, inject, onMounted, onBeforeUnmount, watch } from 'vue'
import TipTapEditor from '../TipTapEditor.vue'

const props = defineProps({
  // Existing event record to prefill (edit mode); null for a new submission.
  event: { type: Object, default: null },
  submitLabel: { type: String, default: 'Submit' },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['submit', 'cancel'])

const pocketbase = inject('pocketbase')
const topics = ref([])

const alert = reactive({ visible: false, variant: 'danger', message: '' })

// Cover image. Three states the payload has to distinguish:
//   newImage set        -> upload this File
//   imageCleared        -> send null so PocketBase deletes the stored file
//   neither             -> leave the field out entirely and keep what's there
const imageInput = ref(null)
const newImage = ref(null)
const imageCleared = ref(false)
const existingImageUrl = ref('')
// Object URL for the locally picked file, revoked when it's replaced so the
// preview doesn't leak blobs across repeated picks.
const localPreview = ref('')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const imagePreview = computed(() => localPreview.value || (imageCleared.value ? '' : existingImageUrl.value))

function releaseLocalPreview() {
  if (localPreview.value) {
    URL.revokeObjectURL(localPreview.value)
    localPreview.value = ''
  }
}

function onImagePicked(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  if (file.size > MAX_IMAGE_BYTES) {
    event.target.value = ''
    return fail('That image is larger than 5 MB. Please pick a smaller one.')
  }
  releaseLocalPreview()
  newImage.value = file
  imageCleared.value = false
  localPreview.value = URL.createObjectURL(file)
}

function removeImage() {
  releaseLocalPreview()
  newImage.value = null
  // Only a stored image needs an explicit delete; discarding an unsaved pick
  // just resets the field.
  imageCleared.value = !!existingImageUrl.value
  if (imageInput.value) imageInput.value.value = ''
}

onBeforeUnmount(releaseLocalPreview)

// A datetime stored as ISO needs to render in the browser-local <input> value
// format (YYYY-MM-DDTHH:mm), and vice versa on save.
function isoToLocalInput(iso, allDay) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (allDay) return date
  return `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

const form = reactive({
  title: '',
  description: '',
  location: '',
  url: '',
  all_day: false,
  startLocal: '',
  endLocal: '',
  topics: []
})

function prefill(record) {
  if (!record) return
  form.title = record.title || ''
  form.description = record.description || ''
  form.location = record.location || ''
  form.url = record.url || ''
  form.all_day = !!record.all_day
  form.startLocal = isoToLocalInput(record.starts_at, form.all_day)
  form.endLocal = isoToLocalInput(record.ends_at, form.all_day)
  // topics can arrive as an array of ids or expanded records.
  const t = record.topics || []
  form.topics = t.map((x) => (typeof x === 'object' ? x.id : x))

  releaseLocalPreview()
  newImage.value = null
  imageCleared.value = false
  existingImageUrl.value = record.image ? fileUrl(record, record.image) : ''
  if (imageInput.value) imageInput.value.value = ''
}

// The stored cover needs the client's baseURL to render; a test double without
// a file service just shows no preview.
function fileUrl(record, filename) {
  try {
    return pocketbase.files.getURL(record, filename) || ''
  } catch {
    return ''
  }
}

watch(() => props.event, prefill, { immediate: true })

onMounted(async () => {
  try {
    topics.value = await pocketbase.collection('topics').getFullList({ sort: 'name' })
  } catch (err) {
    console.error('Could not load topics:', err)
  }
})

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, '').trim()
}

function onSubmit() {
  alert.visible = false

  if (!form.title.trim()) {
    return fail('Please give the event a title.')
  }
  if (!form.startLocal) {
    return fail('Please choose when the event starts.')
  }
  const starts_at = localInputToIso(form.startLocal)
  const ends_at = form.endLocal ? localInputToIso(form.endLocal) : ''
  if (ends_at && new Date(ends_at) < new Date(starts_at)) {
    return fail('The end time is before the start time.')
  }

  const payload = {
    title: form.title.trim(),
    // Keep empty descriptions empty rather than "<p></p>".
    description: stripTags(form.description) ? form.description : '',
    location: form.location.trim(),
    url: form.url.trim(),
    all_day: form.all_day,
    starts_at,
    ends_at,
    status: 'confirmed',
    topics: form.topics
  }

  // A File here makes the SDK send the whole payload as multipart; null tells
  // PocketBase to drop the stored file. Untouched images send neither.
  if (newImage.value) payload.image = newImage.value
  else if (imageCleared.value) payload.image = null

  emit('submit', payload)
}

function fail(message) {
  alert.message = message
  alert.variant = 'danger'
  alert.visible = true
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Let the parent surface a server-side error on the same alert.
defineExpose({ showError: fail })
</script>

<style scoped>
.event-form__hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}

.event-form__topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.event-form__actions {
  text-align: right;
}

.event-form__image {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.event-form__image-preview {
  width: 200px;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
}

:deep(.event-form__desc .tiptap.ProseMirror) {
  min-height: 140px;
}
</style>
