import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { isValidUuid } from '@/lib/utils'

export type InboundMissingExpiryLine = {
  lineId: string
  shipmentId: string
  locationId: string
  hotelId: string | null
  locationName: string
  supplierName: string
  description: string
  qty: number
  unit: string
  deliveredAt: string | null
  createdAt: string
}

export async function listInboundMissingExpiry(params: {
  orgId: string
  hotelId?: string
  locationId?: string
}) {
  if (!isValidUuid(params.orgId)) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('list_inbound_missing_expiry', {
    p_org_id: params.orgId,
    p_hotel_id: params.hotelId ?? null,
    p_location_id: params.locationId ?? null,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'inventory',
      operation: 'listInboundMissingExpiry',
      orgId: params.orgId,
    })
  }
  return (
    (data as any[])?.map((row) => ({
      lineId: row.line_id,
      shipmentId: row.shipment_id,
      locationId: row.location_id,
      hotelId: row.hotel_id ?? null,
      locationName: row.location_name,
      supplierName: row.supplier_name,
      description: row.description,
      qty: Number(row.qty ?? 0),
      unit: row.unit,
      deliveredAt: row.delivered_at ?? null,
      createdAt: row.created_at,
    })) ?? []
  ) as InboundMissingExpiryLine[]
}

export function useInboundMissingExpiry(params: {
  orgId: string | undefined
  hotelId?: string
  locationId?: string
}) {
  return useQuery({
    queryKey: ['inbound_missing_expiry', params.orgId, params.hotelId, params.locationId],
    queryFn: () =>
      listInboundMissingExpiry({
        orgId: params.orgId ?? '',
        hotelId: params.hotelId,
        locationId: params.locationId,
      }),
    enabled: Boolean(params.orgId),
  })
}
