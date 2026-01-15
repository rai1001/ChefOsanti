import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, AlertTriangle, Building2, CalendarRange, PackageSearch, TrendingUp, Users } from 'lucide-react'
import { useHotels } from '@/modules/events/data/events'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useOrdersSummary, useOrdersToDeliver, useStaffAvailability, useWeekEvents } from '../data/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/ui/Card'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { Badge } from '@/modules/shared/ui/Badge'
import { EmptyState } from '@/modules/shared/ui/EmptyState'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() || 7
  if (day !== 1) d.setHours(-24 * (day - 1))
  d.setHours(0, 0, 0, 0)
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
  const [weekStart, setWeekStart] = useState<string>(isoWeekStart())

  useEffect(() => {
    if (hotels.data?.length && !hotelId) {
      setHotelId(hotels.data[0].id)
    }
  }, [hotels.data, hotelId])

  const weekEvents = useWeekEvents(hotelId, weekStart)
  const ordersSummary = useOrdersSummary(activeOrgId ?? undefined, weekStart)
  const ordersToDeliver = useOrdersToDeliver(activeOrgId ?? undefined, weekStart, 'all')
  const availability = useStaffAvailability(hotelId, weekStart)

  const totalEvents = useMemo(
    () => weekEvents.data?.reduce((acc, day) => acc + (day.events?.length ?? 0), 0) ?? 0,
    [weekEvents.data],
  )

  const largeEvents = Math.max(0, Math.min(totalEvents, Math.round(totalEvents * 0.2)))
  const smallEvents = Math.max(0, totalEvents - largeEvents)

  const productionPercent = availability.data?.percent ?? 85
  const purchasePending = ordersSummary.data?.purchaseOrders?.porEstado?.pending ?? 0
  const purchaseTotal = ordersSummary.data?.purchaseOrders?.total ?? 0
  const urgentAlerts = Math.max(ordersToDeliver.data?.length ?? 0, 0)
  const urgentAmount = ordersSummary.data?.purchaseOrders?.totalEstimado ?? 0

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
      description: `${item.status ?? 'Pendiente'} • ${item.createdAt?.slice(0, 10)}`,
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
    return <div className="text-danger">No hay organización activa. Selecciona una para continuar.</div>
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">ChefOS</p>
          <h1 className="text-4xl font-semibold text-foreground">Executive Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground">Eventos, producción, compras y alertas en un vistazo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Building2 size={14} />
            <select
              value={hotelId}
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
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(isoWeekStart(new Date(e.target.value)))}
              className="bg-transparent text-foreground outline-none"
            />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Events"
          value={`${totalEvents}`}
          icon={<TrendingUp size={18} />}
          accent="success"
          detail={`${largeEvents} Large, ${smallEvents} Small`}
        />
        <StatCard
          title="Production Status"
          value={`${Math.round(productionPercent)}%`}
          icon={<Users size={18} />}
          accent="info"
          detail={productionPercent >= 90 ? 'On Schedule' : 'Con retraso'}
        />
        <StatCard
          title="Pending Purchase Orders"
          value={`${purchaseTotal}`}
          icon={<PackageSearch size={18} />}
          accent="warning"
          detail={`${purchasePending} Urgentes • Total: €${urgentAmount.toLocaleString('es-ES')}`}
        />
        <StatCard
          title="Urgent Stock Alerts"
          value={`${urgentAlerts}`}
          icon={<AlertTriangle size={18} />}
          accent="danger"
          detail="Low inventory en items clave"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 bg-surface/70 border border-border/20">
          <CardHeader className="flex flex-col gap-2 pb-2">
            <CardTitle className="text-xl text-foreground">Daily Production Overview - Last 7 Days</CardTitle>
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
          No hay datos de eventos para esta semana.
        </div>
      )}
      {!weekEvents.isLoading && (weekEvents.data?.length ?? 0) > 0 && (
        <Card className="border border-border/20 bg-surface/70">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">Eventos de la semana</CardTitle>
            <Badge variant="neutral">{weekEvents.data?.length} días</Badge>
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
