import type { Hotel, OrgId } from '@/modules/orgs/domain/types'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

export async function createHotel(params: {
  orgId: OrgId
  name: string
  city?: string | null
  country?: string | null
  currency?: string | null
}): Promise<Hotel> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('hotels')
    .insert({
      org_id: params.orgId,
      name: params.name,
      city: params.city ?? null,
      country: params.country ?? null,
      currency: params.currency ?? 'EUR',
    })
    .select('*')
    .single()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'orgs',
      operation: 'createHotel',
      orgId: params.orgId,
    })
  }

  return {
    id: data.id,
    orgId: data.org_id,
    name: data.name,
    city: data.city ?? undefined,
    country: data.country ?? undefined,
    currency: data.currency,
  }
}

export function useOrgHotels(orgId?: OrgId) {
  return useQuery({
    queryKey: ['org_hotels', orgId],
    queryFn: () => listHotelsByOrg(orgId ?? ''),
    enabled: Boolean(orgId),
  })
}

export function useCreateHotel(orgId?: OrgId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; city?: string | null; country?: string | null; currency?: string | null }) => {
      if (!orgId) throw new Error('orgId requerido')
      return createHotel({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_hotels', orgId] })
    },
  })
}
