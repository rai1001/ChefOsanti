import { Link, useParams } from 'react-router-dom'
import { Printer, Mail } from 'lucide-react'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useEventOrder } from '../data/eventOrders'
import { useSuppliers } from '../data/suppliers'
import { ApprovalActions } from './ApprovalActions'

export default function EventOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const order = useEventOrder(id)
  const suppliers = useSuppliers(activeOrgId ?? undefined)

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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Pedido evento</p>
          <h1 className="text-2xl font-semibold text-slate-900">{po.orderNumber}</h1>
          <p className="text-sm text-slate-600">
            Estado: {po.status} - Proveedor: {supplierName ?? 'N/D'} - Total estimado:{' '}
            {po.totalEstimated.toFixed(2)}
          </p>
        </div>
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
      </header>

      <ApprovalActions
        entityType="event_purchase_order"
        entityId={po.id}
        currentStatus={po.approvalStatus}
      />

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
                      {line.unitMismatch ? 'Unidad incompatible' : line.freeze ? 'Congelada' : 'OK'}
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

      <style>{`
        @media print {
          .print\\:hidden, a, button { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          .rounded-lg, .border { border: 1px solid #eee !important; box-shadow: none !important; }
          h1, h2, h3, p, span, div { color: black !important; }
        }
      `}</style>
    </div>
  )
}
