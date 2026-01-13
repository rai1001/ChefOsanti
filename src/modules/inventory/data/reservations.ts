import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

type ReservationLineInput = {
  supplierItemId: string
  qty: number
  unit: 'kg' | 'ud'
  source?: 'gross_need' | 'net_need' | 'manual'
  note?: string | null
}

export async function upsertReservationForEvent(params: {
  orgId: string
  hotelId: string
  locationId?: string | null
  eventId: string
  eventServiceId?: string | null
  lines: ReservationLineInput[]
  createdBy?: string | null
}) {
  const supabase = getSupabaseClient()
  // close existing active reservation for same event/service
  const { data: existing, error: existingErr } = await supabase
    .from('stock_reservations')
    .select('id')
    .eq('org_id', params.orgId)
    .eq('event_id', params.eventId)
    .eq('event_service_id', params.eventServiceId ?? null)
    .eq('status', 'active')
    .maybeSingle()
  if (existingErr) {
    throw mapSupabaseError(existingErr, {
      module: 'inventory',
      operation: 'upsertReservationForEvent',
      step: 'fetchExisting',
      eventId: params.eventId,
    })
  }

  const { data: resRow, error: resErr } = await supabase
    .from('stock_reservations')
    .upsert(
      {
        id: existing?.id,
        org_id: params.orgId,
        hotel_id: params.hotelId,
        location_id: params.locationId ?? null,
        event_id: params.eventId,
        event_service_id: params.eventServiceId ?? null,
        status: 'active',
        reserved_at: new Date().toISOString(),
        created_by: params.createdBy ?? null,
      },
      { onConflict: 'id' },
    )
    .select('id')
    .single()

  if (resErr) {
    throw mapSupabaseError(resErr, {
      module: 'inventory',
      operation: 'upsertReservationForEvent',
      step: 'upsert',
      eventId: params.eventId,
    })
  }

  const reservationId = resRow.id as string
  await supabase.from('stock_reservation_lines').delete().eq('reservation_id', reservationId)
  for (const line of params.lines) {
    const { error: lineErr } = await supabase.from('stock_reservation_lines').insert({
      org_id: params.orgId,
      reservation_id: reservationId,
      supplier_item_id: line.supplierItemId,
      qty: line.qty,
      unit: line.unit,
      source: line.source ?? 'net_need',
      note: line.note ?? null,
    })
    if (lineErr) {
      throw mapSupabaseError(lineErr, {
        module: 'inventory',
        operation: 'upsertReservationForEvent',
        step: 'insertLine',
        eventId: params.eventId,
      })
    }
  }

  return reservationId
}

export async function releaseReservation(eventId: string, eventServiceId?: string | null) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('stock_reservations')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('event_service_id', eventServiceId ?? null)
    .eq('status', 'active')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'inventory',
      operation: 'releaseReservation',
      eventId,
    })
  }
}

export async function getReservedQtyByItem(params: {
  orgId: string
  hotelId: string
  supplierItemIds: string[]
  windowStart: string
  windowEnd: string
  excludeEventId?: string
}) {
  if (params.supplierItemIds.length === 0) return {}
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .rpc('reserved_qty_by_window', {
      p_org_id: params.orgId,
      p_hotel_id: params.hotelId,
      p_item_ids: params.supplierItemIds,
      p_window_start: params.windowStart,
      p_window_end: params.windowEnd,
      p_exclude_event_id: params.excludeEventId ?? null,
    })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'inventory',
      operation: 'getReservedQtyByItem',
      orgId: params.orgId,
    })
  }
  const result: Record<string, number> = {}
  ;(data ?? []).forEach((row: any) => {
    result[row.supplier_item_id] = Number(row.reserved_qty ?? 0)
  })
  return result
}

export async function listReservationsByEvent(eventId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('id, status, reserved_at, released_at, event_service_id, hotel_id, stock_reservation_lines (supplier_item_id, qty, unit)')
    .eq('event_id', eventId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'inventory',
      operation: 'listReservationsByEvent',
      eventId,
    })
  }
  return data ?? []
}

export function useReservationsByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['reservations', eventId],
    queryFn: () => listReservationsByEvent(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}
