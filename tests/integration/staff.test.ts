import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { createStaffMember, listStaff } from '@/modules/staff/data/staff'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Staff Data Logic', () => {
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

        mockFrom.mockReturnValue(mockClient)
        mockInsert.mockReturnValue(mockClient)
        mockSelect.mockReturnValue(mockClient)
        mockEq.mockReturnValue(mockClient)
        mockOrder.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
    })

    it('createStaffMember inserts correct data', async () => {
        const mockStaff = {
            id: 'st-1',
            full_name: 'John Chef',
            role: 'cocinero',
            active: true
        }
        mockSingle.mockResolvedValue({ data: mockStaff, error: null })

        const result = await createStaffMember({
            orgId: 'org-1',
            fullName: 'John Chef',
            role: 'cocinero',
            employmentType: 'fijo'
        })

        expect(mockFrom).toHaveBeenCalledWith('staff_members')
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            full_name: 'John Chef',
            role: 'cocinero',
            employment_type: 'fijo'
        }))
        expect(result.id).toBe('st-1')
    })

    it('listStaff filters by active', async () => {
        // First eq call (org_id) returns builder (mockClient)
        // Second eq call (active) returns resolved data
        mockEq
            .mockReturnValueOnce(mockClient)
            .mockResolvedValueOnce({ data: [], error: null })

        // mockOrder is already set to return mockClient in beforeEach

        await listStaff('org-1', true)

        // Verify calls
        // Note: checking call arguments order might be tricky if we don't spy individual calls
        // But we can check they were called with expected args
        expect(mockEq).toHaveBeenNthCalledWith(1, 'org_id', 'org-1')
        expect(mockEq).toHaveBeenNthCalledWith(2, 'active', true)
    })
})
