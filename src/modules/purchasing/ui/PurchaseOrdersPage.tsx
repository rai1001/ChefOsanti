import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels, usePurchaseOrders } from '../data/orders'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import type { PurchaseOrderStatus } from '../domain/purchaseOrder'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'

export default function PurchaseOrdersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const sessionError = useFormattedError(error)
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('')
  const [hotelId, setHotelId] = useState<string>('')
  const orders = usePurchaseOrders(activeOrgId ?? undefined, {
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

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  const isGuest = !session || Boolean(error)

  return (
    <div className="space-y-4 animate-fade-in">
      {isGuest && (
        <ErrorBanner
          title="Sesión requerida"
          message={sessionError || 'Necesitas iniciar sesión para ver pedidos.'}
        />
      )}
      <PageHeader
        title="Pedidos de compra"
        subtitle="Filtra por estado u hotel."
        actions={
          session ? (
            <Link
              to="/purchasing/orders/new"
              className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-colors hover:bg-nano-blue-500"
            >
              Nuevo pedido
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          className="ds-input max-w-xs"
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
          className="ds-input max-w-xs"
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

      <div className="ds-card overflow-hidden p-0">
        <div className="ds-section-header">
          <h2 className="text-sm font-semibold text-white">Listado</h2>
          {orders.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="ds-table min-w-full">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Hotel</th>
                <th>Estado</th>
                <th className="is-num">Total</th>
                <th className="is-action">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.isLoading ? (
                Array.from({ length: 3 }, (_, idx) => (
                  <tr key={`loading-${idx}`}>
                    <td colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : orders.isError ? (
                <tr>
                  <td colSpan={5}>
                    <ErrorBanner
                      title="Error al cargar pedidos"
                      message={useFormattedError(orders.error)}
                      onRetry={() => orders.refetch()}
                    />
                  </td>
                </tr>
              ) : orders.data?.length ? (
                orders.data.map((po) => (
                  <tr key={po.id}>
                    <td className="font-semibold text-white">{po.orderNumber}</td>
                    <td>{hotelMap[po.hotelId] ?? 'N/D'}</td>
                    <td>
                      <span className="ds-badge">{po.status}</span>
                    </td>
                    <td className="is-num">?{po.totalEstimated.toFixed(2)}</td>
                    <td className="is-action">
                      <Link
                        to={`/purchasing/orders/${po.id}`}
                        className="ds-btn ds-btn-ghost h-auto py-1"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                    Sin pedidos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
