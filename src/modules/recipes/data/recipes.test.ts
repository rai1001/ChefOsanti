import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    listRecipes,
    createRecipe,
    useRecipes,
    useCreateRecipe
} from './recipes'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '../../../../tests/integration/utils/wrapper'

vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Recipes Data', () => {
    const mockFrom = vi.fn()
    const mockSelect = vi.fn()
    const mockEq = vi.fn()
    const mockInsert = vi.fn()
    const mockSingle = vi.fn()
    const mockOrder = vi.fn()
    const mockIlike = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        eq: mockEq,
        insert: mockInsert,
        single: mockSingle,
        order: mockOrder,
        ilike: mockIlike,
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
        mockIlike.mockReturnValue(mockClient)
    })

    it('listRecipes filters by org and search', async () => {
        mockClient.then = (resolve: any) => resolve({
            data: [{ id: 'r1', name: 'Pizza', default_servings: 1 }],
            error: null
        })

        const result = await listRecipes({ orgId: 'o1', search: 'piz' })
        expect(mockFrom).toHaveBeenCalledWith('recipes')
        expect(mockEq).toHaveBeenCalledWith('org_id', 'o1')
        expect(mockIlike).toHaveBeenCalledWith('name', '%piz%')
        expect(result[0].name).toBe('Pizza')
    })

    it('createRecipe inserts recipe', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 'r1', name: 'New Recipe', default_servings: 4 },
            error: null
        })

        const result = await createRecipe({ orgId: 'o1', name: 'New Recipe', defaultServings: 4 })
        expect(mockInsert).toHaveBeenCalled()
        expect(result.name).toBe('New Recipe')
    })

    it('useRecipes hook fetches recipes', async () => {
        mockClient.then = (resolve: any) => resolve({
            data: [{ id: 'r1', name: 'Pasta', default_servings: 2 }],
            error: null
        })

        const { result } = renderHook(() => useRecipes('o1'), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data?.[0].name).toBe('Pasta')
    })

    it('useCreateRecipe hook calls mutation', async () => {
        mockSingle.mockResolvedValue({
            data: { id: 'r2', name: 'Salad', default_servings: 1 },
            error: null
        })

        const { result } = renderHook(() => useCreateRecipe('o1'), { wrapper: createWrapper() })

        result.current.mutate({ name: 'Salad', defaultServings: 1 })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(mockInsert).toHaveBeenCalled()
    })
})
