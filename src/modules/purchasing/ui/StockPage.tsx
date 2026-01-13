import { useState } from 'react'
import { Package } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useHotels, useIngredients } from '../data/orders'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { PageHeader } from '@/modules/shared/ui/PageHeader'

export default function StockPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const [hotelId, setHotelId] = useState<string>('')
  const ingredients = useIngredients(activeOrgId ?? undefined, hotelId || undefined)
  const sessionError = useFormattedError(error)

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  if (!session || error) {
    return (
      <ErrorBanner
        title="Inicia sesión"
        message={sessionError || 'Inicia sesión para ver stock.'}
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Stock por hotel"
        subtitle="Elige un hotel para revisar su inventario y consumos."
        actions={
          <select
            className="ds-input max-w-xs"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Selecciona hotel</option>
            {hotels.data?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="ds-card">
        <div className="ds-section-header">
          <div>
            <h2 className="text-sm font-semibold text-white">Ingredientes</h2>
            <p className="text-xs text-slate-400">{hotelId ? 'Inventario cargado' : 'Sin hotel seleccionado'}</p>
          </div>
          {ingredients.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        {ingredients.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : ingredients.data?.length ? (
          <div className="overflow-x-auto">
            <table className="ds-table min-w-full">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Unidad</th>
                  <th className="is-num">Stock</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.data.map((ing) => (
                  <tr key={ing.id}>
                    <td className="font-semibold text-slate-200">{ing.name}</td>
                    <td>{ing.baseUnit}</td>
                    <td className="is-num">{ing.stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="Sin datos"
              description={
                hotelId
                  ? 'No hay ingredientes registrados para este hotel.'
                  : 'Selecciona un hotel para ver su inventario.'
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
