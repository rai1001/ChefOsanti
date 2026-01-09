import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useEventOrders } from '../data/eventOrders'
import { useSuppliers } from '../data/suppliers'

export default function EventOrdersPage() {
  const { session, loading, error } = useSupabaseSession()
  const orders = useEventOrders()
  const suppliers = useSuppliers()

  const supplierMap =
    suppliers.data?.reduce<Record<string, string>>((acc, s) => {
      acc[s.id] = s.name
      return acc
    }, {}) ?? {}

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando sesion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para ver pedidos.</p>
      </div>
    )

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Pedidos evento</p>
          <h1 className="text-2xl font-semibold text-slate-900">Borradores por evento</h1>
          <p className="text-sm text-slate-600">Generados desde necesidades de servicios.</p>
        </div>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          {orders.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {orders.data?.length ? (
            orders.data.map((po) => (
              <Link
                key={po.id}
                to={`/purchasing/event-orders/${po.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{po.orderNumber}</p>
                  <p className="text-xs text-slate-600">
                    Proveedor: {supplierMap[po.supplierId] ?? po.supplierId} - Estado: {po.status} - Total:{' '}
                    {po.totalEstimated.toFixed(2)}
                  </p>
                </div>
                <span className="text-xs text-brand-700">Ver</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">No hay pedidos de evento.</p>
          )}
        </div>
      </div>
    </div>
  )
}
