import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { enqueueOcr, runOcr } from '@/modules/events/data/ocr'

vi.mock('@/config/env', () => ({
  getEnv: () => ({ supabaseUrl: 'http://localhost' }),
}))

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('OCR Data', () => {
  const session = { access_token: 'token-123' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as unknown as vi.Mock).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
      },
    })
  })

  it('enqueueOcr calls edge function and returns jobId', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'job-1' }),
      text: async () => '',
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await enqueueOcr('att-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/functions/v1/ocr_process/enqueue',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${session.access_token}` }),
      }),
    )
    expect(result.jobId).toBe('job-1')
  })

  it('enqueueOcr throws on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
      text: async () => 'failure',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(enqueueOcr('att-1')).rejects.toThrow('failure')
  })

  it('runOcr calls edge function and returns status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'done' }),
      text: async () => '',
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await runOcr('job-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/functions/v1/ocr_process/run',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${session.access_token}` }),
      }),
    )
    expect(result.status).toBe('done')
  })

  it('runOcr throws on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
      text: async () => 'failure',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(runOcr('job-1')).rejects.toThrow('failure')
  })
})
