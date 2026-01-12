import { useState, useMemo } from 'react'
import {
    useProductionPlan,
    useProductionTasks,
    useGenerateProductionPlan,
    useCreateProductionPlan,
    useCreateProductionTask,
    useUpdateProductionTask,
    useDeleteProductionTask,
} from '../data/productionRepository'
import type { ProductionStation } from '../types'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'
import { Button } from '@/modules/shared/ui/Button'
import { Spinner } from '@/modules/shared/ui/Spinner'

interface ProductionPlanViewProps {
    serviceId: string
    orgId: string
    hotelId: string
    eventId: string
}

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

export function ProductionPlanView({ serviceId, orgId, hotelId, eventId }: ProductionPlanViewProps) {
    const { data: plan, isLoading: loadingPlan } = useProductionPlan(serviceId)
    const { data: tasks, isLoading: loadingTasks } = useProductionTasks(plan?.id)

    const createPlan = useCreateProductionPlan()
    const generatePlan = useGenerateProductionPlan()
    const createTask = useCreateProductionTask()
    const updateTask = useUpdateProductionTask()
    const deleteTask = useDeleteProductionTask()

    const [isAddingTask, setIsAddingTask] = useState<ProductionStation | null>(null)

    const tasksByStation = useMemo(() => {
        const grouped: Partial<Record<ProductionStation, typeof tasks>> = {}
        STATIONS.forEach(s => grouped[s] = [])
        tasks?.forEach(t => {
            if (grouped[t.station]) {
                grouped[t.station]?.push(t)
            }
        })
        return grouped
    }, [tasks])

    const handleGenerate = async () => {
        if (!confirm('Esto generará tareas basadas en el menú del evento. ¿Continuar?')) return;

        try {
            const result = await generatePlan.mutateAsync(serviceId);
            let msg = `Generación completada:\n- Tareas creadas: ${result.created}`;

            const missing = result.missing_items || [];
            if (missing.length > 0) {
                msg += `\n\n⚠️ ${missing.length} ítems sin receta asignada (ignorados):\n` + missing.map(m => `• ${m}`).join('\n');
            } else {
                msg += `\n- Todos los ítems fueron procesados.`;
            }
            alert(msg);
        } catch (e) {
            alert('Error al generar: ' + (e as Error).message);
        }
    }

    if (loadingPlan) return <div className="p-4"><Spinner /></div>

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-lg border border-slate-200 border-dashed">
                <p className="text-slate-500 mb-4">No hay plan de producción para este servicio.</p>
                <div className="flex gap-2">
                    <Button
                        variant="default"
                        onClick={() => createPlan.mutate({ orgId, hotelId, eventId, eventServiceId: serviceId })}
                        disabled={createPlan.isPending}
                    >
                        Crear Plan Manual
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleGenerate}
                        disabled={generatePlan.isPending}
                    >
                        {generatePlan.isPending ? 'Generando...' : 'Generar desde Menú'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-slate-800">Mise en place</h3>
                    <p className="text-sm text-slate-500">
                        {plan.generated_from === 'menu' ? 'Generado autom.' : 'Plan manual'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Allow re-generation even if exists, but maybe warn? RPC handles re-run safe-ish (inserts only). */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generatePlan.isPending}
                    >
                        {generatePlan.isPending ? '...' : 'Re-generar desde Menú'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAddingTask('frio')}>
                        + Añadir Tarea
                    </Button>
                </div>
            </header>

            {/* Manual Task Modal/Form Area */}
            {isAddingTask && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
                    <h4 className="font-semibold text-slate-700 mb-2">Nueva Tarea</h4>
                    <TaskForm
                        planId={plan.id}
                        orgId={orgId}
                        defaultStation={isAddingTask}
                        onSubmit={async (input) => {
                            await createTask.mutateAsync(input)
                            setIsAddingTask(null)
                        }}
                        onCancel={() => setIsAddingTask(null)}
                    />
                </div>
            )}

            {loadingTasks ? (
                <Spinner />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {STATIONS.map((station) => {
                        const stationTasks = tasksByStation[station] || []

                        return (
                            <div key={station} className="rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col">
                                <div className="border-b border-slate-200 px-3 py-2 flex justify-between items-center bg-white rounded-t-lg">
                                    <h4 className="font-semibold text-slate-700">{STATION_LABELS[station]}</h4>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {stationTasks.length}
                                    </span>
                                </div>
                                <div className="p-2 space-y-2 flex-1 min-h-[50px]">
                                    {stationTasks.length === 0 && (
                                        <button
                                            onClick={() => setIsAddingTask(station)}
                                            className="w-full h-full min-h-[40px] border-2 border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            + Añadir a {STATION_LABELS[station]}
                                        </button>
                                    )}
                                    {stationTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onStatusChange={(status) => updateTask.mutate({ id: task.id, status })}
                                            onDelete={() => deleteTask.mutate(task.id)}
                                        />
                                    ))}
                                    {stationTasks.length > 0 && (
                                        <button
                                            onClick={() => setIsAddingTask(station)}
                                            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
                                        >
                                            + Añadir otra
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
