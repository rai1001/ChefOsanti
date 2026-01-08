import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'

export type OrgMembership = {
  orgId: string
  userId: string
  role: string
  isActive?: boolean
}

async function fetchMemberships(): Promise<OrgMembership[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('org_memberships')
    .select('org_id, user_id, role, is_active')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (
    data?.map((row) => ({
      orgId: row.org_id,
      userId: row.user_id,
      role:
        row.role === 'owner' ? 'admin' : row.role === 'member' ? 'staff' : (row.role as string),
      isActive: row.is_active ?? false,
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
