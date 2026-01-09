import { useState } from 'react'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useHotels, useIngredients } from '../data/orders'
import { useFormattedError } from '@/lib/shared/useFormattedError'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'

export function StockPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const [hotelId, setHotelId] = useState<string>('')
  const ingredients = useIngredients(activeOrgId ?? undefined, hotelId || undefined)
  const { formatError } = useFormattedError()

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error) {
    const { title, description } = formatError(error || new Error('Inicia sesión para ver stock.'))
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
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Inventario</p>
          <h1 className="text-2xl font-bold text-white">Stock por hotel</h1>
        </div>
        <select
          className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
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
      </header>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Ingredientes</h2>
          {ingredients.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <div className="divide-y divide-white/10">
          {ingredients.data?.length ? (
            ingredients.data.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{ing.name}</p>
                  <p className="text-xs text-slate-500">Unidad: {ing.baseUnit}</p>
                </div>
                <p className="text-sm font-semibold text-white">{ing.stock ?? 0}</p>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-400 italic">Selecciona hotel para ver stock.</p>
          )}
        </div>
      </div>
    </div>
  )
}
