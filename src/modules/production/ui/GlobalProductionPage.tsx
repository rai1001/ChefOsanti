import { useMemo, useState } from 'react'
import { CircleDot, Filter, MoreHorizontal, Plus, Search, Timer } from 'lucide-react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useGlobalTasks, useUpdateProductionTask } from '../data/productionRepository'
import type { ProductionStation, ProductionTaskStatus, ProductionTaskWithContext } from '../types'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'

type RangeKey = 'today' | 'tomorrow' | 'week'

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Hoy',
  tomorrow: 'Manana',
  week: 'Proximos 7 dias',
}

const STATIONS: ProductionStation[] = ['frio', 'caliente', 'pasteleria', 'barra', 'office', 'almacen', 'externo']
const STATION_LABELS: Record<ProductionStation, string> = {
  frio: 'Frio',
  caliente: 'Caliente',
  pasteleria: 'Pasteleria',
  barra: 'Barra',
  office: 'Office',
  almacen: 'Almacen',
  externo: 'Externo',
}

function computeRange(key: RangeKey) {
  const now = new Date()
  if (key === 'today') return { from: startOfDay(now), to: endOfDay(now) }
  if (key === 'tomorrow') {
    const tmr = new Date(now)
    tmr.setDate(now.getDate() + 1)
    return { from: startOfDay(tmr), to: endOfDay(tmr) }
  }
  const to = new Date(now)
  to.setDate(now.getDate() + 7)
  return { from: startOfDay(now), to: endOfDay(to) }
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const progressByStatus: Record<ProductionTaskStatus, number> = {
  todo: 15,
  doing: 55,
  blocked: 35,
  done: 100,
}

const toneByStatus: Record<ProductionTaskStatus, 'neutral' | 'info' | 'danger' | 'success'> = {
  todo: 'neutral',
  doing: 'info',
  blocked: 'danger',
  done: 'success',
}

function TaskCard({
  task,
  onNext,
}: {
  task: ProductionTaskWithContext
  onNext: (status: ProductionTaskStatus) => void
}) {
  const dateLabel = task.event_date
    ? new Date(task.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
  const progress = progressByStatus[task.status] ?? 35
  const tone = toneByStatus[task.status] ?? 'neutral'
  const nextStatus: ProductionTaskStatus =
    task.status === 'todo' ? 'doing' : task.status === 'doing' || task.status === 'blocked' ? 'done' : 'todo'

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-surface/80 p-4 shadow-[0_18px_48px_rgba(3,7,18,0.5)]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            {task.event_name || 'Evento'} {dateLabel ? `- ${dateLabel}` : ''}
          </p>
        </div>
        <Badge variant={tone} className="capitalize">
          {task.status === 'blocked' ? 'Critical' : task.status === 'done' ? 'On track' : 'In progress'}
        </Badge>
      </div>

      <div className="h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CircleDot size={14} className="text-accent" />
          <span className="font-medium text-foreground">{STATION_LABELS[task.station]}</span>
          {task.planned_qty ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
              {task.planned_qty} {task.unit || 'u'}
            </span>
          ) : null}
        </div>
        <button
          className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
          onClick={() => onNext(nextStatus)}
        >
          {task.status === 'done' ? 'Reabrir' : 'Marcar siguiente'}
        </button>
      </div>
    </div>
  )
}

function Column({
  title,
  tasks,
  emptyHint,
  onAdvance,
}: {
  title: string
  tasks: ProductionTaskWithContext[]
  emptyHint: string
  onAdvance: (taskId: string, status: ProductionTaskStatus) => void
}) {
  return (
    <Card className="flex min-h-[520px] flex-col gap-4 rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <Badge variant="neutral">{tasks.length}</Badge>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-muted-foreground">{emptyHint}</div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onNext={(status) => onAdvance(task.id, status)} />
          ))
        )}

        <button className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-muted-foreground hover:border-accent hover:text-foreground">
          <Plus size={14} />
          Add task
        </button>
      </div>
    </Card>
  )
}

export default function GlobalProductionPage() {
  const { activeOrgId } = useActiveOrgId()
  const updateTask = useUpdateProductionTask()
  const [range, setRange] = useState<RangeKey>('week')
  const [station, setStation] = useState<ProductionStation | 'all'>('all')
  const [query, setQuery] = useState('')

  const rangeWindow = useMemo(() => computeRange(range), [range])
  const tasksQuery = useGlobalTasks(activeOrgId ?? '', rangeWindow.from, rangeWindow.to)

  const filtered = useMemo(() => {
    const list = tasksQuery.data ?? []
    return list.filter((task) => {
      const matchesStation = station === 'all' || task.station === station
      const q = query.trim().toLowerCase()
      const matchesSearch =
        q.length === 0 ||
        task.title.toLowerCase().includes(q) ||
        (task.event_name || '').toLowerCase().includes(q) ||
        STATION_LABELS[task.station].toLowerCase().includes(q)
      return matchesStation && matchesSearch
    })
  }, [tasksQuery.data, station, query])

  const columns = useMemo(() => {
    const todo = filtered.filter((t) => t.status === 'todo')
    const doing = filtered.filter((t) => t.status === 'doing' || t.status === 'blocked')
    const done = filtered.filter((t) => t.status === 'done')
    return { todo, doing, done }
  }, [filtered])

  const handleAdvance = async (taskId: string, status: ProductionTaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status })
      tasksQuery.refetch()
    } catch (err) {
      console.error(err)
    }
  }

  if (!activeOrgId) {
    return (
      <div className="p-8">
        <EmptyState title="Selecciona organizacion" description="Necesitas una organizacion activa para ver produccion." />
      </div>
    )
  }

  if (tasksQuery.isError) {
    return (
      <ErrorBanner
        title="No se pudo cargar produccion"
        message={(tasksQuery.error as Error)?.message || 'Error al obtener tareas'}
        onRetry={() => tasksQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Operations</p>
        <h1 className="text-4xl font-semibold text-foreground">Kitchen Production Workflow</h1>
        <p className="text-sm text-muted-foreground">Kanban para seguir mise en place y tareas criticas de cocina.</p>
      </header>

      <section className="rounded-3xl border border-border/20 bg-surface/60 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="search"
              className="h-11 w-full rounded-xl border border-border/30 bg-surface2/70 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por tarea, evento o estacion..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            <Filter size={14} />
            <span className="text-[11px] uppercase tracking-wide">Rango</span>
            <Badge variant="neutral" className="capitalize">
              {RANGE_LABELS[range]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {(['today', 'tomorrow', 'week'] as RangeKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={range === key ? 'primary' : 'secondary'}
                onClick={() => setRange(key)}
                className="capitalize"
              >
                {RANGE_LABELS[key]}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <Card className="max-h-[760px] overflow-hidden rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Production Batches</p>
              <p className="text-sm text-muted-foreground">Filtra por estacion.</p>
            </div>
            <Timer size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-1 overflow-y-auto">
            <button
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                station === 'all'
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
              onClick={() => setStation('all')}
            >
              <span>All stations</span>
              <Badge variant="neutral">{tasksQuery.data?.length ?? 0}</Badge>
            </button>
            {STATIONS.map((s) => (
              <button
                key={s}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                  station === s
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
                onClick={() => setStation(s)}
              >
                <span>{STATION_LABELS[s]}</span>
                <Badge variant={station === s ? 'info' : 'neutral'}>
                  {(tasksQuery.data ?? []).filter((t) => t.station === s).length}
                </Badge>
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {tasksQuery.isLoading ? (
            <div className="col-span-3 flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <>
              <Column
                title="To Do"
                tasks={columns.todo}
                emptyHint="Sin pendientes en este rango."
                onAdvance={handleAdvance}
              />
              <Column
                title="In Progress"
                tasks={columns.doing}
                emptyHint="Anade tareas o cambia estado a En curso."
                onAdvance={handleAdvance}
              />
              <Column
                title="Completed"
                tasks={columns.done}
                emptyHint="Cierra tareas para verlas aqui."
                onAdvance={handleAdvance}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
