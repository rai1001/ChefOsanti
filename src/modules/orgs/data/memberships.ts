import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type OrgMembership = {
  orgId: string
  userId: string
  role: string
  isActive?: boolean
  orgName?: string
  orgSlug?: string
}

async function fetchMemberships(): Promise<OrgMembership[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('org_memberships')
    .select('org_id, user_id, role, is_active, orgs(name, slug)')
    .order('created_at', { ascending: true })

  if (error) {
    throw mapSupabaseError(error, {
      module: 'orgs',
      operation: 'fetchMemberships',
    })
  }

  return (
    data?.map((row: any) => ({
      orgId: row.org_id,
      userId: row.user_id,
      role:
        row.role === 'owner' ? 'admin' : row.role === 'member' ? 'staff' : (row.role as string),
      isActive: row.is_active ?? false,
      orgName: row.orgs?.name,
      orgSlug: row.orgs?.slug,
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
