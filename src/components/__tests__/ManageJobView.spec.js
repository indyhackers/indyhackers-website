import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ManageJobView from '../jobs/ManageJobView.vue'

const mockJob = {
  id: 'job1',
  title: 'Senior Developer',
  company: 'Acme Corp',
  salary_min: 100,
  salary_max: 150,
  description: '<p>Great opportunity</p>',
  how_to_apply: '<p>Email hr@acme.com</p>',
  approved: true,
  filled: false
}

function createMockPocketBase(send) {
  return { send: send || vi.fn().mockResolvedValue({ ...mockJob }) }
}

function mountView(pb, routeQuery = { token: 'tok123' }) {
  return mount(ManageJobView, {
    global: {
      config: {
        globalProperties: {
          pocketbase: pb,
          $route: { query: routeQuery }
        }
      },
      stubs: {
        'b-row': { template: '<div><slot /></div>' },
        'b-col': { template: '<div><slot /></div>' },
        'b-form': { template: '<form @submit="$emit(\'submit\', $event)"><slot /></form>' },
        'b-form-group': { template: '<div><slot /></div>' },
        'b-form-input': { template: '<input />' },
        'b-input-group': { template: '<div><slot /></div>' },
        'b-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        'b-alert': { template: '<div class="b-alert"><slot /></div>' },
        'tip-tap-editor': { template: '<div class="tiptap-stub"></div>' }
      }
    }
  })
}

describe('ManageJobView', () => {
  let pb

  beforeEach(() => {
    pb = createMockPocketBase()
  })

  it('loads the job via the token-scoped manage endpoint', async () => {
    mountView(pb)
    await flushPromises()

    expect(pb.send).toHaveBeenCalledWith('/api/jobs/manage/tok123', { method: 'GET' })
  })

  it('shows an error when no token is present', async () => {
    const wrapper = mountView(pb, {})
    await flushPromises()

    expect(pb.send).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('missing its token')
  })

  it('shows a not-found error when the endpoint rejects', async () => {
    const send = vi.fn().mockRejectedValue(new Error('404'))
    const wrapper = mountView(createMockPocketBase(send))
    await flushPromises()

    expect(wrapper.text()).toContain("couldn't find a job")
  })

  it('saves edits with a PATCH to the manage endpoint', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ...mockJob })
      .mockResolvedValueOnce({ ...mockJob, title: 'Lead Developer' })
    const wrapper = mountView(createMockPocketBase(send))
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(send).toHaveBeenLastCalledWith(
      '/api/jobs/manage/tok123',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ title: 'Senior Developer', company: 'Acme Corp' })
      })
    )
  })

  it('marks the job as filled after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ...mockJob })
      .mockResolvedValueOnce({ ...mockJob, filled: true })
    const wrapper = mountView(createMockPocketBase(send))
    await flushPromises()

    const takedownBtn = wrapper.findAll('button').find((b) => b.text().includes('Mark as filled'))
    await takedownBtn.trigger('click')
    await flushPromises()

    expect(send).toHaveBeenLastCalledWith(
      '/api/jobs/manage/tok123',
      expect.objectContaining({ method: 'PATCH', body: { filled: true } })
    )
    confirmSpy.mockRestore()
  })

  it('does not take down the job if confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const send = vi.fn().mockResolvedValue({ ...mockJob })
    const wrapper = mountView(createMockPocketBase(send))
    await flushPromises()

    const takedownBtn = wrapper.findAll('button').find((b) => b.text().includes('Mark as filled'))
    await takedownBtn.trigger('click')
    await flushPromises()

    // only the initial GET happened — no PATCH
    expect(send).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })
})
