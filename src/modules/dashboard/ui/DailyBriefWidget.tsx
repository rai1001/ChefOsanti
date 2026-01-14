import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { canUseFeature } from '@/modules/auth/domain/aiAccess'
import { useOrgPlan } from '@/modules/orgs/data/orgPlans'
import { useBriefs, useGenerateBrief } from '../data/briefs'
import type { BriefPeriod } from '../domain/briefs'

export function DailyBriefWidget() {
    const { activeOrgId } = useActiveOrgId()
    const { role } = useCurrentRole()
    const { data: plan } = useOrgPlan(activeOrgId ?? undefined)
    const [period, setPeriod] = useState<BriefPeriod>('today')
    const [isOpen, setIsOpen] = useState(false)

    const briefs = useBriefs(activeOrgId ?? undefined, period)
    const generate = useGenerateBrief(activeOrgId ?? undefined)

    const planTier = plan ?? 'basic'
    const canDailyBrief = canUseFeature(role, planTier, 'daily_brief')
    const canOcrReview = canUseFeature(role, planTier, 'ocr_review')
    const canOrderAudit = canUseFeature(role, planTier, 'order_audit')
    const canUse = canDailyBrief

    const currentBrief = briefs.data?.[0]

    const handleGenerate = () => {
        generate.mutate(period)
    }

    return (
        <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-6 shadow-xl backdrop-blur-sm animate-fade-in relative overflow-hidden group" data-testid="ai-access-panel">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -tr-16 w-32 h-32 bg-nano-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">⚡</span> Brief Operativo
                </h2>

                {!canUse && (
                    <span className="text-[10px] items-center gap-1 flex rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-medium text-orange-400">
                        PRO
                    </span>
                )}
            </div>

            <div className="grid gap-2 mb-4">
                <button
                    type="button"
                    data-testid="btn-daily_brief"
                    disabled={!canDailyBrief}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Daily Brief
                </button>
                <button
                    type="button"
                    data-testid="btn-ocr_review"
                    disabled={!canOcrReview}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    OCR Review
                </button>
                <button
                    type="button"
                    data-testid="btn-order_audit"
                    disabled={!canOrderAudit}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Order Audit
                </button>
            </div>

            {!canUse ? (
                <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-slate-400">
                        Obtén un resumen diario de tus operaciones con IA.
                    </p>
                    <button disabled className="mt-2 w-full rounded-lg bg-white/5 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed">
                        Disponible en Plan PRO
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-nano-navy-900/50 p-1 rounded-lg">
                        {(['today', 'tomorrow', 'week'] as BriefPeriod[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${period === p
                                        ? 'bg-nano-blue-600/20 text-nano-blue-300 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {p === 'today' ? 'Hoy' : p === 'tomorrow' ? 'Mañana' : 'Semana'}
                            </button>
                        ))}
                    </div>

                    {/* Content Preview */}
                    <div className="min-h-[100px] rounded-lg border border-white/5 bg-white/5 p-4 text-sm text-slate-300">
                        {briefs.isLoading ? (
                            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                                <span className="animate-pulse">Cargando...</span>
                            </div>
                        ) : currentBrief ? (
                            <div className="space-y-2">
                                <p className="line-clamp-3 whitespace-pre-wrap">{currentBrief.content_md.split('\n')[0]}</p>
                                <button onClick={() => setIsOpen(true)} className="text-xs text-nano-blue-400 hover:text-nano-blue-300 underline">
                                    Ver completo
                                </button>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    Generado: {new Date(currentBrief.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-2">
                                <p>No hay brief generado.</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={generate.isPending}
                        className="w-full rounded-lg bg-nano-blue-600 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {generate.isPending ? (<span className="animate-spin text-lg">⟳</span>) : (<span>✨ Generar Brief</span>)}
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {isOpen && currentBrief && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
                    <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-nano-navy-900 p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <header className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Brief Operativo</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </header>
                        <div className="prose prose-invert prose-sm max-w-none">
                            {/* Simple renderer since we don't have react-markdown */}
                            {currentBrief.content_md.split('\n').map((line, i) => {
                                if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mb-4">{line.replace('# ', '')}</h1>
                                if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-nano-blue-300 mt-6 mb-3 border-b border-white/10 pb-1">{line.replace('## ', '')}</h2>
                                if (line.startsWith('- [ ]')) return <div key={i} className="flex gap-2 items-start my-1"><input type="checkbox" readOnly className="mt-1" /> <span className="text-slate-300">{line.replace('- [ ]', '')}</span></div>
                                if (line.startsWith('>')) return <blockquote key={i} className="border-l-4 border-nano-blue-500/50 pl-4 py-1 my-2 bg-nano-blue-500/10 text-slate-200 italic">{line.replace(/>/, '').replace(/\[!(NOTE|WARNING)\]/, '')}</blockquote>
                                return <p key={i} className="mb-1 text-slate-300">{line}</p>
                            })}
                        </div>
                        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                            <button onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
