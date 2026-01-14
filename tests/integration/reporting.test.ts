import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { generateReport, listReports } from '@/modules/reporting/data/reportsRepository'
import { createSupabaseMock } from './utils/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Reporting Repository', () => {
  const orgId = 'org-123'
  const report = {
    id: 'r-1',
    org_id: orgId,
    type: 'weekly',
    created_at: new Date().toISOString(),
  }

  let client: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createSupabaseMock()
    ;(getSupabaseClient as unknown as vi.Mock).mockReturnValue(client)
  })

  it('listReports filters by org and returns data', async () => {
    client.order.mockResolvedValueOnce({ data: [report], error: null })

    const result = await listReports(orgId)

    expect(client.from).toHaveBeenCalledWith('reporting_generated_reports')
    expect(client.eq).toHaveBeenCalledWith('org_id', orgId)
    expect(client.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result[0].id).toBe(report.id)
  })

  it('generateReport invokes edge function and returns report', async () => {
    client.functions.invoke.mockResolvedValueOnce({
      data: { report: report },
      error: null,
    })

    const result = await generateReport(orgId, 'weekly', new Date())

    expect(client.functions.invoke).toHaveBeenCalledWith(
      'reporting_generate',
      expect.objectContaining({ body: expect.any(Object) }),
    )
    expect(result.id).toBe(report.id)
  })

  it('generateReport throws on edge error', async () => {
    client.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge failure'),
    })

    await expect(generateReport(orgId, 'weekly', new Date())).rejects.toThrow('Edge failure')
  })

  it('generateReport throws when response contains error', async () => {
    client.functions.invoke.mockResolvedValueOnce({
      data: { error: 'Function failed' },
      error: null,
    })

    await expect(generateReport(orgId, 'weekly', new Date())).rejects.toThrow('Function failed')
  })
})
