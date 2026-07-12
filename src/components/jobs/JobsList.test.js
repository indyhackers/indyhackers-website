import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import JobsList from './JobsList.vue'

const mockJobs = [
  {
    id: 'job1',
    title: 'Senior Developer',
    company: 'Acme Corp',
    salary_min: 100,
    salary_max: 150,
    approved: true,
    created: '2025-01-15T12:00:00.000Z'
  },
  {
    id: 'job2',
    title: 'Designer',
    company: 'Design Co',
    salary_min: 80,
    salary_max: 0,
    approved: true,
    created: '2025-01-10T12:00:00.000Z'
  },
  {
    id: 'job3',
    title: 'Intern',
    company: 'Startup Inc',
    salary_min: 0,
    salary_max: 40,
    approved: true,
    created: '2025-01-05T12:00:00.000Z'
  },
  {
    id: 'job4',
    title: 'Volunteer',
    company: 'Nonprofit',
    salary_min: 0,
    salary_max: 0,
    approved: true,
    created: '2025-01-01T12:00:00.000Z'
  }
]

function createMockPocketBase(jobs = mockJobs) {
  return {
    collection: vi.fn().mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: jobs })
    })
  }
}

function createMockRouter() {
  return {
    push: vi.fn()
  }
}

function mountJobsList(pb, router) {
  return mount(JobsList, {
    global: {
      config: {
        globalProperties: {
          pocketbase: pb,
          $router: router
        }
      },
      stubs: {
        'b-container': { template: '<div><slot /></div>' },
        'b-row': { template: '<div><slot /></div>' },
        'b-col': { template: '<div><slot /></div>' },
        'b-card': {
          template: '<div class="b-card" @click="$emit(\'click\')"><slot /></div>',
          props: ['title']
        },
        'b-badge': { template: '<span class="b-badge"><slot /></span>' },
        'router-link': { template: '<a><slot /></a>', props: ['to'] }
      }
    }
  })
}

describe('JobsList', () => {
  let pb, router

  beforeEach(() => {
    pb = createMockPocketBase()
    router = createMockRouter()
  })

  it('fetches approved jobs within 60-day window sorted by -approved_at', async () => {
    mountJobsList(pb, router)
    await flushPromises()

    const collection = pb.collection
    expect(collection).toHaveBeenCalledWith('jobs')

    const getList = collection.mock.results[0].value.getList
    const callArgs = getList.mock.calls[0]
    expect(callArgs[0]).toBe(1)
    expect(callArgs[1]).toBe(100)
    expect(callArgs[2].sort).toBe('-approved_at')
    expect(callArgs[2].filter).toContain('approved = true')
    expect(callArgs[2].filter).toContain('approved_at != ""')
    expect(callArgs[2].filter).toContain('approved_at >= "')
    expect(callArgs[2].filter).not.toMatch(/\{:/)
    expect(callArgs[2].filterParams).toBeUndefined()
  })

  it('renders a card for each job with title and company', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const cards = wrapper.findAll('.b-card')
    expect(cards).toHaveLength(4)

    expect(cards[0].text()).toContain('Acme Corp')
    expect(cards[1].text()).toContain('Design Co')
  })

  it('displays salary as $min-maxK when both are set', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const badges = wrapper.findAll('.b-badge')
    expect(badges[0].text()).toBe('$100-150K')
  })

  it('displays salary as $minK (min) when only min is set', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const badges = wrapper.findAll('.b-badge')
    expect(badges[1].text()).toBe('$80K (min)')
  })

  it('displays salary as $maxK (max) when only max is set', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const badges = wrapper.findAll('.b-badge')
    expect(badges[2].text()).toBe('$40K (max)')
  })

  it('hides salary badge when both min and max are 0', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const badges = wrapper.findAll('.b-badge')
    expect(badges[3].text()).toBe('')
  })

  it('navigates to /job?id=<id> when a card is clicked', async () => {
    const wrapper = mountJobsList(pb, router)
    await flushPromises()

    const cards = wrapper.findAll('.b-card')
    await cards[0].trigger('click')

    expect(router.push).toHaveBeenCalledWith({ path: '/job', query: { id: 'job1' } })
  })
})
