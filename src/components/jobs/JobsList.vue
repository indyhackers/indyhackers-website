<template>
  <div class="job-board">
    <div class="ih-container">
      <h1 class="title">Indy Tech Jobs</h1>
      <p class="subtitle">
        Have an open position at your company? It is completely free to submit a job to our job
        board! Each job remains published for 60 days, and will be included in our newsletter
        while published.
      </p>
      <div class="mt-3 mb-2">
        <router-link to="/jobs/new" class="ih-btn-primary">Add New Job</router-link>
      </div>
      <div v-for="job in jobs" :key="job.id" class="mb-3 mt-3">
        <b-card :title="job.title" class="job-card" @click="viewJob(job)"
          tabindex="0" role="button" :aria-label="job.title"
          @keydown.enter="viewJob(job)" @keydown.space.prevent="viewJob(job)">
          <p class="company">{{ job.company }}</p>
          <b-badge class="salary-badge">{{ salary(job) }}</b-badge>
        </b-card>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'JobBoard',
  data() {
    return {
      jobs: []
    }
  },
  methods: {
    async fetchJobs() {
      try {
        const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        const jobs = await this.pocketbase.collection('jobs').getList(
          1, 100,{
            sort: '-approved_at',
            filter: `approved = true && filled != true && approved_at != "" && approved_at >= "${cutoff}"`
        })
        this.jobs = jobs.items
      } catch (error) {
        console.error('Error fetching jobs:', error)
      }
    },
    salary(j) {
      //TODO: to locale string? probably not necessary
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
    viewJob(job) {
      this.$router.push({ path: `/job`, query: { id: job.id } })
    }
  },
  mounted() {
    this.fetchJobs()
  }
})
</script>

<style scoped>
.job-board {
  background-color: var(--surface-2);
  padding: 3rem 0;
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
.job-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border) !important;
  background: var(--surface-1) !important;
  padding: 1rem;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  cursor: pointer;
}
.job-card:hover {
  background-color: var(--surface-hover) !important;
  box-shadow: var(--shadow-lg);
}
.job-card:active {
  transform: scale(0.995);
}
.job-card:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.company {
  font-size: 1.1rem;
  color: var(--text-muted);
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
</style>
