<template>
  <div class="job-view">
    <div class="ih-container">
      <div class="job-content">
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
import { SITE_NAME, jsonLd } from '@/seo'

export default defineComponent({
  name: 'JobView',
  props: {},
  components: [],
  // Per-job document head, overriding App.vue's generic "Job Listing" title
  // once the job has loaded so each listing has a distinct, indexable title
  // and description.
  head() {
    if (!this.job?.title) return {}
    const label = this.job.company ? `${this.job.title} at ${this.job.company}` : this.job.title
    const title = `${label} · ${SITE_NAME}`
    const description = this.plainDescription
    return {
      title,
      meta: [
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description }
      ],
      // JobPosting structured data → eligible for the Google Jobs rich result.
      script: [jsonLd(this.jobPostingSchema, 'ld-jobposting')]
    }
  },
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
    // Plain-text, length-capped version of the description for use as the meta
    // description / OG description (search + social snippets).
    plainDescription() {
      const text = DOMPurify.sanitize(this.job.description, { ALLOWED_TAGS: [] })
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) return `${this.job.title} at ${this.job.company} — apply via IndyHackers.`
      return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
    },
    // ISO date (YYYY-MM-DD) the posting went live — required by Google for
    // JobPosting. Falls back to the created date if not yet approved.
    datePostedIso() {
      const raw = this.job.approved_at || this.job.created
      if (!raw) return undefined
      const date = new Date(raw)
      return isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
    },
    // schema.org MonetaryAmount for the salary range, or null when unknown.
    // Stored values are in thousands of USD/year.
    baseSalarySchema() {
      const { salary_min: min, salary_max: max } = this.job
      if (!min && !max) return null
      const value = { '@type': 'QuantitativeValue', unitText: 'YEAR' }
      if (min) value.minValue = min * 1000
      if (max) value.maxValue = max * 1000
      if (min && !max) value.value = min * 1000
      if (max && !min) value.value = max * 1000
      return { '@type': 'MonetaryAmount', currency: 'USD', value }
    },
    // JobPosting structured data for this listing. schema.org allows HTML in
    // `description`, and Google recommends the full (sanitized) description.
    jobPostingSchema() {
      const job = this.job
      if (!job?.title) return null
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: job.title,
        description: this.sanitizedDescription || job.title,
        hiringOrganization: {
          '@type': 'Organization',
          name: job.company || SITE_NAME
        },
        // The board serves the Indianapolis area; used as the default location
        // since listings don't carry a per-job location field.
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Indianapolis',
            addressRegion: 'IN',
            addressCountry: 'US'
          }
        }
      }
      if (this.datePostedIso) schema.datePosted = this.datePostedIso
      if (this.baseSalarySchema) schema.baseSalary = this.baseSalarySchema
      return schema
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
