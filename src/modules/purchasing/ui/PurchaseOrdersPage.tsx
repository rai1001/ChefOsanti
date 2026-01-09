import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels, usePurchaseOrders } from '../data/orders'
import { useFormattedError } from '@/lib/shared/useFormattedError'
import type { PurchaseOrderStatus } from '../domain/purchaseOrder'

export function PurchaseOrdersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const { formatError } = useFormattedError()
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('')
  const [hotelId, setHotelId] = useState<string>('')
  const orders = usePurchaseOrders({
    status: status || undefined,
    hotelId: hotelId || undefined,
  })

  const hotelMap = useMemo(
    () =>
      (hotels.data ?? []).reduce<Record<string, string>>((acc, h) => {
        acc[h.id] = h.name
        return acc
      }, {}),
    [hotels.data],
  )

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error) {
    const { title, description } = formatError(error || new Error('Inicia sesión para ver pedidos.'))
    return (
      <div className="rounded border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-semibold text-red-500">{title}</p>
        <p className="text-xs text-red-400 opacity-90">{description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Compras</p>
          <h1 className="text-2xl font-bold text-white">Pedidos de compra</h1>
          <p className="text-sm text-slate-400">Filtra por estado u hotel.</p>
        </div>
        <Link
          to="/purchasing/orders/new"
          className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 hover:bg-nano-blue-500 transition-colors"
        >
          Nuevo pedido
        </Link>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
          value={status}
          onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="confirmed">Confirmado</option>
          <option value="received">Recibido</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
        >
          <option value="">Todos los hoteles</option>
          {(hotels.data ?? []).map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Listado</h2>
          {orders.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <div className="divide-y divide-white/10">
          {orders.data?.length ? (
            orders.data.map((po) => (
              <Link
                key={po.id}
                to={`/purchasing/orders/${po.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{po.orderNumber}</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-400">
                    Hotel: {hotelMap[po.hotelId] ?? 'N/D'} · Estado: {po.status} · €
                    {po.totalEstimated.toFixed(2)}
                  </p>
                </div>
                <span className="text-xs font-semibold text-nano-blue-400 group-hover:text-nano-blue-300 transition-colors">Ver</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-400 italic">No hay pedidos.</p>
          )}
        </div>
      </div>
    </div>
  )
}
