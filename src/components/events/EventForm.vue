<template>
  <b-form @submit.prevent="onSubmit">
    <b-alert v-model="alert.visible" :variant="alert.variant" dismissible>{{ alert.message }}</b-alert>

    <b-form-group label="Title" label-for="event-title">
      <b-form-input id="event-title" v-model="form.title" required />
    </b-form-group>

    <b-form-group label="Description" class="mt-3">
      <tip-tap-editor class="event-form__desc" v-model="form.description" />
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
import { reactive, ref, inject, onMounted, watch } from 'vue'
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

  emit('submit', {
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
  })
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

:deep(.event-form__desc .tiptap.ProseMirror) {
  min-height: 140px;
}
</style>
