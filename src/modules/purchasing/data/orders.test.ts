import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    listPurchaseOrders,
    usePurchaseOrders,
    useCreatePurchaseOrder
} from './orders'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '../../../../tests/integration/utils/wrapper'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Purchasing Orders Data', () => {
    const mockFrom = vi.fn()
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockInsert = vi.fn()
    const mockSingle = vi.fn()
    const mockOrder = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert,
        single: mockSingle,
        order: mockOrder,
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
    })

    it('listPurchaseOrders filters by status', async () => {
        mockClient.then = (resolve: any) => resolve({
            data: [{ id: 'po1', status: 'draft', order_number: 'PO1', org_id: 'o1', hotel_id: 'h1', supplier_id: 's1', created_at: '2024-01-01' }],
            error: null
        })

        const result = await listPurchaseOrders('o1', { status: 'draft' })
        expect(mockFrom).toHaveBeenCalledWith('purchase_orders')
        expect(mockEq).toHaveBeenCalledWith('status', 'draft')
        expect(result[0].id).toBe('po1')
    })

    it('usePurchaseOrders hook fetches orders', async () => {
         mockClient.then = (resolve: any) => resolve({
            data: [{ id: 'po2', status: 'approved', order_number: 'PO2', org_id: 'o1', hotel_id: 'h1', supplier_id: 's1', created_at: '2024-01-01' }],
            error: null
        })

        const { result } = renderHook(() => usePurchaseOrders('o1'), { wrapper: createWrapper() })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data?.[0].orderNumber).toBe('PO2')
    })

    it('useCreatePurchaseOrder calls mutation', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 'po3', status: 'draft', order_number: 'PO3', org_id: 'o1', hotel_id: 'h1', supplier_id: 's1', created_at: '2024-01-01' },
            error: null
        })

        const { result } = renderHook(() => useCreatePurchaseOrder(), { wrapper: createWrapper() })

        result.current.mutate({
            orgId: 'o1',
            hotelId: 'h1',
            supplierId: 's1',
            orderNumber: 'PO3'
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(mockInsert).toHaveBeenCalled()
    })
})
