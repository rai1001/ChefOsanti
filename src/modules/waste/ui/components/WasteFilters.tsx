
import { useForm } from 'react-hook-form'
import { Search, X } from 'lucide-react'
import { Card } from '@/modules/shared/ui/Card'
import { Button } from '@/modules/shared/ui/Button'
import { useWasteReasons } from '../../data/wasteReasons'
import type { WasteFilters as FiltersType } from '../../data/wasteEntries'
import { useHotels } from '@/modules/purchasing/data/orders'

interface WasteFiltersProps {
    filters: FiltersType
    onChange: (filters: FiltersType) => void
    orgId: string
}

export function WasteFilters({ filters, onChange, orgId }: WasteFiltersProps) {
    const { data: reasons } = useWasteReasons(orgId)
    const { data: hotels } = useHotels(orgId)

    const handleHotelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...filters, hotelId: e.target.value || null })
    }

    const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value
        onChange({ ...filters, reasonId: val ? [val] : null })
    }

    const handleDateChange = (type: 'start' | 'end', val: string) => {
        const date = val ? new Date(val) : null
        onChange({
            ...filters,
            startDate: type === 'start' ? date : filters.startDate,
            endDate: type === 'end' ? date : filters.endDate
        })
    }

    const clearFilters = () => {
        onChange({})
    }

    const hasFilters = Object.keys(filters).length > 0 && Object.values(filters).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))

    return (
        <Card className="p-4 bg-nano-navy-800/50">
            <div className="flex flex-col md:flex-row gap-4 items-end">

                {/* Date Range */}
                <div className="flex gap-2">
                    <div className="flex flex-col space-y-1">
                        <label className="text-xs text-slate-400">Desde</label>
                        <input
                            type="date"
                            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label className="text-xs text-slate-400">Hasta</label>
                        <input
                            type="date"
                            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                        />
                    </div>
                </div>

                {/* Hotel Select */}
                <div className="flex flex-col space-y-1 min-w-[200px]">
                    <label className="text-xs text-slate-400">Hotel</label>
                    <select
                        className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
                        onChange={handleHotelChange}
                        value={filters.hotelId || ''}
                    >
                        <option value="">Todos los hoteles</option>
                        {hotels?.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </select>
                </div>

                {/* Reason Select */}
                <div className="flex flex-col space-y-1 min-w-[200px]">
                    <label className="text-xs text-slate-400">Motivo</label>
                    <select
                        className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
                        onChange={handleReasonChange}
                        value={filters.reasonId?.[0] || ''}
                    >
                        <option value="">Todos los motivos</option>
                        {reasons?.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                {/* Clear Button */}
                {hasFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpiar filtros">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </Card>
    )
}
