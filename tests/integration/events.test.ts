import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { createEvent, createBooking, listEvents } from '@/modules/events/data/events'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Events Data Logic', () => {
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockFrom = vi.fn()
    const mockEq = vi.fn()
    const mockGte = vi.fn()
    const mockLte = vi.fn()
    const mockOrder = vi.fn()
    const mockSingle = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        insert: mockInsert,
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
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
        mockGte.mockReturnValue(mockClient)
        mockLte.mockReturnValue(mockClient)
        mockOrder.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
    })

    it('createEvent inserts correct data', async () => {
        const mockEvent = {
            id: 'e-1',
            title: 'Wedding',
            status: 'confirmed'
        }
        mockSingle.mockResolvedValue({ data: mockEvent, error: null })

        const result = await createEvent({
            orgId: 'org-1',
            hotelId: 'h-1',
            title: 'Wedding',
            status: 'confirmed'
        })

        expect(mockFrom).toHaveBeenCalledWith('events')
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Wedding',
            status: 'confirmed'
        }))
        expect(result.id).toBe('e-1')
    })

    it('createBooking inserts correct data', async () => {
        const mockBooking = {
            id: 'b-1',
            event_id: 'e-1',
            space_id: 's-1'
        }
        mockSingle.mockResolvedValue({ data: mockBooking, error: null })

        const result = await createBooking({
            orgId: 'org-1',
            eventId: 'e-1',
            spaceId: 's-1',
            startsAt: '2024-01-01T10:00:00',
            endsAt: '2024-01-01T12:00:00'
        })

        expect(mockFrom).toHaveBeenCalledWith('space_bookings')
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            event_id: 'e-1',
            space_id: 's-1'
        }))
        expect(result.id).toBe('b-1')
    })

    it('listEvents applies filters correctly', async () => {
        // The chain ends with lte for this specific test case
        mockLte.mockResolvedValue({ data: [], error: null })

        await listEvents({
            hotelId: 'h-1',
            startsAt: '2024-01-01',
            endsAt: '2024-01-31'
        })

        expect(mockEq).toHaveBeenCalledWith('hotel_id', 'h-1')
        expect(mockGte).toHaveBeenCalledWith('starts_at', '2024-01-01')
        expect(mockLte).toHaveBeenCalledWith('ends_at', '2024-01-31')
    })
})
