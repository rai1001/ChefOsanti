import type { Hotel, OrgId } from '@/modules/orgs/domain/types'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export async function listHotelsByOrg(orgId: OrgId): Promise<Hotel[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('hotels').select('*').eq('org_id', orgId)

  if (error) {
    throw mapSupabaseError(error, {
      module: 'orgs',
      operation: 'listHotelsByOrg',
      orgId,
    })
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
