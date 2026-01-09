import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPurchaseOrder, addPurchaseOrderLine, updatePurchaseOrderStatus, receivePurchaseOrder } from '@/modules/purchasing/data/orders'
import { getSupabaseClient } from '@/lib/supabaseClient'

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Purchase Order Data Logic', () => {
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockFrom = vi.fn()
    const mockEq = vi.fn()
    const mockUpdate = vi.fn()
    const mockRpc = vi.fn()
    const mockSingle = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        rpc: mockRpc,
        eq: mockEq,
        single: mockSingle,
    } as any

    beforeEach(() => {
        vi.clearAllMocks()
            ; (getSupabaseClient as any).mockReturnValue(mockClient)

        // Default chain behavior
        mockFrom.mockReturnValue(mockClient)
        mockInsert.mockReturnValue(mockClient)
        mockUpdate.mockReturnValue(mockClient)
        mockSelect.mockReturnValue(mockClient)
        mockRpc.mockReturnValue(mockClient)
        mockEq.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
    })

    it('createPurchaseOrder inserts correct data', async () => {
        const mockData = {
            id: 'po-123',
            org_id: 'org-1',
            hotel_id: 'h-1',
            supplier_id: 's-1',
            status: 'draft',
            order_number: 'PO-001',
            total_estimated: 0,
            created_at: '2024-01-01T00:00:00Z',
        }

        mockSingle.mockResolvedValue({ data: mockData, error: null })

        const result = await createPurchaseOrder({
            orgId: 'org-1',
            hotelId: 'h-1',
            supplierId: 's-1',
            orderNumber: 'PO-001',
            notes: 'Test note',
        })

        expect(mockFrom).toHaveBeenCalledWith('purchase_orders')
        expect(mockInsert).toHaveBeenCalledWith({
            org_id: 'org-1',
            hotel_id: 'h-1',
            supplier_id: 's-1',
            order_number: 'PO-001',
            status: 'draft',
            notes: 'Test note',
        })
        expect(result.id).toBe('po-123')
        expect(result.status).toBe('draft')
    })

    it('addPurchaseOrderLine inserts correct line item', async () => {
        const mockLineData = {
            id: 'pol-1',
            purchase_order_id: 'po-123',
            supplier_item_id: 'si-1',
            ingredient_id: 'ing-1',
            requested_qty: 10,
            received_qty: 0,
            purchase_unit: 'kg',
            rounding_rule: 'none',
            pack_size: 1,
            unit_price: 5.5,
            line_total: 55,
        }

        mockSingle.mockResolvedValue({ data: mockLineData, error: null })

        const result = await addPurchaseOrderLine({
            orgId: 'org-1',
            purchaseOrderId: 'po-123',
            supplierItemId: 'si-1',
            ingredientId: 'ing-1',
            requestedQty: 10,
            purchaseUnit: 'kg',
            roundingRule: 'none',
            unitPrice: 5.5,
            packSize: 1,
        })

        expect(mockFrom).toHaveBeenCalledWith('purchase_order_lines')
        expect(mockInsert).toHaveBeenCalledWith({
            org_id: 'org-1',
            purchase_order_id: 'po-123',
            supplier_item_id: 'si-1',
            ingredient_id: 'ing-1',
            requested_qty: 10,
            purchase_unit: 'kg',
            rounding_rule: 'none',
            pack_size: 1,
            unit_price: 5.5,
        })
        expect(result.id).toBe('pol-1')
        expect(result.lineTotal).toBe(55)
    })
    it('updatePurchaseOrderStatus updates status correctly', async () => {
        mockEq.mockResolvedValue({ error: null })

        await updatePurchaseOrderStatus('po-123', 'confirmed')

        expect(mockFrom).toHaveBeenCalledWith('purchase_orders')
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'confirmed',
            confirmed_at: expect.any(String),
        }))
        expect(mockEq).toHaveBeenCalledWith('id', 'po-123')
    })

    it('receivePurchaseOrder calls rpc correctly', async () => {
        // mockRpc is called directly on client, so it should resolve
        mockRpc.mockResolvedValue({ error: null })

        const lines = [{ lineId: 'l1', receivedQty: 10 }, { lineId: 'l2', receivedQty: 5 }]
        await receivePurchaseOrder('po-123', lines)

        expect(mockRpc).toHaveBeenCalledWith('receive_purchase_order', {
            p_order_id: 'po-123',
            p_lines: [
                { line_id: 'l1', received_qty: 10 },
                { line_id: 'l2', received_qty: 5 }
            ]
        })
    })
})
