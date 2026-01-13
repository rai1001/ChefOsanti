export function computeExpiresAt(producedAt: string, shelfLifeDays: number): string | null {
  if (!producedAt || !Number.isFinite(shelfLifeDays)) return null
  const base = new Date(producedAt)
  if (!Number.isFinite(base.getTime())) return null
  const expires = new Date(base)
  expires.setUTCDate(expires.getUTCDate() + shelfLifeDays)
  return expires.toISOString()
}

export type PreparationRunInput = {
  preparationId: string
  orgId: string
  locationId: string
  producedQty: number
  producedUnit: string
  producedAt: string
  shelfLifeDays: number
  labelsCount?: number
}

export function buildRunAndBatch(input: PreparationRunInput) {
  const expiresAt = computeExpiresAt(input.producedAt, input.shelfLifeDays)
  const runRecord = {
    org_id: input.orgId,
    preparation_id: input.preparationId,
    produced_qty: input.producedQty,
    produced_unit: input.producedUnit,
    produced_at: input.producedAt,
    expires_at: expiresAt,
    location_id: input.locationId,
    labels_count: input.labelsCount ?? 1,
  }
  const batchRecord = {
    org_id: input.orgId,
    location_id: input.locationId,
    preparation_id: input.preparationId,
    supplier_item_id: null,
    qty: input.producedQty,
    unit: input.producedUnit,
    expires_at: expiresAt,
    lot_code: null,
    source: 'prep' as const,
  }
  return { runRecord, batchRecord, expiresAt }
}
