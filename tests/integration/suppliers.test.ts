import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPurchaseOrder } from '@/modules/purchasing/data/orders' // Keep for context or remove if unused, but we need data helpers
import { getSupabaseClient } from '@/lib/supabaseClient'
import { insertSupplier, insertSupplierItem, listSupplierItemsByOrg } from '@/modules/purchasing/data/suppliers'

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Suppliers Data Logic', () => {
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockFrom = vi.fn()
    const mockEq = vi.fn()
    const mockOrder = vi.fn()
    const mockSingle = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        insert: mockInsert,
        eq: mockEq,
        order: mockOrder,
        single: mockSingle,
    } as any

    beforeEach(() => {
        vi.clearAllMocks()
            ; (getSupabaseClient as any).mockReturnValue(mockClient)

        // Default chain behavior
        mockFrom.mockReturnValue(mockClient)
        mockInsert.mockReturnValue(mockClient)
        mockSelect.mockReturnValue(mockClient)
        mockEq.mockReturnValue(mockClient)
        mockOrder.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
    })

    it('insertSupplier creates a supplier correctly', async () => {
        const mockData = {
            id: 's-1',
            org_id: 'org-1',
            name: 'Supplier A',
            created_at: '2024-01-01T00:00:00Z'
        }
        mockSingle.mockResolvedValue({ data: mockData, error: null })

        const result = await insertSupplier({ orgId: 'org-1', name: 'Supplier A' })

        expect(mockFrom).toHaveBeenCalledWith('suppliers')
        expect(mockInsert).toHaveBeenCalledWith({ org_id: 'org-1', name: 'Supplier A' })
        expect(result.id).toBe('s-1')
        expect(result.name).toBe('Supplier A')
    })

    it('insertSupplierItem creates item correctly', async () => {
        const mockItem = {
            id: 'si-1',
            supplier_id: 's-1',
            name: 'Item A',
            purchase_unit: 'kg',
            rounding_rule: 'none',
            created_at: '2024-01-01'
        }
        mockSingle.mockResolvedValue({ data: mockItem, error: null })

        const result = await insertSupplierItem({
            supplierId: 's-1',
            name: 'Item A',
            purchaseUnit: 'kg',
            roundingRule: 'none'
        })

        expect(mockFrom).toHaveBeenCalledWith('supplier_items')
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            supplier_id: 's-1',
            name: 'Item A',
            purchase_unit: 'kg'
        }))
        expect(result.id).toBe('si-1')
    })

    it('listSupplierItemsByOrg filters by orgId', async () => {
        const mockItems = [
            { id: 'si-1', name: 'Item A', supplier_id: 's-1', suppliers: { org_id: 'org-1' } }
        ]
        // The chain is: from -> select -> eq -> order
        // listSupplierItemsByOrg does not use single(), it returns an array
        // We need to return data from the LAST call in the chain which is order()
        mockOrder.mockResolvedValue({ data: mockItems, error: null })

        const result = await listSupplierItemsByOrg('org-1')

        expect(mockFrom).toHaveBeenCalledWith('supplier_items')
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('suppliers!inner(org_id)'))
        expect(mockEq).toHaveBeenCalledWith('suppliers.org_id', 'org-1')
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('si-1')
    })
})
