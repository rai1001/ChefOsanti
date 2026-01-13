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
    const previewRows = useMemo(
        () =>
            preview.flatMap((p) =>
                p.lines.map((line) => ({
                    supplierId: p.supplierId,
                    label: line.label,
                    qty: line.qty,
                    unit: line.unit,
                })),
            ),
        [preview],
    )

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
        if (result.mismatches && result.mismatches.length) {
            setLocalError('Existen items con unidad incompatible. Corrige las unidades o mapea otro item.')
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
                    {createDraftOrders.data?.mismatches?.length ? (
                        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                            <p className="font-semibold">Unidades incompatibles</p>
                            <ul className="mt-1 list-disc pl-4 space-y-1">
                                {createDraftOrders.data.mismatches.map((m) => (
                                    <li key={m.supplierItemId}>{m.label} (item proveedor: {m.supplierItemId})</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

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

                    {unknown.length === 0 && previewRows.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-200">Vista previa del pedido</p>
                            <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="overflow-x-auto rounded border border-white/10">
                                    <table className="ds-table w-full">
                                        <thead>
                                            <tr>
                                                <th>Proveedor</th>
                                                <th>Item</th>
                                                <th className="is-num">Cantidad</th>
                                                <th>Unidad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, idx) => (
                                                <tr key={`${row.supplierId}-${idx}`}>
                                                    <td className="text-xs uppercase tracking-wider text-nano-blue-300">{row.supplierId}</td>
                                                    <td>{row.label}</td>
                                                    <td className="is-num">{row.qty.toFixed(2)}</td>
                                                    <td>{row.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
