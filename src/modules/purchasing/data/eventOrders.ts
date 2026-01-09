import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { MenuTemplateItem } from '@/modules/events/domain/menu'
import type { ServiceFormat } from '@/modules/events/domain/event'
import { computeServiceNeedsWithOverrides, type ServiceOverrides } from '@/modules/events/domain/overrides'
import type { SupplierItem } from '../domain/types'
import {
  applyRoundingToLines,
  groupMappedNeeds,
  mapNeedsToSupplierItems,
  normalizeAlias,
  type Need,
} from '../domain/eventDraftOrder'

export type EventPurchaseOrder = {
  id: string
  orgId: string
  hotelId: string
  eventId: string
  supplierId: string
  status: 'draft' | 'sent' | 'cancelled'
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
}

function mapOrder(row: any): EventPurchaseOrder {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    eventId: row.event_id,
    supplierId: row.supplier_id,
    status: row.status,
    orderNumber: row.order_number,
    totalEstimated: row.total_estimated ?? 0,
    createdAt: row.created_at,
  }
}

function mapLine(row: any): EventPurchaseOrderLine {
  return {
    id: row.id,
    eventPurchaseOrderId: row.event_purchase_order_id,
    supplierItemId: row.supplier_item_id,
    itemLabel: row.item_label,
    qty: row.qty,
    purchaseUnit: row.purchase_unit,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
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
    items?.forEach((row: any) => {
      const mapped: MenuTemplateItem = {
        id: row.id,
        name: row.name,
        unit: row.unit,
        qtyPerPaxSeated: row.qty_per_pax_seated,
        qtyPerPaxStanding: row.qty_per_pax_standing,
        roundingRule: row.rounding_rule,
        packSize: row.pack_size,
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
    return { unknown }
  }
  const grouped = applyRoundingToLines(groupMappedNeeds(mapped))
  const createdOrderIds: string[] = []
  for (const [idx, group] of grouped.entries()) {
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
    await supabase.from('event_purchase_order_lines').delete().eq('event_purchase_order_id', orderId)
    for (const line of group.lines) {
      const price = line.supplierItem.pricePerUnit ?? null
      const lineTotal = price ? price * line.qty : 0
      const { error: lineErr } = await supabase.from('event_purchase_order_lines').insert({
        org_id: params.orgId,
        event_purchase_order_id: orderId,
        supplier_item_id: line.supplierItem.id,
        item_label: line.label,
        qty: line.qty,
        purchase_unit: line.unit,
        unit_price: price,
        line_total: lineTotal,
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
  }
  return { createdOrderIds, unknown: [] }
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
