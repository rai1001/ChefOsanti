import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { buildRunAndBatch } from '../domain/preparations'

export type Preparation = {
  id: string
  orgId: string
  name: string
  defaultYieldQty: number
  defaultYieldUnit: string
  shelfLifeDays: number
  storage: 'ambient' | 'fridge' | 'freezer'
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
    .select('id, org_id, name, default_yield_qty, default_yield_unit, shelf_life_days, storage, allergens')
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
  shelfLifeDays: number
  labelsCount?: number
}) {
  const supabase = getSupabaseClient()
  const { runRecord, batchRecord, expiresAt } = buildRunAndBatch({
    orgId: input.orgId,
    preparationId: input.preparationId,
    locationId: input.locationId,
    producedQty: input.producedQty,
    producedUnit: input.producedUnit,
    producedAt: input.producedAt,
    shelfLifeDays: input.shelfLifeDays,
    labelsCount: input.labelsCount ?? 1,
  })

  const { data: batch, error: batchErr } = await supabase
    .from('stock_batches')
    .insert({
      ...batchRecord,
      lot_code: null,
      created_by: null,
    })
    .select('id')
    .single()
  if (batchErr) throw mapSupabaseError(batchErr, { module: 'inventory', operation: 'createPrepBatch' })

  const batchId = batch.id as string

  const { error: mvErr } = await supabase.from('stock_movements').insert({
    org_id: input.orgId,
    batch_id: batchId,
    delta_qty: batchRecord.qty,
    reason: 'prep',
    note: 'Elaboracion',
  })
  if (mvErr) throw mapSupabaseError(mvErr, { module: 'inventory', operation: 'logPrepMovement' })

  const { data: run, error: runErr } = await supabase
    .from('preparation_runs')
    .insert({
      ...runRecord,
      stock_batch_id: batchId,
    })
    .select('id')
    .single()
  if (runErr) throw mapSupabaseError(runErr, { module: 'inventory', operation: 'createPrepRun' })

  return { runId: run.id as string, batchId, expiresAt } as PreparationRunResult
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
