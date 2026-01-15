import { useMemo } from 'react'
import type { WasteEntry, WasteReason } from '../../domain/types'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface Props {
  entries: WasteEntry[]
  reasons?: WasteReason[]
}

const PALETTE = ['#FF6B6B', '#FF9F43', '#3AC7A5', '#7C83FF', '#F5C518', '#FF7A9E']

export function WasteStats({ entries, reasons }: Props) {
  const { totalCost, totalQty, segments } = useMemo(() => {
    const cost = entries.reduce((acc, e) => acc + e.totalCost, 0)
    const qty = entries.reduce((acc, e) => acc + e.quantity, 0)
    const buckets = entries.reduce((acc, entry) => {
      acc[entry.reasonId] = (acc[entry.reasonId] ?? 0) + entry.totalCost
      return acc
    }, {} as Record<string, number>)

    const ordered = Object.entries(buckets)
      .sort(([, a], [, b]) => b - a)
      .map(([id, value], idx) => ({
        id,
        label: reasons?.find((r) => r.id === id)?.name ?? 'Motivo',
        value,
        pct: cost > 0 ? Math.round((value / cost) * 100) : 0,
        color: PALETTE[idx % PALETTE.length],
      }))
    return {
      totalCost: cost,
      totalQty: qty,
      segments: ordered,
    }
  }, [entries, reasons])

  const gradient = segments.length
    ? `conic-gradient(${segments
        .map((s, idx) => `${s.color} ${idx === 0 ? 0 : segments.slice(0, idx).reduce((a, b) => a + b.pct, 0)}% ${segments
          .slice(0, idx + 1)
          .reduce((a, b) => a + b.pct, 0)}%`)
        .join(', ')})`
    : 'conic-gradient(#0f172a 0deg, #0f172a 360deg)'

  const envImpact = Math.max(0, Math.round(totalQty * 2.5))

  return (
    <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.45)] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Waste by Category</p>
          <p className="text-sm text-muted-foreground">Distribución del coste por motivo</p>
        </div>
        <Badge variant="danger">Costo: {formatCurrency(totalCost)}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr] items-center">
        <div className="relative mx-auto flex items-center justify-center">
          <div
            className="h-52 w-52 rounded-full border border-white/10 shadow-[0_12px_40px_rgba(15,23,42,0.45)]"
            style={{ backgroundImage: gradient }}
          />
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-surface/80 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pérdida total</p>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalCost)}</p>
            <p className="text-[11px] text-muted-foreground">Periodo seleccionado</p>
          </div>
        </div>

        <div className="space-y-3">
          {segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos suficientes.</p>
          ) : (
            segments.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.pct}% del coste</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(s.value)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger/80">Total Financial Loss</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
          <p className="text-sm text-muted-foreground">Incluye todas las mermas del periodo.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning/80">Environmental Impact</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{envImpact} kg CO2e</p>
          <p className="text-sm text-muted-foreground">Estimación rápida según volumen de merma.</p>
        </div>
      </div>
    </Card>
  )
}
