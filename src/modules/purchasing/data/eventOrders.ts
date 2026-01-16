import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { MenuTemplateItem } from '@/modules/events/domain/menu'
import type { ServiceFormat } from '@/modules/events/domain/event'
import { computeServiceNeedsWithOverrides, type ServiceOverrides } from '@/modules/events/domain/overrides'
import type { SupplierItem } from '../domain/types'
import { mapNeedsToSupplierItems, normalizeAlias, type Need } from '../domain/eventDraftOrder'
import { getStockOnHand, getOnOrderQty } from './stock'
import { getPurchasingSettings } from './settings'
import { computeNetLine } from '../domain/netToBuy'
import { getReservedQtyByItem } from '@/modules/inventory/data/reservations'

export type EventPurchaseOrder = {
  id: string
  orgId: string
  hotelId: string
  eventId: string
  supplierId: string
  status: 'draft' | 'sent' | 'cancelled'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  orderNumber: string
  totalEstimated: number
  createdAt: string
}

export type EventPurchaseOrderLine = {
  id: string
  eventPurchaseOrderId: string
  supplierItemId: string
  itemLabel: string
  qty: number
  purchaseUnit: 'kg' | 'ud'
  unitPrice?: number | null
  lineTotal: number
  freeze: boolean
  bufferPercent: number
  bufferQty: number
  grossQty: number
  onHandQty: number
  onOrderQty: number
  netQty: number
  roundedQty: number
  unitMismatch: boolean
}

type EventPurchaseOrderRow = {
  id: string
  org_id: string
  hotel_id: string
  event_id: string
  supplier_id: string
  status: EventPurchaseOrder['status']
  approval_status?: EventPurchaseOrder['approvalStatus'] | null
  order_number: string
  total_estimated?: number | null
  created_at: string
}

type EventPurchaseOrderLineRow = {
  id: string
  event_purchase_order_id: string
  supplier_item_id: string
  item_label: string
  qty: number
  purchase_unit: EventPurchaseOrderLine['purchaseUnit']
  unit_price?: number | null
  line_total?: number | null
  freeze?: boolean | null
  buffer_percent?: number | null
  buffer_qty?: number | null
  gross_qty?: number | null
  on_hand_qty?: number | null
  on_order_qty?: number | null
  net_qty?: number | null
  rounded_qty?: number | null
  unit_mismatch?: boolean | null
}

type MenuTemplateItemRow = {
  id: string
  template_id: string
  name: string
  unit: string
  qty_per_pax_seated?: number | null
  qty_per_pax_standing?: number | null
  rounding_rule?: string | null
  pack_size?: number | null
  section?: string | null
}

function mapOrder(row: EventPurchaseOrderRow): EventPurchaseOrder {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    eventId: row.event_id,
    supplierId: row.supplier_id,
    status: row.status,
    approvalStatus: row.approval_status ?? 'pending',
    orderNumber: row.order_number,
    totalEstimated: row.total_estimated ?? 0,
    createdAt: row.created_at,
  }
}

function mapLine(row: EventPurchaseOrderLineRow): EventPurchaseOrderLine {
  return {
    id: row.id,
    eventPurchaseOrderId: row.event_purchase_order_id,
    supplierItemId: row.supplier_item_id,
    itemLabel: row.item_label,
    qty: row.qty,
    purchaseUnit: row.purchase_unit,
    unitPrice: row.unit_price,
    lineTotal: Number(row.line_total ?? 0),
    freeze: Boolean(row.freeze),
    bufferPercent: Number(row.buffer_percent ?? 0),
    bufferQty: Number(row.buffer_qty ?? 0),
    grossQty: Number(row.gross_qty ?? row.qty ?? 0),
    onHandQty: Number(row.on_hand_qty ?? 0),
    onOrderQty: Number(row.on_order_qty ?? 0),
    netQty: Number(row.net_qty ?? row.qty ?? 0),
    roundedQty: Number(row.rounded_qty ?? row.qty ?? 0),
    unitMismatch: Boolean(row.unit_mismatch ?? false),
  }
}

export async function listEventOrders(orgId: string): Promise<EventPurchaseOrder[]> {
  if (!orgId) throw new Error('OrgId requerido')
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_purchase_orders')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'listEventOrders',
      orgId,
    })
  }
  return data?.map(mapOrder) ?? []
}

export async function getEventOrder(orderId: string): Promise<{ order: EventPurchaseOrder; lines: EventPurchaseOrderLine[] }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_purchase_orders')
    .select('*, event_purchase_order_lines (*)')
    .eq('id', orderId)
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'getEventOrder',
      orderId,
    })
  }
  return { order: mapOrder(data), lines: (data.event_purchase_order_lines ?? []).map(mapLine) }
}

export function useEventOrders(orgId: string | undefined) {
  return useQuery({
    queryKey: ['event_orders', orgId],
    queryFn: () => listEventOrders(orgId!),
    enabled: Boolean(orgId),
  })
}

export function useEventOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['event_order', orderId],
    queryFn: () => getEventOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  })
}

export async function fetchEventNeeds(
  eventId: string,
): Promise<{ needs: Need[]; missingServices: string[] }> {
  const supabase = getSupabaseClient()
  const { data: services, error: svcError } = await supabase
    .from('event_services')
    .select('id, format, pax')
    .eq('event_id', eventId)
  if (svcError) {
    throw mapSupabaseError(svcError, {
      module: 'purchasing',
      operation: 'fetchEventNeeds',
      step: 'services',
      eventId,
    })
  }
  const serviceIds = services?.map((s) => s.id) ?? []
  if (!serviceIds.length) return { needs: [], missingServices: [] }

  const { data: menus, error: menuError } = await supabase
    .from('event_service_menus')
    .select('event_service_id, template_id')
    .in('event_service_id', serviceIds)
  if (menuError) {
    throw mapSupabaseError(menuError, {
      module: 'purchasing',
      operation: 'fetchEventNeeds',
      step: 'menus',
      eventId,
    })
  }

  const templateIds = menus?.map((m) => m.template_id).filter(Boolean) ?? []
  const itemsByTemplate = new Map<string, MenuTemplateItem[]>()
  if (templateIds.length) {
    const { data: items, error: itemsError } = await supabase
      .from('menu_template_items')
      .select('*')
      .in('template_id', templateIds)
    if (itemsError) {
      throw mapSupabaseError(itemsError, {
        module: 'purchasing',
        operation: 'fetchEventNeeds',
        step: 'templateItems',
        eventId,
      })
    }
    items?.forEach((row: MenuTemplateItemRow) => {
      const unit = row.unit === 'kg' ? 'kg' : 'ud'
      const roundingRule =
        row.rounding_rule === 'ceil_pack' || row.rounding_rule === 'ceil_unit' || row.rounding_rule === 'none'
          ? row.rounding_rule
          : 'none'
      const mapped: MenuTemplateItem = {
        id: row.id,
        name: row.name,
        unit,
        qtyPerPaxSeated: Number(row.qty_per_pax_seated ?? 0),
        qtyPerPaxStanding: Number(row.qty_per_pax_standing ?? 0),
        roundingRule,
        packSize: row.pack_size ?? null,
        section: row.section,
      }
      const list = itemsByTemplate.get(row.template_id) ?? []
      list.push(mapped)
      itemsByTemplate.set(row.template_id, list)
    })
  }

  const [excluded, added, replaced] = await Promise.all([
    supabase
      .from('event_service_excluded_items')
      .select('event_service_id, template_item_id')
      .in('event_service_id', serviceIds),
    supabase.from('event_service_added_items').select('*').in('event_service_id', serviceIds),
    supabase.from('event_service_replaced_items').select('*').in('event_service_id', serviceIds),
  ])
  if (excluded.error) {
    throw mapSupabaseError(excluded.error, {
      module: 'purchasing',
      operation: 'fetchEventNeeds',
      step: 'excluded',
      eventId,
    })
  }
  if (added.error) {
    throw mapSupabaseError(added.error, {
      module: 'purchasing',
      operation: 'fetchEventNeeds',
      step: 'added',
      eventId,
    })
  }
  if (replaced.error) {
    throw mapSupabaseError(replaced.error, {
      module: 'purchasing',
      operation: 'fetchEventNeeds',
      step: 'replaced',
      eventId,
    })
  }

  const needs: Need[] = []
  const missing: string[] = []

  services?.forEach((svc) => {
    const menu = menus?.find((m) => m.event_service_id === svc.id)
    if (!menu) {
      missing.push(svc.id)
      return
    }
    const templateItems = itemsByTemplate.get(menu.template_id) ?? []
    if (!templateItems.length) {
      missing.push(svc.id)
      return
    }

    const overrides: ServiceOverrides = {
      excluded:
        excluded.data
          ?.filter((e) => e.event_service_id === svc.id)
          .map((e) => ({ templateItemId: e.template_item_id })) ?? [],
      added:
        added.data
          ?.filter((a) => a.event_service_id === svc.id)
          .map((a) => ({
            name: a.name,
            unit: a.unit,
            qtyPerPaxSeated: a.qty_per_pax_seated,
            qtyPerPaxStanding: a.qty_per_pax_standing,
            roundingRule: a.rounding_rule,
            packSize: a.pack_size,
            section: a.section,
            notes: a.notes,
          })) ?? [],
      replaced:
        replaced.data
          ?.filter((r) => r.event_service_id === svc.id)
          .map((r) => ({
            templateItemId: r.template_item_id,
            replacement: {
              name: r.name,
              unit: r.unit,
              qtyPerPaxSeated: r.qty_per_pax_seated,
              qtyPerPaxStanding: r.qty_per_pax_standing,
              roundingRule: r.rounding_rule,
              packSize: r.pack_size,
              section: r.section,
              notes: r.notes,
            },
          })) ?? [],
    }

    const svcNeeds = computeServiceNeedsWithOverrides(
      svc.pax ?? 0,
      svc.format as ServiceFormat,
      templateItems,
      overrides,
    )
      .filter((n) => n.qtyRounded > 0)
      .map((n) => ({ label: n.name, unit: n.unit, qty: n.qtyRounded }))

    needs.push(...svcNeeds)
  })

  return { needs, missingServices: missing }
}

export function useEventNeeds(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event_needs', eventId],
    queryFn: () => fetchEventNeeds(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

async function getEventWindow(eventId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('events')
    .select('starts_at, ends_at, hotel_id')
    .eq('id', eventId)
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'getEventWindow',
      eventId,
    })
  }
  return {
    startsAt: data.starts_at as string,
    endsAt: (data.ends_at as string | null) ?? data.starts_at,
    hotelId: data.hotel_id as string,
  }
}

export async function createDraftOrders(params: {
  orgId: string
  hotelId: string
  eventId: string
  needs: Need[]
  aliases: { normalized: string; supplierItemId: string }[]
  supplierItems: SupplierItem[]
}) {
  const supabase = getSupabaseClient()
  const normalizedAliases = params.aliases.map((a) => ({
    normalized: normalizeAlias(a.normalized),
    supplierItemId: a.supplierItemId,
  }))
  const { mapped, unknown } = mapNeedsToSupplierItems(params.needs, normalizedAliases, params.supplierItems)
  if (unknown.length) {
    return { unknown, mismatches: [] as { supplierItemId: string; label: string }[] }
  }
  const supplierItemIds = mapped.map((m) => m.supplierItem.id)
  const [stockOnHand, onOrderMap, settings, eventWindow] = await Promise.all([
    getStockOnHand(params.orgId, params.hotelId, supplierItemIds),
    getOnOrderQty(params.orgId, supplierItemIds, params.eventId),
    getPurchasingSettings(params.orgId),
    getEventWindow(params.eventId),
  ])

  const reservedMap = settings.considerReservations
    ? await getReservedQtyByItem({
        orgId: params.orgId,
        hotelId: params.hotelId,
        supplierItemIds,
        windowStart: eventWindow.startsAt,
        windowEnd: eventWindow.endsAt,
        excludeEventId: params.eventId,
      })
    : {}

  // Agregar necesidades por supplier_item
  const aggregated = new Map<
    string,
    {
      supplierItem: SupplierItem
      supplierId: string
      grossQty: number
      needUnit: 'kg' | 'ud'
      label: string
      bufferPercent?: number
      bufferQty?: number
    }
  >()
  for (const need of mapped) {
    const key = need.supplierItem.id
    const existing = aggregated.get(key)
    if (existing) {
      existing.grossQty += need.qty
    } else {
      aggregated.set(key, {
        supplierItem: need.supplierItem,
        supplierId: need.supplierItem.supplierId,
        grossQty: need.qty,
        needUnit: need.unit,
        label: need.label,
      })
    }
  }

  const grouped = new Map<
    string,
    {
      supplierId: string
      lines: {
        supplierItem: SupplierItem
        label: string
        grossQty: number
        onHandQty: number
        onOrderQty: number
        netQty: number
        roundedQty: number
        bufferPercent: number
        bufferQty: number
        unitMismatch: boolean
      }[]
    }
  >()
  const mismatches: { supplierItemId: string; label: string }[] = []

  for (const agg of aggregated.values()) {
    const lineBufferPercent = settings.defaultBufferPercent
    const lineBufferQty = settings.defaultBufferQty

    const netRes = computeNetLine({
      supplierItemId: agg.supplierItem.id,
      label: agg.label,
      grossQty: agg.grossQty,
      onHandQty: Math.max(0, (stockOnHand[agg.supplierItem.id] ?? 0) - (reservedMap[agg.supplierItem.id] ?? 0)),
      onOrderQty: onOrderMap[agg.supplierItem.id] ?? 0,
      bufferPercent: lineBufferPercent,
      bufferQty: lineBufferQty,
      needUnit: agg.needUnit,
      purchaseUnit: agg.supplierItem.purchaseUnit,
      roundingRule: agg.supplierItem.roundingRule,
      packSize: agg.supplierItem.packSize,
    })

    if (netRes.kind === 'error') {
      mismatches.push({ supplierItemId: agg.supplierItem.id, label: agg.label })
      continue
    }

    if (!grouped.has(agg.supplierId)) {
      grouped.set(agg.supplierId, { supplierId: agg.supplierId, lines: [] })
    }
    grouped.get(agg.supplierId)!.lines.push({
      supplierItem: agg.supplierItem,
      label: agg.label,
      grossQty: netRes.grossQty,
      onHandQty: netRes.onHandQty,
      onOrderQty: netRes.onOrderQty,
      netQty: netRes.netQty,
      roundedQty: netRes.roundedQty,
      bufferPercent: lineBufferPercent,
      bufferQty: lineBufferQty,
      unitMismatch: false,
    })
  }

  if (mismatches.length) {
    return { unknown, mismatches }
  }

  const createdOrderIds: string[] = []
  for (const [idx, group] of Array.from(grouped.values()).entries()) {
    const { data: existing, error: existingErr } = await supabase
      .from('event_purchase_orders')
      .select('id, order_number')
      .eq('org_id', params.orgId)
      .eq('event_id', params.eventId)
      .eq('supplier_id', group.supplierId)
      .eq('status', 'draft')
      .maybeSingle()
    if (existingErr) {
      throw mapSupabaseError(existingErr, {
        module: 'purchasing',
        operation: 'createDraftOrders',
        step: 'checkExisting',
        eventId: params.eventId,
      })
    }
    let orderId = existing?.id as string | undefined
    const orderNumber = existing?.order_number ?? `EV-${params.eventId.slice(0, 6)}-${idx + 1}`
    const { data: orderRow, error: orderErr } = await supabase
      .from('event_purchase_orders')
      .upsert(
        {
          id: orderId,
          org_id: params.orgId,
          hotel_id: params.hotelId,
          event_id: params.eventId,
          supplier_id: group.supplierId,
          status: 'draft',
          order_number: orderNumber,
        },
        { onConflict: 'id' },
      )
      .select('id')
      .single()
    if (orderErr) {
      throw mapSupabaseError(orderErr, {
        module: 'purchasing',
        operation: 'createDraftOrders',
        step: 'upsertOrder',
        eventId: params.eventId,
      })
    }
    orderId = orderRow.id as string
    createdOrderIds.push(orderId)
    const { data: existingLinesRaw, error: fetchLinesErr } = await supabase
      .from('event_purchase_order_lines')
      .select('*')
      .eq('event_purchase_order_id', orderId)
    if (fetchLinesErr) {
      throw mapSupabaseError(fetchLinesErr, {
        module: 'purchasing',
        operation: 'createDraftOrders',
        step: 'fetchExistingLines',
        eventId: params.eventId,
      })
    }
    const existingLines = (existingLinesRaw ?? []) as EventPurchaseOrderLineRow[]
    const frozenLines = existingLines.filter((line) => Boolean(line.freeze))
    const frozenIds = frozenLines.map((line) => line.id)
    const frozenItemIds = new Set(frozenLines.map((line) => line.supplier_item_id))
    if (frozenIds.length !== existingLines.length) {
      await supabase
        .from('event_purchase_order_lines')
        .delete()
        .eq('event_purchase_order_id', orderId)
        .eq('freeze', false)
    }

    const linesToInsert = group.lines.filter((l) => l.roundedQty > 0 && !frozenItemIds.has(l.supplierItem.id))
    if (linesToInsert.length === 0 && frozenLines.length === 0) {
      // No hay nada que generar ni preservar
      await supabase.from('event_purchase_orders').delete().eq('id', orderId)
      continue
    }
    for (const line of linesToInsert) {
      const price = line.supplierItem.pricePerUnit ?? null
      const lineTotal = price ? price * line.roundedQty : 0
      const { error: lineErr } = await supabase.from('event_purchase_order_lines').insert({
        org_id: params.orgId,
        event_purchase_order_id: orderId,
        supplier_item_id: line.supplierItem.id,
        item_label: line.label,
        qty: line.roundedQty,
        purchase_unit: line.supplierItem.purchaseUnit,
        unit_price: price,
        line_total: lineTotal,
        buffer_percent: line.bufferPercent,
        buffer_qty: line.bufferQty,
        gross_qty: line.grossQty,
        on_hand_qty: line.onHandQty,
        on_order_qty: line.onOrderQty,
        net_qty: line.netQty,
        rounded_qty: line.roundedQty,
        unit_mismatch: line.unitMismatch,
      })
      if (lineErr) {
        throw mapSupabaseError(lineErr, {
          module: 'purchasing',
          operation: 'createDraftOrders',
          step: 'insertLine',
          eventId: params.eventId,
        })
      }
    }

    // Reinsert frozen lines untouched (if deletion happened)
    if (existingLines.some((line) => Boolean(line.freeze))) {
      for (const frozen of existingLines) {
        if (!frozen.freeze) continue
        const { error: reErr } = await supabase.from('event_purchase_order_lines').upsert(frozen, { onConflict: 'id' })
        if (reErr) {
          throw mapSupabaseError(reErr, {
            module: 'purchasing',
            operation: 'createDraftOrders',
            step: 'reinsertFrozen',
            eventId: params.eventId,
          })
        }
      }
    }
  }
  return { createdOrderIds, unknown: [], mismatches }
}

export function useCreateEventDraftOrders(orgId: string | undefined, hotelId: string | undefined, eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      needs: Need[]
      aliases: { normalized: string; supplierItemId: string }[]
      supplierItems: SupplierItem[]
    }) =>
      createDraftOrders({
        orgId: orgId ?? '',
        hotelId: hotelId ?? '',
        eventId: eventId ?? '',
        ...args,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_orders'] })
    },
  })
}

export type GenerateEventPurchaseOrdersResult = {
  orderIds: string[]
  missingItems: string[]
  versionNum: number | null
  created: number
  status?: 'blocked' | 'empty'
}

export async function generateEventPurchaseOrders(params: {
  serviceId: string
  versionReason?: string | null
  idempotencyKey?: string | null
  strict?: boolean
}): Promise<GenerateEventPurchaseOrdersResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('generate_event_purchase_orders', {
    p_event_service_id: params.serviceId,
    p_version_reason: params.versionReason ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_strict: params.strict ?? true,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'generateEventPurchaseOrders',
      serviceId: params.serviceId,
    })
  }
  return {
    orderIds: Array.isArray(data?.order_ids) ? data.order_ids : [],
    missingItems: Array.isArray(data?.missing_items) ? data.missing_items : [],
    versionNum: data?.version_num ?? null,
    created: Number(data?.created ?? 0),
    status: data?.status ?? undefined,
  }
}

export function useGenerateEventPurchaseOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: generateEventPurchaseOrders,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_orders'] })
    },
  })
}
