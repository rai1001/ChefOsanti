import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    useSuppliers,
    useCreateSupplier,
    useSuppliersInfinite,
    insertSupplier,
} from './suppliers'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '../../../../tests/integration/utils/wrapper'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Suppliers Data', () => {
    const mockFrom = vi.fn()
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockInsert = vi.fn()
    const mockSingle = vi.fn()
    const mockOrder = vi.fn()
    const mockRange = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert,
        single: mockSingle,
        order: mockOrder,
        range: mockRange,
        then: (resolve: any) => resolve({ data: [], error: null })
    } as any

    beforeEach(() => {
        vi.clearAllMocks()
        ;(getSupabaseClient as any).mockReturnValue(mockClient)

        mockFrom.mockReturnValue(mockClient)
        mockSelect.mockReturnValue(mockClient)
        mockEq.mockReturnValue(mockClient)
        mockInsert.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
        mockOrder.mockReturnValue(mockClient)
        mockRange.mockReturnValue(mockClient)
    })

    it('useSuppliers fetches suppliers', async () => {
        mockClient.then = (resolve: any) => resolve({
            data: [{ id: 's1', org_id: 'o1', name: 'Supplier 1', created_at: '2024-01-01' }],
            error: null
        })

        const { result } = renderHook(() => useSuppliers('o1'), { wrapper: createWrapper() })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data?.[0].name).toBe('Supplier 1')
    })

    it('useSuppliersInfinite fetches infinite suppliers', async () => {
        mockClient.then = (resolve: any) => resolve({
            data: [{ id: 's1', org_id: 'o1', name: 'Supplier 1', created_at: '2024-01-01' }],
            error: null
        })

        const { result } = renderHook(() => useSuppliersInfinite('o1'), { wrapper: createWrapper() })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data?.pages[0][0].name).toBe('Supplier 1')
    })

    it('useCreateSupplier calls mutation', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 's2', org_id: 'o1', name: 'New Supplier', created_at: '2024-01-01' },
            error: null
        })

        const { result } = renderHook(() => useCreateSupplier('o1'), { wrapper: createWrapper() })

        result.current.mutate({ name: 'New Supplier' })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(mockInsert).toHaveBeenCalled()
    })

    it('insertSupplier inserts supplier', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 's3', org_id: 'o1', name: 'Direct Supplier', created_at: '2024-01-01' },
            error: null
        })

        const result = await insertSupplier({ orgId: 'o1', name: 'Direct Supplier' })
        expect(mockInsert).toHaveBeenCalled()
        expect(result.name).toBe('Direct Supplier')
    })
})
