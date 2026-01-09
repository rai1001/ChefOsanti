import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { createRecipe, addRecipeLine, getRecipeWithLines } from '@/modules/recipes/data/recipes'

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
    getSupabaseClient: vi.fn(),
}))

describe('Recipes Data Logic', () => {
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockFrom = vi.fn()
    const mockEq = vi.fn()
    const mockSingle = vi.fn()

    const mockClient = {
        from: mockFrom,
        select: mockSelect,
        insert: mockInsert,
        eq: mockEq,
        single: mockSingle,
    } as any

    beforeEach(() => {
        vi.clearAllMocks()
            ; (getSupabaseClient as any).mockReturnValue(mockClient)

        mockFrom.mockReturnValue(mockClient)
        mockInsert.mockReturnValue(mockClient)
        mockSelect.mockReturnValue(mockClient)
        mockEq.mockReturnValue(mockClient)
        mockSingle.mockReturnValue(mockClient)
    })

    it('createRecipe inserts correct data', async () => {
        const mockData = {
            id: 'r-1',
            org_id: 'org-1',
            name: 'Soup',
            default_servings: 10
        }
        mockSingle.mockResolvedValue({ data: mockData, error: null })

        const result = await createRecipe({
            orgId: 'org-1',
            name: 'Soup',
            defaultServings: 10
        })

        expect(mockFrom).toHaveBeenCalledWith('recipes')
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            org_id: 'org-1',
            name: 'Soup',
            default_servings: 10
        }))
        expect(result.id).toBe('r-1')
    })

    it('addRecipeLine inserts correct data', async () => {
        mockInsert.mockResolvedValue({ error: null }) // addRecipeLine is void promise if success

        await addRecipeLine({
            orgId: 'org-1',
            recipeId: 'r-1',
            productId: 'p-1',
            qty: 2,
            unit: 'kg'
        })

        expect(mockFrom).toHaveBeenCalledWith('recipe_lines')
        expect(mockInsert).toHaveBeenCalledWith({
            org_id: 'org-1',
            recipe_id: 'r-1',
            product_id: 'p-1',
            qty: 2,
            unit: 'kg'
        })
    })

    it('getRecipeWithLines joins products correctly', async () => {
        const mockRecipe = {
            id: 'r-1',
            name: 'Soup',
            default_servings: 10,
            recipe_lines: [
                {
                    id: 'rl-1',
                    product_id: 'p-1',
                    qty: 1,
                    unit: 'kg',
                    products: { name: 'Carrot', base_unit: 'kg' }
                }
            ]
        }
        mockSingle.mockResolvedValue({ data: mockRecipe, error: null })

        const result = await getRecipeWithLines('r-1')

        expect(mockFrom).toHaveBeenCalledWith('recipes')
        expect(mockEq).toHaveBeenCalledWith('id', 'r-1')
        expect(result.lines).toHaveLength(1)
        expect(result.lines[0].productName).toBe('Carrot')
    })
})
