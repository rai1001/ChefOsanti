
import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { WasteReason } from '../domain/types'

function mapReason(row: any): WasteReason {
    return {
        id: row.id,
        orgId: row.org_id,
        name: row.name,
        isActive: row.is_active,
        createdAt: row.created_at,
    }
}

export async function listWasteReasons(orgId: string): Promise<WasteReason[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('waste_reasons')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name')

    if (error) {
        throw mapSupabaseError(error, {
            module: 'waste',
            operation: 'listWasteReasons',
            orgId,
        })
    }

    return data?.map(mapReason) ?? []
}

export function useWasteReasons(orgId: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ['waste_reasons', orgId],
        queryFn: () => listWasteReasons(orgId!),
        enabled: enabled && Boolean(orgId),
    })
}
