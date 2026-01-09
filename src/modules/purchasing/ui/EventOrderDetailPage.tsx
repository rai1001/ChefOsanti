import { Link, useParams } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useEventOrder } from '../data/eventOrders'
import { useSuppliers } from '../data/suppliers'

export default function EventOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const order = useEventOrder(id)
  const suppliers = useSuppliers()

  const supplierName =
    suppliers.data?.find((s) => s.id === order.data?.order.supplierId)?.name ?? order.data?.order.supplierId

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
        <Link
          to="/purchasing/event-orders"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Volver
        </Link>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Lineas</h2>
          <span className="text-xs text-slate-500">{lines.length} items</span>
        </div>
        <div className="divide-y divide-slate-100">
          {lines.length ? (
            lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{line.itemLabel}</p>
                  <p className="text-xs text-slate-600">
                    Cantidad: {line.qty} {line.purchaseUnit} - Precio: {line.unitPrice ?? 'N/D'} - Total:{' '}
                    {line.lineTotal}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">Sin lineas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
