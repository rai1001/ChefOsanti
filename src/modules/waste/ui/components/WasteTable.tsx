import { useMemo } from 'react'
import type { WasteEntry, WasteReason } from '../../domain/types'
import type { Product } from '@/modules/recipes/domain/recipes'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/modules/shared/ui/EmptyState'

interface WasteTableProps {
  entries: WasteEntry[]
  products?: Product[]
  reasons?: WasteReason[]
  rangeLabel?: string
}

export function WasteTable({ entries, products, reasons, rangeLabel }: WasteTableProps) {
  const productMap = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  )
  const reasonMap = useMemo(
    () => new Map((reasons ?? []).map((r) => [r.id, r.name])),
    [reasons],
  )

  if (!entries.length) {
    return (
      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-6 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
        <EmptyState
          title="Sin mermas en el periodo"
          description="Registra nuevas mermas para ver el historial y su coste."
        />
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.45)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Historical Log</p>
          <p className="text-sm text-muted-foreground">{rangeLabel ?? 'Periodo seleccionado'}</p>
        </div>
        <Badge variant="neutral">Registros: {entries.length}</Badge>
      </div>

      <div className="overflow-hidden">
        <Table className="min-w-[680px] text-foreground">
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Coste</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const date = new Date(entry.occurredAt)
              const product = productMap.get(entry.productId)
              const reasonName = reasonMap.get(entry.reasonId) ?? 'Motivo'
              return (
                <TableRow key={entry.id} className="hover:bg-white/5">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{product?.name ?? 'Producto'}</p>
                      <p className="text-xs font-mono text-muted-foreground/80">{entry.productId.slice(0, 8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="capitalize">
                      {reasonName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {entry.quantity.toFixed(2)} {entry.unit.toUpperCase()}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-danger">
                    {formatCurrency(entry.totalCost)}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground" title={entry.notes ?? ''}>
                    {entry.notes || '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
