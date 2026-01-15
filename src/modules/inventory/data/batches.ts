import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type InventoryLocation = {
  id: string
  orgId: string
  hotelId: string | null
  name: string
}

export type StockBatch = {
  id: string
  orgId: string
  locationId: string
  supplierItemId: string
  supplierItemName: string
  qty: number
  unit: 'kg' | 'ud'
  expiresAt: string | null
  lotCode: string | null
  source: 'purchase' | 'prep' | 'adjustment'
  createdAt: string
}

export async function listLocations(orgId: string, hotelId?: string) {
  const supabase = getSupabaseClient()
  let query = supabase.from('inventory_locations').select('id, org_id, hotel_id, name').eq('org_id', orgId)
  if (hotelId) query = query.eq('hotel_id', hotelId)
  const { data, error } = await query.order('name')
  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'listLocations', orgId })
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    orgId: row.org_id as string,
    hotelId: row.hotel_id as string | null,
    name: row.name as string,
  })) as InventoryLocation[]
}

export function useLocations(orgId: string | undefined, hotelId?: string) {
  return useQuery({
    queryKey: ['inventory_locations', orgId, hotelId],
    queryFn: () => listLocations(orgId ?? '', hotelId),
    enabled: Boolean(orgId),
  })
}

export async function listBatches(params: {
  locationId: string
  search?: string
  expiringSoon?: boolean
  expired?: boolean
}) {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('stock_batches')
    .select('id, org_id, location_id, supplier_item_id, qty, unit, expires_at, lot_code, source, created_at, supplier_items (name)')
    .eq('location_id', params.locationId)

  if (params.search) {
    query = query.ilike('supplier_items.name', `%${params.search}%`)
  }
  const now = new Date()
  if (params.expired) {
    query = query.lt('expires_at', now.toISOString())
  } else if (params.expiringSoon) {
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    query = query.lte('expires_at', soon.toISOString())
  }

  query.order('expires_at', { ascending: true, nullsFirst: false })
  query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'listBatches', locationId: params.locationId })
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    orgId: row.org_id,
    locationId: row.location_id,
    supplierItemId: row.supplier_item_id,
    supplierItemName: row.supplier_items?.name ?? 'Item',
    qty: Number(row.qty ?? 0),
    unit: row.unit,
    expiresAt: row.expires_at,
    lotCode: row.lot_code,
    source: row.source,
    createdAt: row.created_at,
  })) as StockBatch[]
}

export function useBatches(locationId: string | undefined, filters?: { search?: string; expiringSoon?: boolean; expired?: boolean }) {
  return useQuery({
    queryKey: ['stock_batches', locationId, filters],
    queryFn: () =>
      listBatches({
        locationId: locationId ?? '',
        search: filters?.search,
        expiringSoon: filters?.expiringSoon,
        expired: filters?.expired,
      }),
    enabled: Boolean(locationId),
  })
}

export async function createManualEntry(params: {
  orgId: string
  locationId: string
  supplierItemId: string
  qty: number
  unit: 'kg' | 'ud'
  expiresAt?: string | null
  lotCode?: string | null
  source?: 'purchase' | 'prep' | 'adjustment'
  createdBy?: string | null
}) {
  if (params.qty <= 0) {
    throw new Error('La cantidad debe ser mayor a 0')
  }
  const supabase = getSupabaseClient()

  const { data: itemRow, error: itemError } = await supabase
    .from('supplier_items')
    .select('id, purchase_unit')
    .eq('id', params.supplierItemId)
    .maybeSingle()
  if (itemError) {
    throw mapSupabaseError(itemError, { module: 'inventory', operation: 'fetchSupplierItem' })
  }
  if (itemRow && itemRow.purchase_unit && itemRow.purchase_unit !== params.unit) {
    throw new Error('Unidad incompatible con el ítem proveedor')
  }

  const { data: batchRow, error: batchErr } = await supabase
    .from('stock_batches')
    .insert({
      org_id: params.orgId,
      location_id: params.locationId,
      supplier_item_id: params.supplierItemId,
      qty: params.qty,
      unit: params.unit,
      expires_at: params.expiresAt ?? null,
      lot_code: params.lotCode ?? null,
      source: params.source ?? 'adjustment',
      created_by: params.createdBy ?? null,
    })
    .select('id')
    .single()
  if (batchErr) {
    throw mapSupabaseError(batchErr, { module: 'inventory', operation: 'createBatch' })
  }
  const batchId = batchRow.id as string

  const { error: mvErr } = await supabase.from('stock_movements').insert({
    org_id: params.orgId,
    batch_id: batchId,
    delta_qty: params.qty,
    reason: params.source ?? 'adjustment',
    note: 'Entrada manual',
    created_by: params.createdBy ?? null,
  })
  if (mvErr) {
    throw mapSupabaseError(mvErr, { module: 'inventory', operation: 'logMovement' })
  }

  // Mantener agregados de stock_levels
  const { data: levelRow, error: levelErr } = await supabase
    .from('stock_levels')
    .select('id, on_hand_qty, unit')
    .eq('location_id', params.locationId)
    .eq('supplier_item_id', params.supplierItemId)
    .maybeSingle()
  if (levelErr) {
    throw mapSupabaseError(levelErr, { module: 'inventory', operation: 'fetchStockLevel' })
  }
  const newQty = (Number(levelRow?.on_hand_qty ?? 0) || 0) + params.qty
  const levelUnit = levelRow?.unit ?? params.unit
  if (levelRow && levelRow.unit !== params.unit) {
    throw new Error('Unidad incompatible con el stock agregado')
  }
  const { error: upsertErr } = await supabase.from('stock_levels').upsert({
    id: levelRow?.id,
    org_id: params.orgId,
    location_id: params.locationId,
    supplier_item_id: params.supplierItemId,
    on_hand_qty: newQty,
    unit: levelUnit,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    throw mapSupabaseError(upsertErr, { module: 'inventory', operation: 'updateStockLevel' })
  }

  return batchId
}

export function useCreateManualEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createManualEntry,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stock_batches', vars.locationId] })
      qc.invalidateQueries({ queryKey: ['stock_levels', vars.locationId] })
    },
  })
}
