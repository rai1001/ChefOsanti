import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listHotels } from './orders'
import { supabaseClient } from '@/lib/supabaseClient'
import { AppError } from '@/lib/shared/errors'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => {
    const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
    });

    return {
        supabaseClient: {
            from: mockFrom
        },
        getSupabaseClient: vi.fn(() => ({
            from: mockFrom
        }))
    };
})

describe('Purchasing Data Layer Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should map Supabase error to AppError in listHotels', async () => {
        const mockError = { code: 'PGRST116', message: 'Not found', details: '', hint: '' }

        // Configurar el mock para devolver error
        const fromSpy = vi.spyOn(supabaseClient, 'from')
        const mockQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: mockError })
        } as unknown as ReturnType<typeof supabaseClient.from>
        fromSpy.mockReturnValue(mockQuery)

        try {
            await listHotels('test-org-id')
        } catch (error) {
            expect(error).toBeInstanceOf(AppError)
            expect((error as AppError).type).toBe('NotFoundError')
        }
    })

    it('should throw ValidationError if orgId is missing in listHotels', async () => {
        await expect(listHotels('')).rejects.toThrow('org_id es obligatorio para listar hoteles')
    })
})
