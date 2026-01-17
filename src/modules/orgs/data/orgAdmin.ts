import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { getEnv } from '@/config/env'
import { mapSupabaseError } from '@/lib/shared/errors'

const { supabaseUrl } = getEnv()

export type OrgMember = {
  userId: string
  email: string | null
  role: string
  isActive: boolean
  createdAt: string
}

export type InviteOrgMemberResult = {
  invited: boolean
  userId: string
  orgId: string
  role: string
  email: string
}

export type RemoveOrgMemberResult = {
  removed: string | null
  deleteAuth: boolean
}

function mapMember(row: any): OrgMember {
  return {
    userId: row.user_id,
    email: row.email ?? null,
    role: row.role,
    isActive: Boolean(row.is_active ?? false),
    createdAt: row.created_at,
  }
}

async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('org_list_members', { p_org_id: orgId })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'orgs',
      operation: 'fetchOrgMembers',
      orgId,
    })
  }
  return (data as any[] | null)?.map(mapMember) ?? []
}

async function callOrgAdmin(payload: Record<string, unknown>) {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(`${supabaseUrl}/functions/v1/org_admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const parsed = JSON.parse(text)
      throw new Error(parsed.error || text)
    } catch {
      throw new Error(text)
    }
  }
  return res.json()
}

export async function inviteOrgMember(params: {
  orgId: string
  email: string
  role: 'admin' | 'manager' | 'staff'
}): Promise<InviteOrgMemberResult> {
  return callOrgAdmin({
    action: 'invite',
    orgId: params.orgId,
    email: params.email,
    role: params.role,
  }) as Promise<InviteOrgMemberResult>
}

export async function removeOrgMember(params: {
  orgId: string
  userId: string
  deleteAuth?: boolean
}): Promise<RemoveOrgMemberResult> {
  return callOrgAdmin({
    action: 'remove',
    orgId: params.orgId,
    userId: params.userId,
    deleteAuth: Boolean(params.deleteAuth),
  }) as Promise<RemoveOrgMemberResult>
}

export function useOrgMembers(orgId?: string) {
  return useQuery({
    queryKey: ['org_members', orgId],
    queryFn: () => fetchOrgMembers(orgId ?? ''),
    enabled: Boolean(orgId),
  })
}

export function useInviteOrgMember(orgId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { email: string; role: 'admin' | 'manager' | 'staff' }) => {
      if (!orgId) throw new Error('orgId requerido')
      return inviteOrgMember({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_members', orgId] })
    },
  })
}

export function useRemoveOrgMember(orgId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: string; deleteAuth?: boolean }) => {
      if (!orgId) throw new Error('orgId requerido')
      return removeOrgMember({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_members', orgId] })
    },
  })
}
