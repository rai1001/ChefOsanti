import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { ApprovalStatus } from './orders'

export type Approval = {
    id: string
    orgId: string
    entityType: 'purchase_order' | 'event_purchase_order'
    entityId: string
    status: ApprovalStatus
    approverId: string
    reason?: string
    createdAt: string
}

export async function createApproval(params: {
    orgId: string
    entityType: 'purchase_order' | 'event_purchase_order'
    entityId: string
    status: ApprovalStatus
    reason?: string
}): Promise<Approval> {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Usuario no autenticado')

    const { data, error } = await supabase
        .from('approvals')
        .insert({
            org_id: params.orgId,
            entity_type: params.entityType,
            entity_id: params.entityId,
            status: params.status,
            approver_id: user.id,
            reason: params.reason || null
        })
        .select('*')
        .single()

    if (error) {
        throw mapSupabaseError(error, {
            module: 'purchasing',
            operation: 'createApproval',
            entityId: params.entityId
        })
    }

    return {
        id: data.id,
        orgId: data.org_id,
        entityType: data.entity_type,
        entityId: data.entity_id,
        status: data.status,
        approverId: data.approver_id,
        reason: data.reason,
        createdAt: data.created_at
    }
}

export function useCreateApproval() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createApproval,
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['purchase_orders'] })
            qc.invalidateQueries({ queryKey: ['event_orders'] })
            qc.invalidateQueries({ queryKey: ['purchase_order', variables.entityId] })
            qc.invalidateQueries({ queryKey: ['event_order', variables.entityId] })
        }
    })
}
