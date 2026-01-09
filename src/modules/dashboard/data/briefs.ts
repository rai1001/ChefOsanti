import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { Brief, BriefPeriod } from '../domain/briefs'

export function useBriefs(orgId: string | undefined, period: BriefPeriod) {
    return useQuery({
        queryKey: ['briefs', orgId, period],
        queryFn: async () => {
            if (!orgId) return []
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('ai_briefs')
                .select('*')
                .eq('org_id', orgId)
                .eq('period', period)
                .order('created_at', { ascending: false })
                .limit(1)

            if (error) {
                throw mapSupabaseError(error, {
                    module: 'dashboard',
                    operation: 'useBriefs',
                    orgId,
                    period,
                })
            }
            return data as Brief[]
        },
        enabled: Boolean(orgId),
    })
}

export function useGenerateBrief(orgId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (period: BriefPeriod) => {
            if (!orgId) throw new Error('Org ID required')
            const supabase = getSupabaseClient()
            const { data, error } = await supabase.rpc('generate_daily_brief', {
                p_org_id: orgId,
                p_period: period,
            })
            if (error) {
                throw mapSupabaseError(error, {
                    module: 'dashboard',
                    operation: 'useGenerateBrief',
                    orgId,
                    period,
                })
            }
            return data // Returns the uuid of the new brief
        },
        onSuccess: (_, period) => {
            queryClient.invalidateQueries({ queryKey: ['briefs', orgId, period] })
        },
    })
}
