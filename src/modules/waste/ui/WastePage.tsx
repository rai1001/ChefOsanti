import { useMemo, useState } from 'react'
import { CalendarRange, Filter } from 'lucide-react'
import { Card } from '@/modules/shared/ui/Card'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { Badge } from '@/modules/shared/ui/Badge'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useWasteEntries, type WasteFilters as Filters } from '@/modules/waste/data/wasteEntries'
import { useWasteReasons } from '@/modules/waste/data/wasteReasons'
import { useProducts } from '@/modules/recipes/data/recipes'
import { useHotels } from '@/modules/purchasing/data/orders'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { CreateWasteForm } from './components/CreateWasteForm'
import { WasteTable } from './components/WasteTable'
import { WasteStats } from './components/WasteStats'

type RangeKey = 'last7' | 'last30' | 'mtd' | 'all'

const RANGE_LABELS: Record<RangeKey, string> = {
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  mtd: 'Mes en curso',
  all: 'Todo el histórico',
}

function computeRange(key: RangeKey): Pick<Filters, 'startDate' | 'endDate'> {
  const now = new Date()
  if (key === 'all') return { startDate: null, endDate: null }
  if (key === 'mtd') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: start, endDate: now }
  }
  if (key === 'last7') {
    const start = new Date()
    start.setDate(now.getDate() - 7)
    return { startDate: start, endDate: now }
  }
  const start = new Date()
  start.setDate(now.getDate() - 30)
  return { startDate: start, endDate: now }
}

export default function WastePage() {
  const { activeOrgId } = useActiveOrgId()
  const [range, setRange] = useState<RangeKey>('last30')
  const [filters, setFilters] = useState<Filters>(() => computeRange('last30'))
  const [formKey, setFormKey] = useState(0)

  const entriesQuery = useWasteEntries(activeOrgId ?? undefined, filters)
  const { data: reasons } = useWasteReasons(activeOrgId ?? undefined)
  const { data: products } = useProducts(activeOrgId ?? undefined)
  const hotels = useHotels(activeOrgId ?? undefined)
  const entriesError = useFormattedError(entriesQuery.error)

  const todayLoss = useMemo(() => {
    const today = new Date()
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return (entriesQuery.data ?? [])
      .filter((e) => new Date(e.occurredAt) >= dayStart)
      .reduce((acc, e) => acc + e.totalCost, 0)
  }, [entriesQuery.data])

  const handleRangeChange = (value: RangeKey) => {
    setRange(value)
    setFilters((prev) => ({ ...prev, ...computeRange(value) }))
  }

  const handleReasonChange = (value: string) => {
    setFilters((prev) => ({ ...prev, reasonId: value ? [value] : null }))
  }

  const handleHotelChange = (value: string) => {
    setFilters((prev) => ({ ...prev, hotelId: value || null }))
  }

  const handleResetForm = () => setFormKey((k) => k + 1)

  if (!activeOrgId) {
    return (
      <div className="p-8">
        <EmptyState title="Selecciona una organización" description="Necesitas una organización activa para registrar mermas." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Waste</p>
        <h1 className="text-4xl font-semibold text-foreground">Kitchen Waste Management</h1>
        <p className="text-sm text-muted-foreground">Registra mermas, analiza sus motivos y actúa para reducir el coste.</p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/20 bg-surface/60 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-surface2/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filtros activos
          </span>
          <Badge variant="neutral" className="gap-1">
            <CalendarRange size={14} />
            {RANGE_LABELS[range]}
          </Badge>
          {filters.reasonId?.length ? (
            <Badge variant="info" className="gap-1">
              <Filter size={14} />
              Motivo
            </Badge>
          ) : null}
          {filters.hotelId ? (
            <Badge variant="info" className="gap-1">
              <Filter size={14} />
              Hotel
            </Badge>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <select
            className="ds-input min-w-[180px]"
            value={range}
            onChange={(e) => handleRangeChange(e.target.value as RangeKey)}
          >
            {Object.entries(RANGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="ds-input min-w-[180px]"
            value={filters.hotelId ?? ''}
            onChange={(e) => handleHotelChange(e.target.value)}
          >
            <option value="">Todos los hoteles</option>
            {(hotels.data ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            className="ds-input min-w-[180px]"
            value={filters.reasonId?.[0] ?? ''}
            onChange={(e) => handleReasonChange(e.target.value)}
          >
            <option value="">Todos los motivos</option>
            {(reasons ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,1.8fr,1.1fr]">
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
          <div className="mb-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Registrar merma</p>
            <p className="text-xl font-semibold text-foreground">New Log Entry</p>
            <p className="text-sm text-muted-foreground">Captura producto, motivo y coste estimado.</p>
          </div>
          <CreateWasteForm key={formKey} onSuccess={handleResetForm} onCancel={handleResetForm} />
          <div className="mt-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Merma de hoy</span>
              <span className="font-semibold text-foreground">
                {todayLoss.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </span>
            </div>
          </div>
        </Card>

        <WasteTable
          entries={entriesQuery.data ?? []}
          reasons={reasons}
          products={products}
          rangeLabel={RANGE_LABELS[range]}
          loading={entriesQuery.isLoading}
          error={entriesQuery.error}
          errorMessage={entriesError ?? undefined}
          onRetry={() => entriesQuery.refetch()}
        />

        <WasteStats entries={entriesQuery.data ?? []} reasons={reasons} />
      </div>
    </div>
  )
}
