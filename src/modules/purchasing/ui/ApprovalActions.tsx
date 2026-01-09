import { useState } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { useCreateApproval } from '../data/approvals'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import type { ApprovalStatus } from '../data/orders'

interface ApprovalActionsProps {
    entityType: 'purchase_order' | 'event_purchase_order'
    entityId: string
    currentStatus: ApprovalStatus
}

export function ApprovalActions({ entityType, entityId, currentStatus }: ApprovalActionsProps) {
    const { activeOrgId } = useActiveOrgId()
    const { role } = useCurrentRole()
    const createApproval = useCreateApproval()
    const [reason, setReason] = useState('')
    const [isRejecting, setIsRejecting] = useState(false)

    // Only owners or admins can approve/reject
    const canApprove = can(role, 'purchasing:approve')

    if (!canApprove) return null
    if (currentStatus !== 'pending') {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${currentStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                {currentStatus === 'approved' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {currentStatus === 'approved' ? 'Aprobado' : 'Rechazado'}
            </div>
        )
    }

    const handleAction = async (status: ApprovalStatus) => {
        if (!activeOrgId) return
        try {
            await createApproval.mutateAsync({
                orgId: activeOrgId,
                entityType,
                entityId,
                status,
                reason: status === 'rejected' ? reason : undefined
            })
            setReason('')
            setIsRejecting(false)
        } catch (err) {
            console.error('Error in approval action:', err)
        }
    }

    return (
        <div className="flex flex-col gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Aprobación pendiente
            </div>

            {!isRejecting ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('approved')}
                        disabled={createApproval.isPending}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        Aprobar
                    </button>
                    <button
                        onClick={() => setIsRejecting(true)}
                        disabled={createApproval.isPending}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-4 py-2 rounded-lg font-medium transition-colors border border-rose-500/30"
                    >
                        <X className="w-4 h-4" />
                        Rechazar
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo del rechazo (opcional)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        rows={2}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction('rejected')}
                            disabled={createApproval.isPending}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Confirmar Rechazo
                        </button>
                        <button
                            onClick={() => setIsRejecting(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
