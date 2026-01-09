import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { Recipe, RecipeLine } from '../domain/recipes'

export type RecipeWithLines = Recipe & { category?: string | null; notes?: string | null; lines: (RecipeLine & { productName?: string })[] }

function mapRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    defaultServings: row.default_servings,
  }
}

function mapLine(row: any): RecipeLine & { productName?: string } {
  return {
    id: row.id,
    productId: row.product_id,
    qty: row.qty,
    unit: row.unit,
    productBaseUnit: row.products?.base_unit,
    productName: row.products?.name,
  }
}

export async function listRecipes(orgId?: string): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('recipes').select('*').order('created_at', { ascending: false })
  if (orgId) query = query.eq('org_id', orgId)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'listRecipes',
      orgId,
    })
  }
  return data?.map(mapRecipe) ?? []
}

export async function createRecipe(params: {
  orgId: string
  name: string
  defaultServings: number
  category?: string | null
  notes?: string | null
}): Promise<Recipe> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      org_id: params.orgId,
      name: params.name,
      default_servings: params.defaultServings,
      category: params.category ?? null,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'createRecipe',
      orgId: params.orgId,
    })
  }
  return mapRecipe(data)
}

export async function getRecipeWithLines(id: string): Promise<RecipeWithLines> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_lines (*, products (name, base_unit))')
    .eq('id', id)
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'getRecipeWithLines',
      id,
    })
  }
  return {
    ...mapRecipe(data),
    category: data.category,
    notes: data.notes,
    lines: (data.recipe_lines ?? []).map(mapLine),
  }
}

export async function addRecipeLine(params: {
  orgId: string
  recipeId: string
  productId: string
  qty: number
  unit: 'kg' | 'ud'
}): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('recipe_lines').insert({
    org_id: params.orgId,
    recipe_id: params.recipeId,
    product_id: params.productId,
    qty: params.qty,
    unit: params.unit,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'addRecipeLine',
      orgId: params.orgId,
      recipeId: params.recipeId,
    })
  }
}

export async function removeRecipeLine(lineId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('recipe_lines').delete().eq('id', lineId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'removeRecipeLine',
      lineId,
    })
  }
}

export async function linkIngredientToProduct(ingredientId: string, productId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('ingredients')
    .update({ product_id: productId })
    .eq('id', ingredientId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'linkIngredientToProduct',
      ingredientId,
      productId,
    })
  }
}

// Hooks
export function useRecipes(orgId: string | undefined) {
  return useQuery({
    queryKey: ['recipes', orgId],
    queryFn: () => listRecipes(orgId),
    enabled: Boolean(orgId),
  })
}

export function useRecipe(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => getRecipeWithLines(recipeId ?? ''),
    enabled: Boolean(recipeId),
  })
}

export function useCreateRecipe(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; defaultServings: number; category?: string | null }) => {
      if (!orgId) throw new Error('Falta orgId')
      return createRecipe({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes', orgId] })
    },
  })
}

export function useAddRecipeLine(recipeId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { productId: string; qty: number; unit: 'kg' | 'ud' }) => {
      if (!recipeId || !orgId) throw new Error('Falta orgId o recipeId')
      return addRecipeLine({ orgId, recipeId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}

export function useRemoveRecipeLine(recipeId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) => removeRecipeLine(lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}

export function useLinkIngredientToProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { ingredientId: string; productId: string }) =>
      linkIngredientToProduct(payload.ingredientId, payload.productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}
