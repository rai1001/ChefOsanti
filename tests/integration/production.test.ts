import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { fetchGlobalTasks } from '@/modules/production/data/productionRepository'
import { createSupabaseMock } from './utils/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Production Repository', () => {
  let client: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createSupabaseMock()
    ;(getSupabaseClient as unknown as vi.Mock).mockReturnValue(client)
  })

  it('fetchGlobalTasks filters by org and date range', async () => {
    const from = new Date('2025-01-01T00:00:00Z')
    const to = new Date('2025-01-07T23:59:59Z')

    client.order.mockResolvedValueOnce({
      data: [
        {
          id: 't1',
          org_id: 'org-1',
          plan_id: 'p1',
          station: 'caliente',
          title: 'Tarea',
          due_at: null,
          assignee_staff_id: null,
          priority: 1,
          status: 'todo',
          blocked_reason: null,
          notes: null,
          created_at: new Date().toISOString(),
          planned_qty: null,
          unit: null,
          recipe_id: null,
          production_plans: { status: 'draft', events: { name: 'Evento', starts_at: '2025-01-03T00:00:00Z' } },
        },
      ],
      error: null,
    })

    const result = await fetchGlobalTasks({ orgId: 'org-1', from, to })

    expect(client.from).toHaveBeenCalledWith('production_tasks')
    expect(client.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(client.gte).toHaveBeenCalledWith('production_plans.events.starts_at', from.toISOString())
    expect(client.lte).toHaveBeenCalledWith('production_plans.events.starts_at', to.toISOString())
    expect(result[0].event_name).toBe('Evento')
  })
})
