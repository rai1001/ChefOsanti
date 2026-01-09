import { useState, useEffect } from 'react'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { getEnv } from '@/config/env'

const { supabaseUrl } = getEnv()

export function DailyBriefModal({ onClose, weekStart }: { onClose: () => void; weekStart: string }) {
    const { activeOrgId } = useActiveOrgId()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const { session } = useSupabaseSession()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchBrief() {
            try {
                if (!session?.access_token) throw new Error('No active session')

                const res = await fetch(`${supabaseUrl}/functions/v1/daily_brief`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({ weekStart, orgId: activeOrgId }),
                })

                if (!res.ok) throw new Error(await res.text())
                const data = await res.json()
                setContent(data.content)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        if (activeOrgId) fetchBrief()
    }, [activeOrgId, weekStart])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nano-navy-900/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl rounded-2xl glass-panel bg-nano-navy-800/90 p-6 shadow-2xl max-h-[80vh] overflow-y-auto border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">✨</span> Daily Brief (IA)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Cerrar modal">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-nano-blue-500 border-t-transparent"></div>
                        <p className="text-nano-blue-400 font-medium animate-pulse">Generando resumen con Gemini...</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-200">
                        Error: {error}
                    </div>
                )}

                {content && (
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-300">
                        {content}
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all border border-white/5"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

export function OrderAuditModal({ onClose, orderId }: { onClose: () => void; orderId: string }) {
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { session } = useSupabaseSession()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function runAudit() {
            try {
                if (!session?.access_token) throw new Error('No active session')

                const res = await fetch(`${supabaseUrl}/functions/v1/order_audit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({ orderId }),
                })

                if (!res.ok) throw new Error(await res.text())
                const data = await res.json()
                setResult(data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        if (orderId) runAudit()
    }, [orderId])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nano-navy-900/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl glass-panel bg-nano-navy-800/90 p-6 shadow-2xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🔍</span> Auditoria IA
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Cerrar modal">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nano-orange-500 border-t-transparent"></div>
                        <p className="text-nano-orange-400 text-sm font-medium animate-pulse">Analizando pedido {orderId.slice(0, 8)}...</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-200">
                        Error: {error}
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className={`rounded-xl p-4 text-sm font-semibold border ${result.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{result.status === 'ok' ? '✅' : '⚠️'}</span>
                                Estado: {result.status === 'ok' ? 'Correcto' : 'Requiere Revisión'}
                            </div>
                        </div>

                        {result.findings?.length > 0 ? (
                            <div className="bg-nano-navy-900/50 rounded-xl p-4 border border-white/5">
                                <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">Hallazgos</h4>
                                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-2">
                                    {result.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic text-center py-2">No se encontraron anomalias en este pedido.</p>
                        )}
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all border border-white/5"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
