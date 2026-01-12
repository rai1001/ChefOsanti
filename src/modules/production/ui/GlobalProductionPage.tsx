
import { useState } from 'react'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useGlobalTasks } from '../data/productionRepository'
import type { ProductionStation } from '../types'
import { TaskCard } from './TaskCard'
import { Spinner } from '@/modules/shared/ui/Spinner'

type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom'

const STATIONS: ProductionStation[] = ['frio', 'caliente', 'pasteleria', 'barra', 'office', 'almacen', 'externo']
const STATION_LABELS: Record<ProductionStation, string> = {
    frio: 'Frío',
    caliente: 'Caliente',
    pasteleria: 'Pastelería',
    barra: 'Barra',
    office: 'Office',
    almacen: 'Almacén',
    externo: 'Externo',
}

export function GlobalProductionPage() {
    // Hardcoded Org for now, or fetch from context
    // Ideally use useAuth or similar context hook
    const orgId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d" // Replace with actual mechanism later

    const [filter, setFilter] = useState<DateFilter>('today')
    const [customRange] = useState<{ from: Date; to: Date } | null>(null)

    const dateRange = (() => {
        const now = new Date()
        if (filter === 'today') return { from: startOfDay(now), to: endOfDay(now) }
        if (filter === 'tomorrow') {
            const tmr = addDays(now, 1)
            return { from: startOfDay(tmr), to: endOfDay(tmr) }
        }
        if (filter === 'week') return { from: startOfDay(now), to: endOfDay(addDays(now, 7)) }
        return customRange || { from: startOfDay(now), to: endOfDay(now) }
    })()

    const { data: tasks, isLoading } = useGlobalTasks(orgId, dateRange.from, dateRange.to)

    const tasksByStation = STATIONS.reduce((acc, station) => {
        acc[station] = tasks?.filter(t => t.station === station) || []
        return acc
    }, {} as Record<ProductionStation, typeof tasks>)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tablero de Producción Global</h1>
                    <p className="text-slate-500">
                        {filter === 'today' && 'Tareas para hoy'}
                        {filter === 'tomorrow' && 'Tareas para mañana'}
                        {filter === 'week' && 'Próximos 7 días'}
                        {filter === 'custom' && 'Rango personalizado'}
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'today' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => setFilter('tomorrow')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'tomorrow' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Mañana
                    </button>
                    <button
                        onClick={() => setFilter('week')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'week' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        7 Días
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="py-20 flex justify-center"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 items-start overflow-x-auto pb-4">
                    {STATIONS.map(station => (
                        <div key={station} className="min-w-[280px] rounded-xl bg-slate-50 border border-slate-200 flex flex-col max-h-[calc(100vh-200px)]">
                            <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl sticky top-0 z-10">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-700">{STATION_LABELS[station]}</h3>
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                        {tasksByStation[station]?.length || 0}
                                    </span>
                                </div>
                            </div>

                            <div className="p-2 space-y-2 overflow-y-auto flex-1">
                                {tasksByStation[station]?.length === 0 && (
                                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                        Sin tareas
                                    </div>
                                )}
                                {tasksByStation[station]?.map(task => (
                                    <div key={task.id} className="relative">
                                        {/* Event Badge Header */}
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 truncate max-w-[180px]" title={task.event_name}>
                                                {task.event_name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {format(new Date(task.event_date || new Date()), 'dd MMM', { locale: es })}
                                            </span>
                                        </div>

                                        <TaskCard
                                            task={task}
                                            onStatusChange={() => { }} // Read-only or implement update logic
                                            onDelete={() => { }} // Read-only for now
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default GlobalProductionPage
