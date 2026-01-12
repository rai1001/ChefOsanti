import type { ProductionTask, ProductionStation, ProductionTaskStatus } from '../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TaskCardProps {
    task: ProductionTask
    onStatusChange: (status: ProductionTaskStatus) => void
    onDelete: () => void
}

const STATUS_COLORS: Record<ProductionTaskStatus, string> = {
    todo: 'bg-slate-100 text-slate-600 border-slate-200',
    doing: 'bg-blue-50 text-blue-600 border-blue-200',
    done: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blocked: 'bg-red-50 text-red-600 border-red-200',
}

const STATION_LABELS: Record<ProductionStation, string> = {
    frio: 'Frío',
    caliente: 'Caliente',
    pasteleria: 'Pastelería',
    barra: 'Barra',
    office: 'Office',
    almacen: 'Almacén',
    externo: 'Externo',
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
    return (
        <div className="group relative flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    {task.notes && <p className="text-xs text-slate-500 mt-1">{task.notes}</p>}
                </div>
                <select
                    value={task.status}
                    onChange={(e) => onStatusChange(e.target.value as ProductionTaskStatus)}
                    className={`h-7 rounded border px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50 ${STATUS_COLORS[task.status]}`}
                >
                    <option value="todo">Pendiente</option>
                    <option value="doing">En curso</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="done">Hecho</option>
                </select>
            </div>

            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {STATION_LABELS[task.station]}
                    </span>
                    {task.planned_qty && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {task.planned_qty} {task.unit}
                        </span>
                    )}
                    {task.due_at && (
                        <span className="text-xs text-slate-500">
                            {format(new Date(task.due_at), 'HH:mm', { locale: es })}
                        </span>
                    )}
                </div>
                <button
                    onClick={onDelete}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar tarea"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
