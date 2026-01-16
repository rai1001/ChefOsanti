import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { Recipe, RecipeLine, Product, RecipeCategory } from '../domain/recipes'

export type RecipeWithLines = Recipe & { notes?: string | null; lines: (RecipeLine & { productName?: string })[] }

export type RecipeCostLine = {
  lineId: string
  recipeId: string
  productId: string
  productName: string
  qty: number
  unit: 'kg' | 'ud'
  supplierItemId?: string | null
  purchaseUnit?: 'kg' | 'ud' | null
  unitPrice?: number | null
  lineCost?: number | null
  missingPrice: boolean
  unitMismatch: boolean
}

export type RecipeCostSummary = {
  recipeId: string
  defaultServings: number
  totalCost: number
  costPerServing: number
  missingPrices: number
  unitMismatches: number
}

type RecipeCostBreakdownRow = {
  line_id: string
  recipe_id: string
  product_id: string
  product_name: string
  qty: number
  unit: 'kg' | 'ud'
  supplier_item_id?: string | null
  purchase_unit?: 'kg' | 'ud' | null
  price_per_unit?: number | null
  line_cost?: number | null
  missing_price: boolean
  unit_mismatch: boolean
}

type RecipeCostSummaryRow = {
  recipe_id: string
  default_servings: number
  total_cost: number
  cost_per_serving: number
  missing_prices: number
  unit_mismatches: number
}

export type RecipeMiseEnPlaceRow = {
  productId: string
  productName: string
  qty: number
  unit: 'kg' | 'ud'
}

function mapProduct(row: any): Product & { cost: number } {
  return {
    id: row.id,
    name: row.name,
    baseUnit: row.base_unit,
    cost: row.unit_cost ?? 0
  }
}

function mapRecipe(row: any): Recipe {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? null,
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

export async function listRecipes(params: {
  orgId?: string
  search?: string
  category?: RecipeCategory | null
}): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('recipes').select('*').order('created_at', { ascending: false })
  if (params.orgId) query = query.eq('org_id', params.orgId)
  const term = params.search?.trim()
  if (term) query = query.ilike('name', `%${term}%`)
  if (params.category) query = query.eq('category', params.category)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'listRecipes',
      orgId: params.orgId,
    })
  }
  return data?.map(mapRecipe) ?? []
}

export async function listProducts(orgId?: string): Promise<(Product & { cost: number })[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('products').select('*').order('name', { ascending: true })
  if (orgId) query = query.eq('org_id', orgId)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'listProducts',
      orgId,
    })
  }
  return data?.map(mapProduct) ?? []
}

export async function createRecipe(params: {
  orgId: string
  name: string
  defaultServings: number
  category?: RecipeCategory | null
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

export async function getRecipeCostBreakdown(recipeId: string): Promise<RecipeCostLine[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recipe_cost_breakdown')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('product_name', { ascending: true })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'getRecipeCostBreakdown',
      recipeId,
    })
  }
  return (
    (data as RecipeCostBreakdownRow[] | null)?.map((row) => ({
      lineId: row.line_id,
      recipeId: row.recipe_id,
      productId: row.product_id,
      productName: row.product_name,
      qty: Number(row.qty),
      unit: row.unit,
      supplierItemId: row.supplier_item_id ?? null,
      purchaseUnit: row.purchase_unit ?? null,
      unitPrice: row.price_per_unit ?? null,
      lineCost: row.line_cost ?? null,
      missingPrice: Boolean(row.missing_price),
      unitMismatch: Boolean(row.unit_mismatch),
    })) ?? []
  )
}

export async function getRecipeCostSummary(recipeId: string): Promise<RecipeCostSummary | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recipe_cost_summary')
    .select('*')
    .eq('recipe_id', recipeId)
    .maybeSingle()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'getRecipeCostSummary',
      recipeId,
    })
  }
  if (!data) return null
  const row = data as RecipeCostSummaryRow
  return {
    recipeId: row.recipe_id,
    defaultServings: row.default_servings,
    totalCost: Number(row.total_cost ?? 0),
    costPerServing: Number(row.cost_per_serving ?? 0),
    missingPrices: Number(row.missing_prices ?? 0),
    unitMismatches: Number(row.unit_mismatches ?? 0),
  }
}

export async function computeRecipeMiseEnPlace(params: {
  recipeId: string
  servings?: number
  packs?: number
}): Promise<RecipeMiseEnPlaceRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('compute_recipe_mise_en_place', {
    p_recipe_id: params.recipeId,
    p_servings: params.servings ?? null,
    p_packs: params.packs ?? null,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'computeRecipeMiseEnPlace',
      recipeId: params.recipeId,
    })
  }
  return (
    (data as { product_id: string; product_name: string; qty: number; unit: 'kg' | 'ud' }[] | null)?.map(
      (row) => ({
        productId: row.product_id,
        productName: row.product_name,
        qty: Number(row.qty ?? 0),
        unit: row.unit,
      }),
    ) ?? []
  )
}

// Hooks
export function useRecipes(
  orgId: string | undefined,
  filters?: { search?: string; category?: RecipeCategory | null },
) {
  return useQuery({
    queryKey: ['recipes', orgId, filters?.search ?? '', filters?.category ?? null],
    queryFn: () =>
      listRecipes({
        orgId,
        search: filters?.search,
        category: filters?.category ?? null,
      }),
    enabled: Boolean(orgId),
  })
}

export function useProducts(orgId: string | undefined) {
  return useQuery({
    queryKey: ['products', orgId],
    queryFn: () => listProducts(orgId),
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
    mutationFn: (payload: { name: string; defaultServings: number; category?: RecipeCategory | null }) => {
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

export function useRecipeCostBreakdown(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe_cost_breakdown', recipeId],
    queryFn: () => getRecipeCostBreakdown(recipeId ?? ''),
    enabled: Boolean(recipeId),
  })
}

export function useRecipeCostSummary(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe_cost_summary', recipeId],
    queryFn: () => getRecipeCostSummary(recipeId ?? ''),
    enabled: Boolean(recipeId),
  })
}

export function useRecipeMiseEnPlace(
  recipeId: string | undefined,
  params?: { servings?: number; packs?: number },
) {
  const enabled =
    Boolean(recipeId) &&
    ((typeof params?.servings === 'number' && params.servings > 0) ||
      (typeof params?.packs === 'number' && params.packs > 0))
  return useQuery({
    queryKey: ['recipe_mise_en_place', recipeId, params?.servings ?? null, params?.packs ?? null],
    queryFn: () =>
      computeRecipeMiseEnPlace({
        recipeId: recipeId ?? '',
        servings: params?.servings,
        packs: params?.packs,
      }),
    enabled,
  })
}
