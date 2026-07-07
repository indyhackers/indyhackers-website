<template>
  <div class="manage-job">
    <div class="ih-container">
      <div class="manage-job-content">
        <h1 class="title">Manage Your Job Post</h1>

        <b-alert :model-value="!!error" variant="danger">{{ error }}</b-alert>
        <b-alert v-model="notice.visible" :variant="notice.variant" dismissable>{{
          notice.message
        }}</b-alert>

        <p v-if="loading" class="subtitle">Loading…</p>

        <div v-else-if="job">
          <b-card class="form-card">
            <b-alert :model-value="job.filled" variant="warning">
              This post is marked as <strong>filled</strong> and is hidden from the public job board.
            </b-alert>

            <b-form @submit.prevent="save">
              <b-row>
                <b-col md="6">
                  <b-form-group label="Job Title" label-for="input-title">
                    <b-form-input id="input-title" v-model="formData.title" required></b-form-input>
                  </b-form-group>
                </b-col>
                <b-col md="6">
                  <b-form-group label="Company" label-for="input-company">
                    <b-form-input id="input-company" v-model="formData.company" required></b-form-input>
                  </b-form-group>
                </b-col>
              </b-row>

              <b-row class="mt-3">
                <b-form-group label="Salary Range (Optional)" class="w-100">
                  <div class="d-flex align-items-center">
                    <b-input-group append="K" class="w-auto" style="max-width: 120px;">
                      <b-form-input type="number" id="input-salary-min" v-model="formData.salary_min" :min="0" :max="1000"></b-form-input>
                    </b-input-group>
                    <span class="mx-2">-</span>
                    <b-input-group append="K" class="w-auto" style="max-width: 120px;">
                      <b-form-input type="number" id="input-salary-max" v-model="formData.salary_max" :min="0" :max="1000"></b-form-input>
                    </b-input-group>
                  </div>
                </b-form-group>
              </b-row>

              <b-row class="mt-3">
                <b-col cols="12">
                  <b-form-group label="Description">
                    <tip-tap-editor class="tip-tap-description" v-model="formData.description" />
                  </b-form-group>
                </b-col>
              </b-row>
              <b-row class="mt-3">
                <b-col cols="12">
                  <b-form-group label="How to Apply">
                    <tip-tap-editor class="tip-tap-how-to-apply" v-model="formData.how_to_apply" />
                  </b-form-group>
                </b-col>
              </b-row>

              <b-row class="mt-3">
                <b-col cols="12" class="d-flex justify-content-between">
                  <b-button
                    v-if="!job.filled"
                    variant="outline-danger"
                    type="button"
                    :disabled="saving"
                    @click="markFilled"
                  >Mark as filled / take down</b-button>
                  <b-button
                    v-else
                    variant="outline-secondary"
                    type="button"
                    :disabled="saving"
                    @click="relist"
                  >Re-list this job</b-button>

                  <b-button variant="primary" type="submit" :disabled="saving">Save changes</b-button>
                </b-col>
              </b-row>
            </b-form>
          </b-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import TipTapEditor from '../TipTapEditor.vue'

export default defineComponent({
  name: 'ManageJobView',
  components: { TipTapEditor },
  data() {
    return {
      token: '',
      job: null,
      loading: true,
      saving: false,
      error: '',
      formData: {
        title: '',
        company: '',
        salary_min: 0,
        salary_max: 0,
        description: '',
        how_to_apply: ''
      },
      notice: { message: '', visible: false, variant: 'success' }
    }
  },
  methods: {
    async load() {
      this.token = this.$route.query.token || ''
      if (!this.token) {
        this.error = 'This management link is missing its token. Please use the link from your approval email.'
        this.loading = false
        return
      }
      try {
        const job = await this.pocketbase.send(`/api/jobs/manage/${encodeURIComponent(this.token)}`, {
          method: 'GET'
        })
        this.setJob(job)
      } catch (err) {
        console.error('Error loading job:', err)
        this.error = 'We couldn\'t find a job for this link. It may have been removed, or the link may be incorrect.'
      } finally {
        this.loading = false
      }
    },
    setJob(job) {
      this.job = job
      this.formData = {
        title: job.title || '',
        company: job.company || '',
        salary_min: job.salary_min || 0,
        salary_max: job.salary_max || 0,
        description: job.description || '',
        how_to_apply: job.how_to_apply || ''
      }
    },
    validate() {
      if (Number(this.formData.salary_max) < Number(this.formData.salary_min) && Number(this.formData.salary_max) > 0) {
        throw new Error('Minimum salary is greater than maximum')
      }
      if (this.formData.description == null || this.formData.description.replace(/<[^>]*>/g, '').trim().length === 0) {
        throw new Error('Job description is empty')
      }
      if (this.formData.how_to_apply == null || this.formData.how_to_apply.replace(/<[^>]*>/g, '').trim().length === 0) {
        throw new Error('How to apply details are empty')
      }
    },
    async patch(body, successMessage) {
      this.saving = true
      try {
        const updated = await this.pocketbase.send(`/api/jobs/manage/${encodeURIComponent(this.token)}`, {
          method: 'PATCH',
          body
        })
        this.setJob(updated)
        this.showNotice(successMessage, 'success')
      } catch (err) {
        const message = err?.response?.message || err?.message || 'Something went wrong'
        this.showNotice(`Error: ${message}`, 'danger')
      } finally {
        this.saving = false
      }
    },
    async save() {
      try {
        this.validate()
      } catch (err) {
        this.showNotice(`Error: ${err.message}`, 'danger')
        return
      }
      await this.patch(
        {
          title: this.formData.title,
          company: this.formData.company,
          salary_min: Number(this.formData.salary_min),
          salary_max: Number(this.formData.salary_max),
          description: this.formData.description,
          how_to_apply: this.formData.how_to_apply
        },
        'Your changes have been saved.'
      )
    },
    async markFilled() {
      if (!window.confirm('Mark this job as filled? It will be removed from the public job board.')) {
        return
      }
      await this.patch({ filled: true }, 'Your job has been taken down.')
    },
    async relist() {
      await this.patch({ filled: false }, 'Your job has been re-listed.')
    },
    showNotice(message, variant) {
      this.notice = { message, visible: true, variant }
      try {
        window.scrollTo({ top: 0 })
      } catch {
        /* jsdom / unsupported environments */
      }
    }
  },
  mounted() {
    this.load()
  }
})
</script>

<style scoped>
.manage-job {
  background-color: var(--surface-2);
  padding: 3rem 0;
}
.manage-job-content {
  max-width: 800px;
  margin: 0 auto;
}
.form-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border) !important;
  background: var(--surface-1) !important;
  padding: 2rem;
}
.title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 1rem;
}
.subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
}
:deep(.tip-tap-description .tiptap.ProseMirror) {
  min-height: 150px;
}
:deep(.tip-tap-how-to-apply .tiptap.ProseMirror) {
  min-height: 75px;
}
</style>
