import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type PurchasingSettings = {
  orgId: string
  defaultBufferPercent: number
  defaultBufferQty: number
  considerReservations: boolean
}

export async function getPurchasingSettings(orgId: string): Promise<PurchasingSettings> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('purchasing_settings')
    .select('org_id, default_buffer_percent, default_buffer_qty, consider_reservations')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'getPurchasingSettings',
      orgId,
    })
  }

  if (!data) {
    return { orgId, defaultBufferPercent: 0, defaultBufferQty: 0, considerReservations: true }
  }

  return {
    orgId: data.org_id,
    defaultBufferPercent: Number(data.default_buffer_percent ?? 0),
    defaultBufferQty: Number(data.default_buffer_qty ?? 0),
    considerReservations: Boolean(data.consider_reservations ?? false),
  }
}
