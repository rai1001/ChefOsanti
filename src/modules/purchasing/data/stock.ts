import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

const PO_OPEN_STATUSES = ['draft', 'confirmed']
const EVENT_PO_OPEN_STATUSES = ['draft', 'sent']

export async function getStockOnHand(orgId: string, hotelId: string, supplierItemIds: string[]) {
  if (!orgId || supplierItemIds.length === 0) return {}
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('stock_levels')
    .select('supplier_item_id, on_hand_qty, inventory_locations!inner(hotel_id)')
    .eq('org_id', orgId)
    .in('supplier_item_id', supplierItemIds)

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'getStockOnHand',
      orgId,
    })
  }

  const result: Record<string, number> = {}
  for (const row of data ?? []) {
    const hotelMatch = row.inventory_locations?.hotel_id === hotelId || row.inventory_locations?.hotel_id === null
    if (!hotelMatch) continue
    const key = row.supplier_item_id as string
    const qty = Number(row.on_hand_qty ?? 0)
    result[key] = (result[key] ?? 0) + qty
  }
  return result
}

export async function getOnOrderQty(orgId: string, supplierItemIds: string[], excludeEventId?: string) {
  if (!orgId || supplierItemIds.length === 0) return {}
  const supabase = getSupabaseClient()

  const { data: poLines, error: poErr } = await supabase
    .from('purchase_order_lines')
    .select('supplier_item_id, requested_qty, received_qty, purchase_orders!inner(status, org_id)')
    .eq('purchase_orders.org_id', orgId)
    .in('purchase_orders.status', PO_OPEN_STATUSES)
    .in('supplier_item_id', supplierItemIds)

  if (poErr) {
    throw mapSupabaseError(poErr, {
      module: 'purchasing',
      operation: 'getOnOrderQty.purchase_orders',
      orgId,
    })
  }

  const { data: eventLines, error: eventErr } = await supabase
    .from('event_purchase_order_lines')
    .select('supplier_item_id, qty, event_purchase_orders!inner(status, org_id, event_id)')
    .eq('event_purchase_orders.org_id', orgId)
    .in('event_purchase_orders.status', EVENT_PO_OPEN_STATUSES)
    .in('supplier_item_id', supplierItemIds)

  if (eventErr) {
    throw mapSupabaseError(eventErr, {
      module: 'purchasing',
      operation: 'getOnOrderQty.event_orders',
      orgId,
    })
  }

  const result: Record<string, number> = {}

  for (const row of poLines ?? []) {
    const remaining = Number(row.requested_qty ?? 0) - Number(row.received_qty ?? 0)
    if (remaining <= 0) continue
    const key = row.supplier_item_id as string
    result[key] = (result[key] ?? 0) + remaining
  }

  for (const row of eventLines ?? []) {
    const evtId = row.event_purchase_orders?.event_id as string | undefined
    if (excludeEventId && evtId === excludeEventId) continue
    const key = row.supplier_item_id as string
    const qty = Number(row.qty ?? 0)
    result[key] = (result[key] ?? 0) + qty
  }

  return result
}
