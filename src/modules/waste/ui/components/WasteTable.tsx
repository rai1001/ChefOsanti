
import type { WasteEntry } from '../../domain/types'
import { Card } from '@/modules/shared/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface WasteTableProps {
    entries: WasteEntry[]
}

export function WasteTable({ entries }: WasteTableProps) {
    if (!entries.length) return null

    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-xs uppercase text-slate-400 font-semibold border-b border-white/10">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3">Cant.</th>
                            <th className="px-4 py-3 text-right">Coste U.</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3">Motivo</th>
                            <th className="px-4 py-3">Notas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-white/5 transition-colors text-slate-300">
                                <td className="px-4 py-3">
                                    {new Date(entry.occurredAt).toLocaleDateString()}
                                    <br />
                                    <span className="text-xs text-slate-500">
                                        {new Date(entry.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={entry.productId}>
                                    {/* 
                  TODO: Fetch Product Name via dataloader or join
                  For now showing ID short version or "Producto X" if we had a cache 
                */}
                                    <span className="font-mono text-xs opacity-50 block">{entry.productId.slice(0, 8)}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {entry.quantity} {entry.unit}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500">
                                    {formatCurrency ? formatCurrency(entry.unitCost) : `${entry.unitCost}€`}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-white">
                                    {formatCurrency ? formatCurrency(entry.totalCost) : `${entry.totalCost}€`}
                                </td>
                                <td className="px-4 py-3">
                                    {/* TODO: Resolve reason name */}
                                    <span className="font-mono text-xs opacity-50">{entry.reasonId.slice(0, 5)}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={entry.notes || ''}>
                                    {entry.notes || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
