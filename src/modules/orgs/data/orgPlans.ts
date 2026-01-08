import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { PlanTier } from '@/modules/auth/domain/aiAccess'

export async function fetchOrgPlan(orgId: string | undefined): Promise<PlanTier> {
  if (!orgId) return 'basic'
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('org_plans').select('plan').eq('org_id', orgId).maybeSingle()
  if (error) throw error
  const plan = (data?.plan as PlanTier | undefined) ?? 'basic'
  return plan
}

export function useOrgPlan(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org_plan', orgId],
    queryFn: () => fetchOrgPlan(orgId),
    enabled: Boolean(orgId),
    initialData: 'basic' as PlanTier,
  })
}
