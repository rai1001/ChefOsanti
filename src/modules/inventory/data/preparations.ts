import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
export type Preparation = {
  id: string
  orgId: string
  name: string
  defaultYieldQty: number
  defaultYieldUnit: string
  shelfLifeDays: number
  storage: 'ambient' | 'fridge' | 'freezer'
  defaultProcessType?: 'cooked' | 'pasteurized' | 'vacuum' | 'frozen' | 'pasteurized_frozen'
  allergens?: string | null
}

export type PreparationRunResult = {
  runId: string
  batchId: string
  expiresAt: string | null
}

export async function listPreparations(orgId: string | undefined) {
  if (!orgId) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('preparations')
    .select('id, org_id, name, default_yield_qty, default_yield_unit, shelf_life_days, storage, default_process_type, allergens')
    .eq('org_id', orgId)
    .order('name')
  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'listPreparations', orgId })
  }
  return (
    data?.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      defaultYieldQty: Number(row.default_yield_qty ?? 0),
      defaultYieldUnit: row.default_yield_unit,
      shelfLifeDays: row.shelf_life_days,
      storage: row.storage,
      defaultProcessType: row.default_process_type ?? undefined,
      allergens: row.allergens,
    })) ?? []
  ) as Preparation[]
}

export function usePreparations(orgId: string | undefined) {
  return useQuery({
    queryKey: ['preparations', orgId],
    queryFn: () => listPreparations(orgId),
    enabled: Boolean(orgId),
  })
}

export async function createPreparation(input: {
  orgId: string
  name: string
  defaultYieldQty: number
  defaultYieldUnit: string
  shelfLifeDays: number
  storage: 'ambient' | 'fridge' | 'freezer'
  defaultProcessType?: 'cooked' | 'pasteurized' | 'vacuum' | 'frozen' | 'pasteurized_frozen'
  allergens?: string | null
}) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('preparations').insert({
    org_id: input.orgId,
    name: input.name,
    default_yield_qty: input.defaultYieldQty,
    default_yield_unit: input.defaultYieldUnit,
    shelf_life_days: input.shelfLifeDays,
    storage: input.storage,
    default_process_type: input.defaultProcessType ?? 'cooked',
    allergens: input.allergens ?? null,
  })
  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'createPreparation' })
}

export function useCreatePreparation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPreparation,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparations', vars.orgId] })
    },
  })
}

export async function createPreparationRun(input: {
  orgId: string
  preparationId: string
  locationId: string
  producedQty: number
  producedUnit: string
  producedAt: string
  processType?: 'cooked' | 'pasteurized' | 'vacuum' | 'frozen' | 'pasteurized_frozen'
  labelsCount?: number
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('create_preparation_run', {
    p_org_id: input.orgId,
    p_preparation_id: input.preparationId,
    p_location_id: input.locationId,
    p_produced_qty: input.producedQty,
    p_produced_unit: input.producedUnit,
    p_produced_at: input.producedAt,
    p_process_type: input.processType ?? null,
    p_labels_count: input.labelsCount ?? 1,
  })
  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'createPrepRun' })
  }
  return {
    runId: data?.[0]?.run_id as string,
    batchId: data?.[0]?.batch_id as string,
    expiresAt: data?.[0]?.expires_at as string | null,
  } as PreparationRunResult
}

export function useCreatePreparationRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPreparationRun,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparations', vars.orgId] })
      qc.invalidateQueries({ queryKey: ['stock_batches', vars.locationId] })
    },
  })
}
