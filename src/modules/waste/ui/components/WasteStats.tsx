
import { WasteEntry } from '../../domain/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useWasteReasons } from '../../data/wasteReasons'
import { useActiveOrgId } from '@/modules/shared/auth/useActiveOrgId'

interface Props {
    entries: WasteEntry[]
}

export function WasteStats({ entries }: Props) {
    const orgId = useActiveOrgId()
    const { data: reasons } = useWasteReasons(orgId)

    // 1. Calculate Totals
    const totalCost = entries.reduce((acc, e) => acc + e.totalCost, 0)
    const totalWeight = entries.reduce((acc, e) => {
        // Basic summation assuming mostly kg/liters or just raw sum for MVP. 
        // Ideally we normalize units, but for MVP we might just sum 'kg' and 'L' as "qty" if mixed, 
        // or just display sum. Let's assume 'kg' is dominant or just sum raw quantity for now.
        return acc + e.quantity
    }, 0)

    // 2. Calculate Top Reasons
    const reasonsMap = entries.reduce((acc, e) => {
        acc[e.reasonId] = (acc[e.reasonId] || 0) + e.totalCost // Aggregating by Cost
        return acc
    }, {} as Record<string, number>)

    const sortedReasons = Object.entries(reasonsMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, cost]) => {
            const reasonName = reasons?.find((r) => r.id === id)?.name || 'Desconocido'
            return { id, name: reasonName, cost }
        })

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Total Cost Card */}
            <Card className="bg-nano-navy-800/50 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Coste Total
                    </CardTitle>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-white opacity-50"
                    >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</div>
                    <p className="text-xs text-slate-500">
                        en el periodo seleccionado
                    </p>
                </CardContent>
            </Card>

            {/* Total Waste Qty Card */}
            <Card className="bg-nano-navy-800/50 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Cantidad Total
                    </CardTitle>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-white opacity-50"
                    >
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{totalWeight.toFixed(2)} <span className="text-sm font-normal text-slate-500">unidades/kg</span></div>
                    <p className="text-xs text-slate-500">
                        volumen aproximado
                    </p>
                </CardContent>
            </Card>

            {/* Top Reasons Card */}
            <Card className="bg-nano-navy-800/50 border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Principales Motivos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {sortedReasons.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                <span className="font-medium text-white">{formatCurrency(item.cost)}</span>
                            </div>
                        ))}
                        {sortedReasons.length === 0 && (
                            <div className="text-xs text-slate-500">Sin datos suficientes</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
