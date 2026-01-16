import { useMemo, useState, type ReactNode } from 'react'
import { Activity, AlertTriangle, Building2, CalendarRange, PackageSearch, TrendingUp, Users } from 'lucide-react'
import { useHotels } from '@/modules/events/data/events'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import {
  useDashboardBriefing,
  useDashboardHighlights,
  useDashboardPurchaseMetrics,
  useDashboardRollingGrid,
  useDashboardStaffShifts,
  useOrdersToDeliver,
  useStaffAvailability,
  useWeekEvents,
} from '../data/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/ui/Card'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { Badge } from '@/modules/shared/ui/Badge'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoRangeStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function shiftIsoDate(base: string, offsetDays: number) {
  const d = new Date(`${base}T00:00:00`)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

type StatCardProps = {
  title: string
  value: string
  icon: ReactNode
  accent: 'success' | 'warning' | 'danger' | 'info'
  detail: string
}

function StatCard({ title, value, icon, accent, detail }: StatCardProps) {
  const accentClasses: Record<StatCardProps['accent'], string> = {
    success: 'text-success border-success/20 bg-success/10',
    warning: 'text-warning border-warning/25 bg-warning/10',
    danger: 'text-danger border-danger/25 bg-danger/10',
    info: 'text-brand-500 border-brand-500/25 bg-brand-100/10',
  }
  return (
    <Card className="glass-card rounded-2xl border border-border/25 bg-surface/70">
      <CardContent className="flex items-start gap-3 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accentClasses[accent]}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-3xl font-bold leading-tight text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

type SparklineProps = {
  data: { planned: number; actual: number }[]
}

function Sparkline({ data }: SparklineProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.planned, d.actual]), 1)
  const height = 180
  const width = 640
  const step = width / (data.length - 1 || 1)
  const toPath = (key: 'planned' | 'actual') =>
    data
      .map((point, idx) => {
        const x = idx * step
        const y = height - (point[key] / maxValue) * height
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`
      })
      .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="plannedGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="actualGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--warning))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(var(--warning))" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <path d={`${toPath('planned')} L ${width},${height} L 0,${height} Z`} fill="url(#plannedGradient)" />
      <path d={`${toPath('actual')} L ${width},${height} L 0,${height} Z`} fill="url(#actualGradient)" />
      <path d={toPath('planned')} fill="none" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" />
      <path d={toPath('actual')} fill="none" stroke="rgb(var(--warning))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

type ActivityItem = {
  title: string
  description: string
  meta: string
  tone: 'info' | 'success' | 'warning' | 'danger'
}

export default function DashboardPage() {
  const { activeOrgId, loading: orgLoading, memberships, setOrg } = useActiveOrgId()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string | undefined>(undefined)
  const [rangeStart, setRangeStart] = useState<string>(isoRangeStart())
  const resolvedHotelId = hotelId ?? hotels.data?.[0]?.id


  const weekEvents = useWeekEvents(resolvedHotelId, rangeStart)
  const ordersToDeliver = useOrdersToDeliver(activeOrgId ?? undefined, rangeStart, 'all')
  const availability = useStaffAvailability(resolvedHotelId, rangeStart)
  const purchaseMetrics = useDashboardPurchaseMetrics(activeOrgId ?? undefined, resolvedHotelId, rangeStart)
  const rollingGrid = useDashboardRollingGrid(activeOrgId ?? undefined, resolvedHotelId, rangeStart)
  const highlights = useDashboardHighlights(activeOrgId ?? undefined, resolvedHotelId, rangeStart)
  const briefing = useDashboardBriefing(activeOrgId ?? undefined, resolvedHotelId, rangeStart)
  const staffShifts = useDashboardStaffShifts(activeOrgId ?? undefined, resolvedHotelId, rangeStart)

  const totalEvents = useMemo(
    () => weekEvents.data?.reduce((acc, day) => acc + (day.events?.length ?? 0), 0) ?? 0,
    [weekEvents.data],
  )

  const pendingValue = purchaseMetrics.data?.pendingValue ?? 0
  const eventsToday = purchaseMetrics.data?.eventsCount ?? 0
  const confirmedMenus = purchaseMetrics.data?.confirmedMenus ?? 0
  const pendingOrders = purchaseMetrics.data?.pendingOrders ?? 0
  const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const pendingValueLabel = currencyFormatter.format(pendingValue)

  const largeEvents = Math.max(0, Math.min(totalEvents, Math.round(totalEvents * 0.2)))
  const smallEvents = Math.max(0, totalEvents - largeEvents)

  const productionPercent = availability.data?.percent ?? 85
  const urgentAlerts = Math.max(ordersToDeliver.data?.length ?? 0, 0)

  const rollingDays = rollingGrid.data ?? []
  const gridDays = useMemo(() => {
    if (rollingDays.length) return rollingDays
    return Array.from({ length: 7 }, (_, idx) => ({
      day: shiftIsoDate(rangeStart, idx),
      eventsCount: 0,
      purchasePending: 0,
      purchaseOrdered: 0,
      purchaseReceived: 0,
      productionDraft: 0,
      productionInProgress: 0,
      productionDone: 0,
      staffRequired: 0,
      staffAssigned: 0,
    }))
  }, [rollingDays, rangeStart])

  const staffTotals = useMemo(() => {
    const base = gridDays.reduce(
      (acc, day) => {
        acc.required += day.staffRequired
        acc.assigned += day.staffAssigned
        return acc
      },
      { required: 0, assigned: 0 },
    )
    const percent = base.required > 0 ? (base.assigned / base.required) * 100 : 100
    return { ...base, percent }
  }, [gridDays])

  const highlightItems = highlights.data ?? []
  const briefingItems = briefing.data ?? []
  const briefingByDay = useMemo(() => {
    const map = new Map<string, typeof briefingItems>()
    briefingItems.forEach((item) => {
      const key = item.deadlineDay
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return map
  }, [briefingItems])

  const chartData = [
    { planned: 100, actual: 90 },
    { planned: 120, actual: 80 },
    { planned: 130, actual: 160 },
    { planned: 190, actual: 140 },
    { planned: 150, actual: 180 },
    { planned: 210, actual: 160 },
    { planned: 240, actual: 200 },
  ]

  const recentActivities: ActivityItem[] =
    ordersToDeliver.data?.slice(0, 5).map((item) => ({
      title: item.type === 'purchase' ? `Nuevo PO #${item.orderNumber}` : `Pedido evento #${item.orderNumber}`,
      description: `${item.status ?? 'Pendiente'} ‚Ä¢ ${item.createdAt?.slice(0, 10)}`,
      meta: 'Reciente',
      tone: item.type === 'purchase' ? 'success' : 'info',
    })) ?? [
      {
        title: 'Ingredient Shortage: Olive Oil',
        description: 'Low inventory en aceite de oliva.',
        meta: '2 horas',
        tone: 'danger',
      },
      {
        title: 'New PO #4520 Created',
        description: 'Orden creada y lista para aprobar.',
        meta: '2 horas',
        tone: 'success',
      },
      {
        title: 'Event "Gala Dinner" Updated',
        description: 'Actualizado servicio principal.',
        meta: '3 horas',
        tone: 'info',
      },
      {
        title: 'Stock alert: Proveedores',
        description: 'Checkear items con lead time > 5 d.',
        meta: '5 horas',
        tone: 'warning',
      },
    ]

  if (orgLoading || hotels.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <span>Cargando dashboard...</span>
      </div>
    )
  }

  if (!activeOrgId) {
    return <div className="text-danger">No hay organizaci√≥n activa. Selecciona una para continuar.</div>
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">ChefOS</p>
          <h1 className="text-4xl font-semibold text-foreground">Executive Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground">Eventos, producci√≥n, compras y alertas en un vistazo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Building2 size={14} />
            <select
              value={resolvedHotelId ?? ''}
              onChange={(e) => setHotelId(e.target.value)}
              className="bg-transparent text-foreground outline-none"
            >
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          {memberships?.length > 1 && (
            <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
              <PackageSearch size={14} />
              <select
                value={activeOrgId}
                onChange={(e) => setOrg(e.target.value)}
                className="bg-transparent text-foreground outline-none"
              >
                {memberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.orgName ?? m.orgSlug ?? m.orgId}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <CalendarRange size={14} />
            <button
              type="button"
              onClick={() => setRangeStart(shiftIsoDate(rangeStart, -1))}
              className="rounded-full border border-border/30 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              -1
            </button>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(isoRangeStart(new Date(e.target.value)))}
              className="bg-transparent text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setRangeStart(shiftIsoDate(rangeStart, 1))}
              className="rounded-full border border-border/30 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              +1
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Eventos del dÌa"
          value={`${eventsToday}`}
          icon={<CalendarRange size={18} />}
          accent="info"
          detail={`${confirmedMenus} men˙s confirmados`}
        />
        <StatCard
          title="Active Events (7d)"
          value={`${totalEvents}`}
          icon={<TrendingUp size={18} />}
          accent="success"
          detail={`${largeEvents} Large, ${smallEvents} Small`}
        />
        <StatCard
          title="Pending Purchase Orders"
          value={`${pendingOrders}`}
          icon={<PackageSearch size={18} />}
          accent="warning"
          detail={`Valor ${pendingValueLabel}`}
        />
        <StatCard
          title="Production Status"
          value={`${Math.round(productionPercent)}%`}
          icon={<Users size={18} />}
          accent="info"
          detail={productionPercent >= 90 ? 'On Schedule' : 'Con retraso'}
        />
        <StatCard
          title="Urgent Stock Alerts"
          value={`${urgentAlerts}`}
          icon={<AlertTriangle size={18} />}
          accent="danger"
          detail="Low inventory en items clave"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="bg-surface/70 border border-border/20">
          <CardHeader className="flex flex-col gap-2 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Horizonte 7 dias (rolling)</CardTitle>
              <Badge variant="neutral">{gridDays.length} dias</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Staff coverage {Math.round(staffTotals.percent)}% ({staffTotals.assigned}/{staffTotals.required})</p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] gap-2 text-xs">
              <div />
              {gridDays.map((day) => (
                <div key={day.day} className="text-center text-muted-foreground">{day.day.slice(5)}</div>
              ))}

              <div className="text-muted-foreground">Eventos</div>
              {gridDays.map((day) => (
                <div key={`${day.day}-events`} className="flex justify-center">
                  <Badge variant="neutral">{day.eventsCount}</Badge>
                </div>
              ))}

              <div className="text-muted-foreground">Compras</div>
              {gridDays.map((day) => (
                <div key={`${day.day}-purchases`} className="flex items-center justify-center gap-1">
                  <span className="text-[11px] text-warning">{day.purchasePending}</span>
                  <span className="text-[11px] text-brand-500">{day.purchaseOrdered}</span>
                  <span className="text-[11px] text-success">{day.purchaseReceived}</span>
                </div>
              ))}

              <div className="text-muted-foreground">Produccion</div>
              {gridDays.map((day) => (
                <div key={`${day.day}-production`} className="flex items-center justify-center gap-1">
                  <span className="text-[11px] text-muted-foreground">{day.productionDraft}</span>
                  <span className="text-[11px] text-warning">{day.productionInProgress}</span>
                  <span className="text-[11px] text-success">{day.productionDone}</span>
                </div>
              ))}

              <div className="text-muted-foreground">Staff</div>
              {gridDays.map((day) => (
                <div key={`${day.day}-staff`} className="text-center text-[11px] text-muted-foreground">
                  {day.staffAssigned}/{day.staffRequired}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-surface/70 border border-border/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlights.isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  <span>Cargando highlights...</span>
                </div>
              )}
              {!highlights.isLoading && highlightItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin eventos destacados en el horizonte.</p>
              )}
              {highlightItems.map((item) => (
                <div key={item.eventId} className="rounded-xl border border-border/20 bg-surface/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <Badge variant="neutral">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.startsAt?.slice(0, 10)} ∑ Pax {item.paxTotal} ∑ Servicios {item.servicesCount}</p>
                  <p className="text-[11px] text-muted-foreground">Produccion: {item.productionStatus ?? 'n/a'}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-surface/70 border border-border/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">Briefing 7 dias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {briefing.isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  <span>Cargando briefing...</span>
                </div>
              )}
              {!briefing.isLoading && briefingByDay.size === 0 && (
                <p className="text-sm text-muted-foreground">Sin deadlines en los proximos 7 dias.</p>
              )}
              {Array.from(briefingByDay.entries()).map(([day, items]) => (
                <div key={day} className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">{day}</p>
                  {items.map((item) => (
                    <div key={item.eventPurchaseOrderId} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">{item.orderNumber} ∑ {item.supplierName}</span>
                        <span className="text-[11px] text-muted-foreground">{item.eventTitle}</span>
                      </div>
                      <Badge variant={item.reminderActive ? 'warning' : 'neutral'}>{item.productType}</Badge>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-surface/70 border border-border/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground">Horario de personal (hoy)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffShifts.isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  <span>Cargando turnos...</span>
                </div>
              )}
              {!staffShifts.isLoading && (staffShifts.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Sin turnos cargados para hoy.</p>
              )}
              {staffShifts.data?.map((shift) => (
                <div key={shift.id} className="rounded-xl border border-border/20 bg-surface/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{shift.shiftType}</span>
                    <span className="text-muted-foreground">{shift.startsAt} - {shift.endsAt}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {shift.assignments.length}/{shift.requiredCount} asignados
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {shift.assignments.length ? (
                      shift.assignments.map((a) => (
                        <span key={a.staffMemberId} className="rounded-full bg-white/5 px-2 py-1">
                          {a.staffName}
                        </span>
                      ))
                    ) : (
                      <span className="text-warning">Sin asignaciones</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 bg-surface/70 border border-border/20">
          <CardHeader className="flex flex-col gap-2 pb-2">
            <CardTitle className="text-xl text-foreground">Rolling Production Overview</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Planned
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Actual
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="rounded-2xl border border-border/20 bg-surface/60 p-4">
              <Sparkline data={chartData} />
              <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/70 border border-border/20">
          <CardHeader className="pb-4 flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">Recent Alerts & Activity</CardTitle>
            <Badge variant="neutral">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((item, idx) => {
              const toneClasses: Record<ActivityItem['tone'], string> = {
                info: 'text-brand-500 bg-brand-100/10 border-brand-500/20',
                success: 'text-success bg-success/10 border-success/25',
                warning: 'text-warning bg-warning/10 border-warning/25',
                danger: 'text-danger bg-danger/10 border-danger/25',
              }
              return (
                <div key={idx} className="flex items-start gap-3 rounded-xl border border-border/20 bg-surface/50 p-3">
                  <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-xl border ${toneClasses[item.tone]}`}>
                    <Activity size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{item.meta}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {weekEvents.isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          <span>Cargando eventos...</span>
        </div>
      )}
      {!weekEvents.isLoading && (weekEvents.data?.length ?? 0) === 0 && (
        <div className="rounded-xl border border-border/20 bg-surface/60 p-4 text-sm text-muted-foreground">
          No hay datos de eventos para este horizonte.
        </div>
      )}
      {!weekEvents.isLoading && (weekEvents.data?.length ?? 0) > 0 && (
        <Card className="border border-border/20 bg-surface/70">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">Eventos 7 dias</CardTitle>
            <Badge variant="neutral">{weekEvents.data?.length} d√≠as</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {weekEvents.data?.map((day) => (
              <div key={day.date} className="rounded-xl border border-border/20 bg-surface/60 p-3">
                <p className="text-sm font-semibold text-foreground">{day.date}</p>
                <p className="text-xs text-muted-foreground">{day.events?.length ?? 0} eventos</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
