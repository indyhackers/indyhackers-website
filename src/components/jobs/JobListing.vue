<template>
  <div class="job-view">
    <div class="ih-container">
      <div class="job-content">
        <div v-if="isPreview" class="preview-banner">
          Preview — this posting hasn't been published yet.
        </div>
        <b-card class="job-card">
          <h2 class="job-title">{{ job.title }}</h2>
          <p class="company-name">{{ job.company }}</p>
          <div class="salary-info">
            <b-badge class="salary-badge">{{ salary }}</b-badge>
          </div>
          <p class="subtitle">Posted {{ formattedDate }}</p>

          <div class="job-description" v-html="sanitizedDescription"></div>
          <div class="how-to-apply" v-if="job.how_to_apply">
            <p class="how-to-apply-title">How to apply:</p>
            <div class="job-how-to-apply" v-html="sanitizedHowToApply"></div>
          </div>
        </b-card>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import DOMPurify from 'dompurify'

export default defineComponent({
  name: 'JobView',
  props: {},
  components: [],
  data() {
    return {
      job: {
        title: '',
        company: '',
        salary_min: 0,
        salary_max: 0,
        description: '',
        how_to_apply: ''
      }
    }
  },
  methods: {
    async fetchJob(jobId) {
      try {
        const job = await this.pocketbase.collection('jobs').getOne(jobId)
        this.job = job
      } catch (error) {
        console.error('Error fetching job:', error)
      }
    }
  },
  computed: {
    isPreview() {
      return !!this.$route.query.preview
    },
    formattedDate() {
      const job = this.job
      if (job.approved_at != null && job.approved_at !== '') {
        const date = new Date(job.approved_at)
        return new Intl.DateTimeFormat('en-US', {
          dateStyle: "medium"
        }).format(date)
      } else {
        return ''
      }
    },
    salary() {
      const j = this.job
      if (j.salary_max != 0 && j.salary_min != 0) {
        return `$${j.salary_min}-${j.salary_max}K`
      } else if (j.salary_min != 0 && j.salary_max == 0) {
        return `$${j.salary_min}K (min)`
      } else if (j.salary_min == 0 && j.salary_max != 0) {
        return `$${j.salary_max}K (max)`
      } else {
        return null
      }
    },
    sanitizedDescription() {
      return DOMPurify.sanitize(this.job.description)
    },
    sanitizedHowToApply() {
      return DOMPurify.sanitize(this.job.how_to_apply)
    }
  },
  mounted() {
    const jobId = this.$route.query.id
    if (jobId) {
      this.fetchJob(jobId)
    } else {
      console.error('No jobId provided in query parameters.')
    }
  }
})
</script>

<style scoped>
.job-view {
  background-color: var(--surface-2);
  padding-bottom: 3rem;
}

.job-content {
  max-width: 800px;
  margin: 4rem auto 0;
}

.preview-banner {
  background: var(--accent-deep);
  color: var(--surface-1);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: bold;
  text-align: center;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.job-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border) !important;
  background: var(--surface-1) !important;
  padding: 2rem;
  transition: box-shadow 0.2s ease;
}

.job-card:hover {
  box-shadow: var(--shadow-md);
}

.job-card:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.job-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.company-name {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.subtitle {
  color: var(--text-muted);
}

.salary-info {
  margin-bottom: 1rem;
}

.salary-badge {
  background-color: var(--accent-deep) !important;
  color: var(--surface-1) !important;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
}

.job-description,
.job-how-to-apply {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.how-to-apply-title {
  margin-top: 1.5rem;
  margin-bottom: 0;
  font-weight: bold;
  font-size: 1.2rem;
  color: var(--text-primary);
}
</style>
