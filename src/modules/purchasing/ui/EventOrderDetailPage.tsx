import { Link, useParams } from 'react-router-dom'
import { Printer, Mail } from 'lucide-react'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useEventOrder } from '../data/eventOrders'
import { useSuppliers } from '../data/suppliers'
import { ApprovalActions } from './ApprovalActions'
import { useReservationsByEvent, releaseReservation, upsertReservationForEvent } from '@/modules/inventory/data/reservations'
import { useQuery } from '@tanstack/react-query'
import { getStockOnHand } from '../data/stock'
import { detectReservationConflicts } from '@/modules/inventory/domain/reservations'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'
import { useState } from 'react'

export default function EventOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const order = useEventOrder(id)
  const suppliers = useSuppliers(activeOrgId ?? undefined)
  const reservations = useReservationsByEvent(order.data?.order.eventId)
  const [confirmRelease, setConfirmRelease] = useState(false)

  const stockQuery = useQuery({
    queryKey: ['stock_on_hand_for_order', order.data?.order.hotelId, order.data?.lines.map((l) => l.supplierItemId).join(',')],
    queryFn: () =>
      getStockOnHand(
        activeOrgId ?? '',
        order.data?.order.hotelId ?? '',
        order.data?.lines.map((l) => l.supplierItemId) ?? [],
      ),
    enabled: Boolean(activeOrgId && order.data?.order.hotelId && order.data?.lines.length),
  })

  const supplierName =
    suppliers.data?.find((s) => s.id === order.data?.order.supplierId)?.name ?? order.data?.order.supplierId

  const handleEmailExport = () => {
    if (!order.data) return
    const { order: po, lines } = order.data
    const subject = `Pedido Evento ${po.orderNumber} - ${supplierName}`
    const body = `Resumen del pedido de evento:\n\n` +
      `Número: ${po.orderNumber}\n` +
      `Proveedor: ${supplierName}\n` +
      `Total estimado: €${po.totalEstimated.toFixed(2)}\n\n` +
      `Líneas:\n` +
      lines.map(l => `- ${l.itemLabel}: ${l.qty} ${l.purchaseUnit}`).join('\n')

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleReserve = async () => {
    if (!order.data || !activeOrgId) return
    await upsertReservationForEvent({
      orgId: activeOrgId,
      hotelId: order.data.order.hotelId,
      locationId: null,
      eventId: order.data.order.eventId,
      eventServiceId: null,
      createdBy: session?.user?.id ?? null,
      lines: order.data.lines.map((l) => ({
        supplierItemId: l.supplierItemId,
        qty: l.qty,
        unit: l.purchaseUnit,
        source: 'net_need' as const,
      })),
    })
    reservations.refetch()
  }

  const handleRelease = async () => {
    if (!order.data) return
    await releaseReservation(order.data.order.eventId, null)
    setConfirmRelease(false)
    reservations.refetch()
  }

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando sesion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para ver pedidos.</p>
      </div>
    )

  if (order.isLoading) return <p className="p-4 text-sm text-slate-600">Cargando pedido...</p>
  if (order.isError || !order.data)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">No se pudo cargar el pedido.</p>
        <Link to="/purchasing/event-orders" className="text-sm text-brand-700 underline">
          Volver al listado
        </Link>
      </div>
    )

  const { order: po, lines } = order.data
  const reservedAggregated = (reservations.data ?? [])
    .filter((r: any) => r.status === 'active')
    .reduce<Record<string, number>>((acc, r: any) => {
      for (const line of r.stock_reservation_lines ?? []) {
        const key = line.supplier_item_id as string
        acc[key] = (acc[key] ?? 0) + Number(line.qty ?? 0)
      }
      return acc
    }, {})

  return (
    <div className="space-y-4">
      <PageHeader
        title={po.orderNumber}
        subtitle={`Estado: ${po.status} · Proveedor: ${supplierName ?? 'N/D'} · Total estimado: ${po.totalEstimated.toFixed(2)}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">PDF</span>
            </button>
            <button
              onClick={handleEmailExport}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden md:inline">Enviar</span>
            </button>
            <Link
              to="/purchasing/event-orders"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Volver
            </Link>
          </div>
        }
      />

      <ApprovalActions
        entityType="event_purchase_order"
        entityId={po.id}
        currentStatus={po.approvalStatus}
      />

      <div className="flex gap-2">
        <button
          onClick={handleReserve}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Reservar stock
        </button>
        <button
          onClick={() => setConfirmRelease(true)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Liberar reserva
        </button>
        {reservations.isFetching && <span className="text-xs text-slate-500">Actualizando reservas...</span>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Lineas</h2>
          <span className="text-xs text-slate-500">{lines.length} items</span>
        </div>
        {lines.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Item</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Need</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">On hand</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">On order</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Buffer</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Net</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Rounded</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900">
                      <div className="font-semibold">{line.itemLabel}</div>
                      <div className="text-[11px] text-slate-500">Proveedor item: {line.supplierItemId}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.grossQty ?? line.qty).toFixed(2)} {line.purchaseUnit}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.onHandQty ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.onOrderQty ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.bufferQty ?? 0).toFixed(2)} (+{Number(line.bufferPercent ?? 0).toFixed(0)}%)
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.netQty ?? line.qty).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">
                      {Number(line.roundedQty ?? line.qty).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-700">
                      {(() => {
                        const stock = stockQuery.data?.[line.supplierItemId] ?? line.onHandQty ?? 0
                        const reserved = reservedAggregated[line.supplierItemId] ?? 0
                        const conflict = detectReservationConflicts(stock, reserved)
                        if (line.unitMismatch) return 'Unidad incompatible'
                        if (conflict.hasConflict) return `Conflicto (-${conflict.shortage.toFixed(2)})`
                        if (line.freeze) return 'Congelada'
                        return 'OK'
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-slate-600">Sin lineas.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Reservas activas</h2>
          {reservations.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {(reservations.data ?? []).filter((r: any) => r.status === 'active').length ? (
            (reservations.data ?? [])
              .filter((r: any) => r.status === 'active')
              .map((r: any) => (
                <div key={r.id} className="px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Reserva {r.id.slice(0, 6)} - servicio: {r.event_service_id ?? 'evento'}
                  </p>
                  <div className="space-y-1">
                    {(r.stock_reservation_lines ?? []).map((l: any, idx: number) => {
                      const stock = stockQuery.data?.[l.supplier_item_id] ?? 0
                      const reservedTotal = reservedAggregated[l.supplier_item_id] ?? l.qty
                      const conflict = detectReservationConflicts(stock, reservedTotal)
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                          <span>{l.supplier_item_id}</span>
                          <span className="font-mono">{Number(l.qty).toFixed(2)} {l.unit}</span>
                          {conflict.hasConflict && (
                            <span className="text-red-600 font-semibold">Conflicto (-{conflict.shortage.toFixed(2)})</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">No hay reservas activas.</p>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden, a, button { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          .rounded-lg, .border { border: 1px solid #eee !important; box-shadow: none !important; }
          h1, h2, h3, p, span, div { color: black !important; }
        }
      `}</style>

      <ConfirmDialog
        open={confirmRelease}
        title="Liberar reserva"
        description="Esto liberará el stock reservado para este evento. ¿Continuar?"
        confirmLabel="Liberar"
        onCancel={() => setConfirmRelease(false)}
        onConfirm={handleRelease}
      />
    </div>
  )
}
