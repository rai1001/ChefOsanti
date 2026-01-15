import { useMemo, useState } from 'react'
import { ArrowUpRight, BarChart3, CalendarRange, Flame, Layers, PieChart, TrendingUp } from 'lucide-react'
import { ReportList } from './components/ReportList'
import { ReportDetail } from './components/ReportDetail'
import { GenerateReportDialog } from './components/GenerateReportDialog'
import type { GeneratedReport } from '../domain/types'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'

type RangeKey = 'last7' | 'last30' | 'qtd'

const RANGE_LABELS: Record<RangeKey, string> = {
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  qtd: 'QTD',
}

const COST_SEGMENTS = [
  { label: 'Food Cost', kitchen: 62, events: 38, color: 'bg-accent' },
  { label: 'Labor', kitchen: 42, events: 23, color: 'bg-warning' },
  { label: 'Overhead', kitchen: 18, events: 12, color: 'bg-primary/70' },
]

const SALES_POINTS = [21, 32, 28, 40, 38, 46, 51, 49]

const HEATMAP: number[][] = [
  [12, 18, 22, 16, 14, 18, 20],
  [20, 24, 28, 22, 18, 26, 30],
  [30, 32, 34, 36, 28, 32, 38],
  [24, 26, 28, 30, 26, 24, 28],
]

function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0)
  const gradientStops = segments
    .reduce<{ color: string; from: number; to: number }[]>((acc, seg, idx) => {
      const prev = acc[idx - 1]
      const from = prev ? prev.to : 0
      const to = from + (seg.value / total) * 100
      acc.push({ color: seg.color, from, to })
      return acc
    }, [])
    .map((g) => `${g.color} ${g.from}% ${g.to}%`)
    .join(', ')

  return (
    <div className="relative mx-auto h-52 w-52">
      <div
        className="h-full w-full rounded-full shadow-[0_16px_48px_rgba(3,7,18,0.5)]"
        style={{ backgroundImage: `conic-gradient(${gradientStops})` }}
      />
      <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-surface/90">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Waste</p>
        <p className="text-2xl font-semibold text-foreground">€{total.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground">Periodo seleccionado</p>
      </div>
    </div>
  )
}

function StackedBar({ label, kitchen, events, color }: { label: string; kitchen: number; events: number; color: string }) {
  const total = kitchen + events
  const kitchenPct = Math.round((kitchen / total) * 100)
  const eventsPct = 100 - kitchenPct
  return (
    <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="flex items-center justify-between text-sm text-foreground">
        <span>{label}</span>
        <span className="text-muted-foreground">{total}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${kitchenPct}%` }} />
        <div className="h-full bg-white/30" style={{ width: `${eventsPct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Cocina {kitchenPct}%</span>
        <span>Eventos {eventsPct}%</span>
      </div>
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const normalized = points.map((p) => ((p - min) / range) * 60)
  const step = 100 / Math.max(points.length - 1, 1)
  return (
    <svg viewBox="0 0 100 60" className="h-20 w-full text-accent">
      <polyline fill="none" stroke="currentColor" strokeWidth="3" points={normalized.map((y, idx) => `${idx * step},${60 - y}`).join(' ')} />
    </svg>
  )
}

function Heatmap({ data }: { data: number[][] }) {
  const flat = data.flat()
  const max = Math.max(...flat)
  return (
    <div className="grid grid-cols-7 gap-1">
      {data.map((row, rowIdx) =>
        row.map((val, colIdx) => {
          const intensity = Math.max(0.25, val / max)
          return <div key={`${rowIdx}-${colIdx}`} className="aspect-square rounded-lg" style={{ backgroundColor: `rgba(124,136,255,${intensity})` }} />
        }),
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [range, setRange] = useState<RangeKey>('last30')

  const donutSegments = useMemo(
    () => [
      { label: 'Perecederos', value: 4200, color: '#F97316' },
      { label: 'Buffet', value: 1800, color: '#22D3EE' },
      { label: 'Eventos', value: 1200, color: '#A855F7' },
    ],
    [],
  )

  const summaryCards = [
    { label: 'Food Cost', value: '31.4%', delta: '+0.8%', icon: BarChart3 },
    { label: 'Waste', value: '€7.2k', delta: '-4.1%', icon: Flame },
    { label: 'Ventas', value: '€142k', delta: '+6.5%', icon: TrendingUp },
    { label: 'Sucursales', value: '5', delta: 'Multi-branch', icon: Layers },
  ]

  const handleSuccess = () => setRefreshKey((prev) => prev + 1)

  return (
    <div className="space-y-6 animate-fade-in">
      {!activeReport && (
        <PageHeader
          title="Operational Insights & Reports"
          subtitle="Waste donut, stacked cost bars, ventas y heatmap multi-sucursal."
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-xs text-muted-foreground">
                <CalendarRange size={14} />
                <select
                  className="bg-transparent text-foreground focus:outline-none"
                  value={range}
                  onChange={(e) => setRange(e.target.value as RangeKey)}
                >
                  {Object.entries(RANGE_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-surface text-foreground">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setIsGenerateOpen(true)}>
                <PieChart size={16} />
                Generar Informe
              </Button>
            </div>
          }
        />
      )}

      {!activeReport && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="rounded-3xl border border-border/25 bg-surface/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                  </div>
                  <span className="rounded-full bg-white/5 p-2 text-muted-foreground">
                    <card.icon size={18} />
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-accent">
                  <ArrowUpRight size={14} />
                  {card.delta}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Waste Breakdown</p>
                  <p className="text-sm text-muted-foreground">{RANGE_LABELS[range]}</p>
                </div>
                <Badge variant="neutral">CO2e incluido</Badge>
              </div>
              <div className="mt-3 grid gap-6 lg:grid-cols-[0.9fr,1fr]">
                <Donut segments={donutSegments} />
                <div className="space-y-3">
                  {donutSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{seg.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {((seg.value / donutSegments.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}% del coste
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground">€{seg.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Costo Operativo</p>
                  <p className="text-sm text-muted-foreground">Cocina vs Eventos</p>
                </div>
                <Badge variant="info">Stacked</Badge>
              </div>
              <div className="space-y-3">
                {COST_SEGMENTS.map((seg) => (
                  <StackedBar key={seg.label} label={seg.label} kitchen={seg.kitchen} events={seg.events} color={seg.color} />
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
                Eventos suben 3.5% en labor; cocina estable en 62% food cost.
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Ventas</p>
                  <p className="text-sm text-muted-foreground">Linea semanal</p>
                </div>
                <Badge variant="neutral">€</Badge>
              </div>
              <Sparkline points={SALES_POINTS} />
            </Card>

            <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Heatmap Sucursales</p>
                  <p className="text-sm text-muted-foreground">Carga semanal</p>
                </div>
                <Badge variant="neutral">Multi-branch</Badge>
              </div>
              <Heatmap data={HEATMAP} />
            </Card>
          </div>
        </>
      )}

      {activeReport ? (
        <ReportDetail report={activeReport} onBack={() => setActiveReport(null)} />
      ) : (
        <ReportList onSelectReport={setActiveReport} refreshKey={refreshKey} />
      )}

      <GenerateReportDialog isOpen={isGenerateOpen} onClose={() => setIsGenerateOpen(false)} onSuccess={handleSuccess} />
    </div>
  )
}
