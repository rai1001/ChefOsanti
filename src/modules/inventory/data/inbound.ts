import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type InboundLineInput = {
  supplierItemId?: string | null
  description: string
  qty: number
  unit: string
  expiresAt?: string | null
  lotCode?: string | null
  status: 'ready' | 'blocked' | 'skipped'
  importLine?: boolean
}

export type InboundShipmentInput = {
  orgId: string
  locationId: string
  supplierId?: string | null
  supplierName?: string | null
  deliveryNoteNumber?: string | null
  deliveredAt?: string | null
  source: 'ocr' | 'manual'
  rawOcrText?: string | null
  dedupeKey?: string | null
  lines: InboundLineInput[]
  createdBy?: string | null
}

async function updateStockForLine(params: {
  orgId: string
  locationId: string
  supplierItemId: string
  qty: number
  unit: string
  expiresAt?: string | null
  lotCode?: string | null
  source?: 'purchase' | 'prep' | 'adjustment'
  createdBy?: string | null
}) {
  const supabase = getSupabaseClient()

  const { data: itemRow, error: itemErr } = await supabase
    .from('supplier_items')
    .select('id, purchase_unit')
    .eq('id', params.supplierItemId)
    .maybeSingle()
  if (itemErr) throw mapSupabaseError(itemErr, { module: 'inventory', operation: 'fetchSupplierItem' })
  if (itemRow?.purchase_unit && itemRow.purchase_unit !== params.unit) {
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
      source: params.source ?? 'purchase',
      created_by: params.createdBy ?? null,
    })
    .select('id')
    .single()
  if (batchErr) throw mapSupabaseError(batchErr, { module: 'inventory', operation: 'createBatch' })

  const { error: mvErr } = await supabase.from('stock_movements').insert({
    org_id: params.orgId,
    batch_id: batchRow.id,
    delta_qty: params.qty,
    reason: params.source ?? 'purchase',
    note: 'Importar albarán',
    created_by: params.createdBy ?? null,
  })
  if (mvErr) throw mapSupabaseError(mvErr, { module: 'inventory', operation: 'logMovement' })

  const { data: levelRow, error: levelErr } = await supabase
    .from('stock_levels')
    .select('id, on_hand_qty, unit')
    .eq('location_id', params.locationId)
    .eq('supplier_item_id', params.supplierItemId)
    .maybeSingle()
  if (levelErr) throw mapSupabaseError(levelErr, { module: 'inventory', operation: 'fetchStockLevel' })

  if (levelRow && levelRow.unit !== params.unit) {
    throw new Error('Unidad incompatible con el stock agregado')
  }
  const newQty = (Number(levelRow?.on_hand_qty ?? 0) || 0) + params.qty
  const { error: upsertErr } = await supabase.from('stock_levels').upsert({
    id: levelRow?.id,
    org_id: params.orgId,
    location_id: params.locationId,
    supplier_item_id: params.supplierItemId,
    on_hand_qty: newQty,
    unit: levelRow?.unit ?? params.unit,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) throw mapSupabaseError(upsertErr, { module: 'inventory', operation: 'updateStockLevel' })
}

export async function createInboundShipment(input: InboundShipmentInput) {
  if (!input.lines.length) throw new Error('Debes añadir al menos una línea')
  const supabase = getSupabaseClient()

  const { data: shipment, error: shipmentErr } = await supabase
    .from('inbound_shipments')
    .insert({
      org_id: input.orgId,
      location_id: input.locationId,
      supplier_id: input.supplierId ?? null,
      supplier_name: input.supplierName ?? null,
      delivery_note_number: input.deliveryNoteNumber ?? null,
      delivered_at: input.deliveredAt ?? null,
      source: input.source,
      raw_ocr_text: input.rawOcrText ?? null,
      dedupe_key: input.dedupeKey ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single()

  if (shipmentErr) {
    throw mapSupabaseError(shipmentErr, { module: 'inventory', operation: 'createInboundShipment' })
  }
  const shipmentId = shipment.id as string

  const linesToPersist = input.lines.map((l) => ({
    org_id: input.orgId,
    shipment_id: shipmentId,
    supplier_item_id: l.supplierItemId ?? null,
    description: l.description,
    qty: l.qty,
    unit: l.unit,
    expires_at: l.expiresAt ?? null,
    lot_code: l.lotCode ?? null,
    status: l.status,
  }))

  const { error: linesErr } = await supabase.from('inbound_shipment_lines').insert(linesToPersist)
  if (linesErr) {
    throw mapSupabaseError(linesErr, { module: 'inventory', operation: 'createInboundLines' })
  }

  for (const line of input.lines) {
    if (line.status !== 'ready' || line.importLine === false) continue
    if (!line.supplierItemId) continue
    await updateStockForLine({
      orgId: input.orgId,
      locationId: input.locationId,
      supplierItemId: line.supplierItemId,
      qty: line.qty,
      unit: line.unit,
      expiresAt: line.expiresAt ?? null,
      lotCode: line.lotCode ?? null,
      source: 'purchase',
      createdBy: input.createdBy ?? null,
    })
  }

  return shipmentId
}

export function useCreateInboundShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInboundShipment,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stock_batches', vars.locationId] })
      qc.invalidateQueries({ queryKey: ['stock_levels', vars.locationId] })
      qc.invalidateQueries({ queryKey: ['inbound_shipments', vars.orgId] })
    },
  })
}
