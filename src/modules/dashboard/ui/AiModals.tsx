import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { getEnv } from '@/config/env'

const { supabaseUrl } = getEnv()

export function DailyBriefModal({ onClose, weekStart }: { onClose: () => void; weekStart: string }) {
    const { activeOrgId } = useActiveOrgId()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchBrief() {
            try {
                const supabase = getSupabaseClient()
                const { data: { session } } = await supabase.auth.getSession()

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Daily Brief (IA)</h3>
                {loading && <p className="text-slate-600">Generando resumen con Gemini...</p>}
                {error && <p className="text-red-600">Error: {error}</p>}
                {content && (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
                        {content}
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">
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
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function runAudit() {
            try {
                const supabase = getSupabaseClient()
                const { data: { session } } = await supabase.auth.getSession()

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Auditoria de Pedido (IA)</h3>
                {loading && <p className="text-slate-600">Analizando pedido {orderId.slice(0, 8)}...</p>}
                {error && <p className="text-red-600">Error: {error}</p>}

                {result && (
                    <div className="space-y-4">
                        <div className={`rounded p-3 text-sm font-semibold ${result.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            Estado: {result.status === 'ok' ? 'Correcto' : 'Revisar'}
                        </div>

                        {result.findings?.length > 0 ? (
                            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                                {result.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-600">No se encontraron anomalias.</p>
                        )}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
