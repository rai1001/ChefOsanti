import type { Hotel, OrgId } from '@/modules/orgs/domain/types'
import { getSupabaseClient } from '@/lib/supabaseClient'

export async function listHotelsByOrg(orgId: OrgId): Promise<Hotel[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('hotels').select('*').eq('org_id', orgId)

  if (error) {
    throw error
  }

  return (
    data?.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      currency: row.currency,
    })) ?? []
  )
}
