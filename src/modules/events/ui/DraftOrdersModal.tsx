import { useState, useMemo } from 'react'
import type { MenuItemAlias } from '@/modules/purchasing/data/aliases'
import type { SupplierItem } from '@/modules/purchasing/domain/types'
import {
    applyRoundingToLines,
    groupMappedNeeds,
    mapNeedsToSupplierItems,
    type Need,
} from '@/modules/purchasing/domain/eventDraftOrder'
import type { useCreateEventDraftOrders } from '@/modules/purchasing/data/eventOrders'

interface Props {
    needs: Need[]
    missingServices: string[]
    aliases: MenuItemAlias[]
    supplierItems: SupplierItem[]
    onClose: () => void
    onCreated: (ids: string[]) => void
    onSaveAlias: (aliasText: string, supplierItemId: string) => Promise<void>
    createDraftOrders: ReturnType<typeof useCreateEventDraftOrders>
    loading: boolean
}

export function DraftOrdersModal({
    needs,
    missingServices,
    aliases,
    supplierItems,
    onClose,
    onCreated,
    onSaveAlias,
    createDraftOrders,
    loading,
}: Props) {
    const [pendingAliases, setPendingAliases] = useState<Record<string, string>>({})
    const [localError, setLocalError] = useState<string | null>(null)
    const savedAliasList = useMemo(
        () => aliases.map((a) => ({ normalized: a.normalized, supplierItemId: a.supplierItemId })),
        [aliases],
    )
    const { mapped, unknown } = useMemo(
        () => mapNeedsToSupplierItems(needs, savedAliasList, supplierItems),
        [needs, savedAliasList, supplierItems],
    )
    const preview = useMemo(() => applyRoundingToLines(groupMappedNeeds(mapped)), [mapped])

    const supplierItemOptions = supplierItems.map((si) => ({
        value: si.id,
        label: `${si.name} (${si.purchaseUnit})`,
    }))

    const handleCreate = async () => {
        if (unknown.length) {
            setLocalError('Mapea todos los items antes de generar.')
            return
        }
        setLocalError(null)
        const result = await createDraftOrders.mutateAsync({
            needs,
            aliases: savedAliasList,
            supplierItems,
        })
        if (result.unknown?.length) {
            setLocalError('Quedan items sin mapear.')
            return
        }
        onCreated(result.createdOrderIds ?? [])
    }

    const saveAlias = async (label: string) => {
        const supplierItemId = pendingAliases[label]
        if (!supplierItemId) return
        setLocalError(null)
        await onSaveAlias(label, supplierItemId)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true">
            <div className="w-full max-w-4xl rounded-xl bg-nano-navy-900 border border-white/10 p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Generar pedidos borrador</h3>
                    <button className="text-sm text-slate-400 hover:text-white transition-colors" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
                <div className="mt-2 space-y-4">
                    {loading && <p className="text-sm text-slate-400">Cargando datos...</p>}
                    {missingServices.length > 0 && (
                        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                            {missingServices.length} servicios sin plantilla se omitirán.
                        </div>
                    )}
                    {localError && (
                        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400 font-semibold">
                            {localError}
                        </div>
                    )}

                    {unknown.length > 0 && (
                        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-sm font-semibold text-amber-300">Items sin mapping</p>
                            <div className="mt-2 space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {unknown.map((n, idx) => (
                                    <div key={`${n.label}-${idx}`} className="flex flex-col gap-2 rounded border border-white/10 bg-white/5 p-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-200">{n.label}</p>
                                            <p className="text-xs text-slate-400">Cantidad: {n.qty.toFixed(2)} {n.unit}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                            <select
                                                className="rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                                                value={pendingAliases[n.label] ?? ''}
                                                onChange={(e) => setPendingAliases((prev) => ({ ...prev, [n.label]: e.target.value }))}
                                            >
                                                <option value="">Selecciona item proveedor</option>
                                                {supplierItemOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="rounded-md border border-nano-blue-500/30 bg-nano-blue-500/10 px-3 py-1 text-xs font-semibold text-nano-blue-300 hover:bg-nano-blue-500/20 transition-all disabled:opacity-50"
                                                disabled={!pendingAliases[n.label]}
                                                onClick={() => saveAlias(n.label)}
                                            >
                                                Guardar alias
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {unknown.length === 0 && preview.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-200">Vista previa del pedido</p>
                            <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {preview.map(p => (
                                    <div key={p.supplierId} className="rounded-lg border border-white/5 bg-white/5 p-3">
                                        <p className="text-xs font-bold text-nano-blue-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Proveedor ID: {p.supplierId}</p>
                                        <div className="space-y-1">
                                            {p.lines.map((l, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-300">{l.label}</span>
                                                    <span className="font-mono text-slate-400">{l.qty.toFixed(2)} {l.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                        <button
                            onClick={handleCreate}
                            className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 hover:bg-nano-blue-500 transition-all disabled:opacity-50"
                            disabled={loading || createDraftOrders.isPending}
                        >
                            {createDraftOrders.isPending ? 'Creando...' : 'Generar pedidos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
