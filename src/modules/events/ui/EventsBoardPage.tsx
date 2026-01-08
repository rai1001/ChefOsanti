import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { detectOverlaps } from '../domain/event'
import { useBookingsByHotel, useCreateSpace, useHotels, useSpaces } from '../data/events'

function toISO(dateStr: string, daysToAdd = 0) {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  if (!Number.isFinite(d.getTime())) return undefined
  d.setDate(d.getDate() + daysToAdd)
  return d.toISOString()
}

function formatRange(start?: string, end?: string) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleString()} - ${e.toLocaleTimeString()}`
}

export function EventsBoardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { session, loading, error } = useSupabaseSession()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(today)
  const [spaceName, setSpaceName] = useState('')
  const [spaceCapacity, setSpaceCapacity] = useState('')
  const createSpace = useCreateSpace()

  useEffect(() => {
    if (!hotelId && hotels.data?.length) {
      setHotelId(hotels.data[0].id)
    }
  }, [hotelId, hotels.data])

  const rangeStart = toISO(startDate)
  const rangeEnd = toISO(startDate, 7)

  const spaces = useSpaces(hotelId || undefined)
  const bookings = useBookingsByHotel({ hotelId: hotelId || '', startsAt: rangeStart, endsAt: rangeEnd })

  const bookingsBySpace = useMemo(() => {
    const map = new Map<string, typeof bookings.data>()
    bookings.data?.forEach((b) => {
      if (!map.has(b.spaceId)) map.set(b.spaceId, [])
      map.get(b.spaceId)?.push(b)
    })
    return map
  }, [bookings.data])

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error)
    return (
      <div className="rounded-xl glass-panel p-4 border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Inicia sesión para ver eventos.</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Salones</p>
          <h1 className="text-2xl font-bold text-white mt-1">Ocupación por salón</h1>
          <p className="text-sm text-slate-400">Rango semanal por hotel. Muestra avisos de solape.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Hotel</option>
            {hotels.data?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Link
            to="/events/new"
            className="rounded-lg bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-nano-blue-500/20 hover:scale-105 transition-all"
          >
            Nuevo evento
          </Link>
        </div>
      </header>

      <form
        className="flex flex-wrap items-center gap-3 rounded-2xl glass-panel p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!hotelId || !spaceName) return
          const selectedHotel = hotels.data?.find((h) => h.id === hotelId)
          const capNumber = spaceCapacity ? Number(spaceCapacity) : null
          await createSpace.mutateAsync({
            hotelId,
            orgId: selectedHotel?.orgId ?? '',
            name: spaceName,
            capacity: Number.isFinite(capNumber) ? capNumber : null,
            notes: null,
          })
          setSpaceName('')
          setSpaceCapacity('')
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nuevo salón</span>
        <input
          className="w-40 rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-nano-blue-500 focus:outline-none"
          placeholder="Nombre"
          value={spaceName}
          onChange={(e) => setSpaceName(e.target.value)}
        />
        <input
          className="w-28 rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-nano-blue-500 focus:outline-none"
          placeholder="Capacidad"
          value={spaceCapacity}
          onChange={(e) => setSpaceCapacity(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hotelId || !spaceName || createSpace.isPending}
        >
          {createSpace.isPending ? 'Guardando...' : 'Crear salón'}
        </button>
        {createSpace.isError && (
          <span className="text-xs text-red-400">
            {(createSpace.error as Error).message || 'No se pudo crear el salón'}
          </span>
        )}
      </form>

      {bookings.isLoading && <p className="text-sm text-slate-400">Cargando reservas...</p>}

      <div className="space-y-4">
        {spaces.data?.map((space) => {
          const list = bookingsBySpace.get(space.id) ?? []
          return (
            <div key={space.id} className="rounded-2xl glass-panel p-5 transition-all hover:bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-white">{space.name}</h2>
                  <p className="text-xs text-slate-400">
                    Capacidad {space.capacity ?? 'n/d'} · {list.length} reservas
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {list.length ? (
                  list.map((b) => {
                    const hasOverlap = detectOverlaps(list, b)
                    return (
                      <div
                        key={b.id}
                        className="flex flex-col gap-2 rounded-xl border border-white/5 bg-nano-navy-900/50 px-4 py-3 md:flex-row md:items-center md:justify-between hover:border-white/10 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{b.eventTitle ?? 'Evento'}</p>
                          <p className="text-xs text-slate-500">
                            {formatRange(b.startsAt, b.endsAt)} {b.groupLabel ? `· ${b.groupLabel}` : ''}
                          </p>
                        </div>
                        {hasOverlap && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                            SOLAPE
                          </span>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-slate-600 italic pl-1">Sin reservas en el rango.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
