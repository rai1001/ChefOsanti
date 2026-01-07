import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'

export type OrgMembership = {
  orgId: string
  userId: string
  role: string
}

async function fetchMemberships(): Promise<OrgMembership[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('org_memberships')
    .select('org_id, user_id, role')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (
    data?.map((row) => ({
      orgId: row.org_id,
      userId: row.user_id,
      role: row.role,
    })) ?? []
  )
}

export function useUserMemberships(enabled = true) {
  return useQuery({
    queryKey: ['org_memberships'],
    queryFn: fetchMemberships,
    enabled,
  })
}
