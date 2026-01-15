import { useMemo } from 'react'
import { CalendarClock, ChevronRight, CircleDot } from 'lucide-react'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import {
  useProductionPlan,
  useProductionTasks,
  useUpdateProductionTask,
} from '../data/productionRepository'
import type { ProductionStation, ProductionTaskStatus, ProductionTask } from '../types'

type PlannerTask = ProductionTask & { event_name?: string; event_date?: string }

interface Props {
  serviceId: string
  orgId: string
  hotelId: string
  eventId: string
}

const STATION_LABELS: Record<ProductionStation, string> = {
  frio: 'Prep Station 1',
  caliente: 'Hot Line',
  pasteleria: 'Bakery Station',
  barra: 'Cold/Bar',
  office: 'Office',
  almacen: 'Storage',
  externo: 'External',
}

const STATION_GROUPS: ProductionStation[][] = [
  ['frio', 'caliente', 'pasteleria'],
  ['barra', 'office', 'almacen', 'externo'],
]

function ProgressBar({ value }: { value: number }) {
  const val = Math.min(100, Math.max(0, value))
  return (
    <div className="h-2 rounded-full bg-white/10">
      <div className="h-full rounded-full bg-accent" style={{ width: `${val}%` }} />
    </div>
  )
}

function TaskRow({
  task,
  onUpdate,
}: {
  task: PlannerTask
  onUpdate: (status: ProductionTaskStatus) => void
}) {
  const isDone = task.status === 'done'
  const isInProgress = task.status === 'doing'
  const progress = isDone ? 100 : isInProgress ? 80 : 20

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_48px_rgba(3,7,18,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.planned_qty ? `${task.planned_qty} ${task.unit || ''}` : 'No qty'} • {task.event_name || 'Event'}
          </p>
        </div>
        <Button
          size="sm"
          variant={isDone ? 'secondary' : 'primary'}
          onClick={() => onUpdate(isDone ? 'doing' : 'done')}
          className="min-w-[120px]"
        >
          {isDone ? 'Reopen' : 'Mark as Done'}
        </Button>
      </div>
      <ProgressBar value={progress} />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
          <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-success' : isInProgress ? 'bg-warning' : 'bg-accent'}`} />
          {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
        </span>
        {task.event_date && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
            <CalendarClock size={12} />
            {new Date(task.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

function StationBlock({
  station,
  tasks,
  onUpdate,
}: {
  station: ProductionStation
  tasks: PlannerTask[]
  onUpdate: (taskId: string, status: ProductionTaskStatus) => void
}) {
  return (
    <Card className="rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{STATION_LABELS[station]}</p>
          <p className="text-xs text-muted-foreground">Prep Lists</p>
        </div>
        <Badge variant="neutral">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-muted-foreground">
            No tasks for this station
          </div>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} onUpdate={(status) => onUpdate(task.id, status)} />)
        )}
      </div>
    </Card>
  )
}

function SummaryStrip({ total, done, inProgress, pending, pct }: { total: number; done: number; inProgress: number; pending: number; pct: number }) {
  return (
    <Card className="rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-foreground">Kitchen Production Planner</p>
          <p className="text-sm text-muted-foreground">Prep Lists and Production Tasks by shift.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
          <span>Total Tasks: {total}</span>
          <span className="text-success">Completed: {done} ({pct}%)</span>
          <span className="text-warning">In Progress: {inProgress}</span>
          <span className="text-muted-foreground">Pending: {pending}</span>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </Card>
  )
}

export default function ProductionPlanView({ serviceId }: Props) {
  const plan = useProductionPlan(serviceId)
  const tasks = useProductionTasks(plan.data?.id)
  const updateTask = useUpdateProductionTask()

  const grouped = useMemo(() => {
    const result: Record<ProductionStation, PlannerTask[]> = {
      frio: [],
      caliente: [],
      pasteleria: [],
      barra: [],
      office: [],
      almacen: [],
      externo: [],
    }
    ;(tasks.data ?? []).forEach((t) => {
      result[t.station]?.push(t as PlannerTask)
    })
    return result
  }, [tasks.data])

  const totals = useMemo(() => {
    const all = tasks.data ?? []
    const total = all.length
    const done = all.filter((t) => t.status === 'done').length
    const inProgress = all.filter((t) => t.status === 'doing').length
    const pending = total - done - inProgress
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, inProgress, pending, pct }
  }, [tasks.data])

  const handleUpdate = async (taskId: string, status: ProductionTaskStatus) => {
    await updateTask.mutateAsync({ id: taskId, status })
    tasks.refetch()
  }

  if (plan.isLoading || tasks.isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner />
      </div>
    )
  }

  if (!plan.data) {
    return (
      <EmptyState
        title="No plan yet"
        description="Genera o crea un plan para ver las tareas de cocina."
        action={
          <div className="flex gap-3 justify-center">
            <Button onClick={() => {}}>Create Plan</Button>
            <Button variant="secondary" onClick={() => {}}>
              Generate from Menu
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <SummaryStrip {...totals} />

      <div className="grid gap-4 lg:grid-cols-2">
        {STATION_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-4">
            {group.map((station) => (
              <StationBlock key={station} station={station} tasks={grouped[station]} onUpdate={handleUpdate} />
            ))}
          </div>
        ))}
      </div>

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleDot size={14} className="text-accent" />
          <span>Production Tasks (By Time)</span>
          <ChevronRight size={14} />
          <span className="text-foreground">Morning Shift / Lunch Service</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Segmenta tareas por turno y marca completados para alinear prep y servicio.
        </p>
      </Card>
    </div>
  )
}
