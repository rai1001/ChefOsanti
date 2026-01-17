import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useGenerateProductionPlan,
  useProductionPlan,
  useProductionTasks,
  useCreateProductionPlan,
  useCreateProductionTask,
  useUpdateProductionTask,
  useDeleteProductionTask,
  useGlobalTasks,
} from './productionRepository'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '../../../../tests/integration/utils/wrapper'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Production Repository', () => {
  const mockFrom = vi.fn()
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockInsert = vi.fn()
  const mockSingle = vi.fn()
  const mockOrder = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockRpc = vi.fn()
  const mockGte = vi.fn()
  const mockLte = vi.fn()

  // Mutable response for thenable client
  let mockDbResponse = { data: null, error: null } as any

  const mockClient = {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    insert: mockInsert,
    single: mockSingle,
    order: mockOrder,
    update: mockUpdate,
    delete: mockDelete,
    rpc: mockRpc,
    maybeSingle: mockMaybeSingle,
    gte: mockGte,
    lte: mockLte,
    then: (resolve: any) => resolve(mockDbResponse)
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSupabaseClient as any).mockReturnValue(mockClient)

    // Default chain
    mockFrom.mockReturnValue(mockClient)
    mockSelect.mockReturnValue(mockClient)
    mockEq.mockReturnValue(mockClient)
    mockInsert.mockReturnValue(mockClient)
    // Terminal methods (single, maybeSingle, rpc) usually return a Promise resolving to { data, error }
    // But in our mockClient, if we return mockClient, it is thenable!
    // However, single() might be awaited directly.
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockRpc.mockResolvedValue({ data: null, error: null })

    mockOrder.mockReturnValue(mockClient)
    mockUpdate.mockReturnValue(mockClient)
    mockDelete.mockReturnValue(mockClient)
    mockGte.mockReturnValue(mockClient)
    mockLte.mockReturnValue(mockClient)

    mockDbResponse = { data: null, error: null }
  })

  it('useProductionPlan fetches plan', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'plan-1',
        org_id: 'org-1',
        status: 'draft',
      },
      error: null,
    })

    const { result } = renderHook(() => useProductionPlan('service-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('production_plans')
    expect(mockEq).toHaveBeenCalledWith('event_service_id', 'service-1')
    expect(result.current.data?.id).toBe('plan-1')
  })

  it('useProductionTasks fetches tasks', async () => {
    mockOrder.mockReturnThis()
    mockDbResponse = {
      data: [
        { id: 't1', title: 'Task 1', station: 'cold', priority: 10 },
      ],
      error: null,
    }

    const { result } = renderHook(() => useProductionTasks('plan-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('production_tasks')
    expect(mockEq).toHaveBeenCalledWith('plan_id', 'plan-1')
    expect(result.current.data?.[0].title).toBe('Task 1')
  })

  it('useCreateProductionPlan inserts plan', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'p1', event_service_id: 's1', status: 'draft' },
      error: null,
    })

    const { result } = renderHook(() => useCreateProductionPlan(), { wrapper: createWrapper() })

    result.current.mutate({
      orgId: 'o1',
      hotelId: 'h1',
      eventId: 'e1',
      eventServiceId: 's1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInsert).toHaveBeenCalled()
  })

  it('useGenerateProductionPlan calls rpc', async () => {
    mockRpc.mockResolvedValue({
      data: { plan_id: 'p1', created: 5, missing_items: [] },
      error: null,
    })

    const { result } = renderHook(() => useGenerateProductionPlan(), { wrapper: createWrapper() })

    result.current.mutate({ serviceId: 's1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith('generate_production_plan', expect.objectContaining({
        p_service_id: 's1',
    }))
  })
})
