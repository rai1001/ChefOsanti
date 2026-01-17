import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    listEvents,
    createEvent,
    getEventWithBookings,
    listEventServices,
    createEventService,
    updateEventService,
    deleteEventService,
    listHotels
} from './events'
import { getSupabaseClient } from '@/lib/supabaseClient'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Events Data', () => {
    const mockFrom = vi.fn()
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockInsert = vi.fn()
    const mockSingle = vi.fn()
    const mockOrder = vi.fn()
    const mockUpdate = vi.fn()
    const mockDelete = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert,
        single: mockSingle,
        order: mockOrder,
        update: mockUpdate,
        delete: mockDelete,
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
        mockUpdate.mockReturnValue(mockClient)
        mockDelete.mockReturnValue(mockClient)
    })

    it('listHotels returns hotels', async () => {
        mockOrder.mockResolvedValue({
            data: [{ id: 'h1', org_id: 'o1', name: 'Hotel 1' }],
            error: null,
        })

        const result = await listHotels()
        expect(mockFrom).toHaveBeenCalledWith('hotels')
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Hotel 1')
    })

    it('listEvents applies filters', async () => {
        mockOrder.mockReturnThis()
        // If filters are applied, eq is called last and should return the promise
        mockEq.mockResolvedValue({
            data: [{ id: 'e1', title: 'Event 1' }],
            error: null,
        })
        mockSelect.mockReturnThis()

        await listEvents({ hotelId: 'h1' })
        expect(mockFrom).toHaveBeenCalledWith('events')
        expect(mockEq).toHaveBeenCalledWith('hotel_id', 'h1')
    })

    it('createEvent inserts event', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 'e1', title: 'New Event' },
            error: null,
        })

        const result = await createEvent({
            orgId: 'o1',
            hotelId: 'h1',
            title: 'New Event',
            status: 'draft'
        })

        expect(mockFrom).toHaveBeenCalledWith('events')
        expect(mockInsert).toHaveBeenCalled()
        expect(result.title).toBe('New Event')
    })

    it('getEventWithBookings fetches event and bookings', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 'e1', title: 'Event 1' },
            error: null,
        })

        // First call is for event, second for bookings
        // mockClient.select returns mockClient, so we need to intercept the execution flow or mock separate calls.
        // But since we use the same client mock, we need to handle sequential calls.

        // The implementation does:
        // await supabase.from('events')...single()
        // await supabase.from('space_bookings')...order()

        // Mock for event
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 'e1', title: 'Event 1' }, error: null })
                })
            })
        })

        // Mock for bookings
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                        data: [{ id: 'b1', event_id: 'e1', spaces: { name: 'Space 1' } }],
                        error: null
                    })
                })
            })
        })

        const result = await getEventWithBookings('e1')
        expect(result.event.title).toBe('Event 1')
        expect(result.bookings).toHaveLength(1)
        expect(result.bookings[0].spaceName).toBe('Space 1')
    })

    it('listEventServices fetches services', async () => {
        mockOrder.mockResolvedValue({
            data: [{ id: 's1', service_type: 'coffee_break' }],
            error: null,
        })

        await listEventServices('e1')
        expect(mockFrom).toHaveBeenCalledWith('event_services')
        expect(mockEq).toHaveBeenCalledWith('event_id', 'e1')
    })

    it('createEventService inserts service', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 's1', service_type: 'coffee' },
            error: null,
        })

        await createEventService({
            orgId: 'o1',
            eventId: 'e1',
            serviceType: 'coffee_break',
            format: 'de_pie',
            startsAt: '2024-01-01',
            pax: 10
        })
        expect(mockInsert).toHaveBeenCalled()
    })

    it('updateEventService updates service', async () => {
        mockUpdate.mockReturnThis()
        mockEq.mockResolvedValue({ error: null })

        await updateEventService('s1', { pax: 20 })
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pax: 20 }))
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })

    it('deleteEventService deletes service', async () => {
        mockDelete.mockReturnThis()
        mockEq.mockResolvedValue({ error: null })

        await deleteEventService('s1')
        expect(mockDelete).toHaveBeenCalled()
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
})
