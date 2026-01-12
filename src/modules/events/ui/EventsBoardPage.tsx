import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { detectOverlaps } from '../domain/event'
import { useBookingsByHotel, useCreateSpace, useHotels, useSpaces } from '../data/events'
import { CalendarOff, LayoutGrid, List } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { toast } from '@/modules/shared/ui/Toast'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { MonthCalendar } from './MonthCalendar'

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

export default function EventsBoardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { session, loading, error } = useSupabaseSession()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string>('')

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Create Space State
  const [spaceName, setSpaceName] = useState('')
  const [spaceCapacity, setSpaceCapacity] = useState('')
  const createSpace = useCreateSpace()
  const sessionError = useFormattedError(error)
  const createSpaceError = useFormattedError(createSpace.error)

  useEffect(() => {
    if (!hotelId && hotels.data?.length) {
      setHotelId(hotels.data[0].id)
    }
  }, [hotelId, hotels.data])

  // Date Range Calculation
  const rangeStart = useMemo(() => {
    if (viewMode === 'list') return toISO(currentDate.toISOString().slice(0, 10))
    // For Calendar: Start of Month
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
  }, [viewMode, currentDate])

  const rangeEnd = useMemo(() => {
    if (viewMode === 'list') return toISO(currentDate.toISOString().slice(0, 10), 7)
    // For Calendar: End of Month
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString()
  }, [viewMode, currentDate])


  const spaces = useSpaces(hotelId || undefined)
  const bookings = useBookingsByHotel({ hotelId: hotelId || '', startsAt: rangeStart, endsAt: rangeEnd })

  const bookingsBySpace = useMemo(() => {
    const map = new Map<string, typeof bookings.data>()
    bookings.data?.forEach((b) => {
      // Normalize spaceId (sometimes might be null in raw data?)
      const sId = b.spaceId || 'unassigned'
      if (!map.has(sId)) map.set(sId, [])
      map.get(sId)?.push(b)
    })
    return map
  }, [bookings.data])

  // Calendar Events Adapter
  const calendarEvents = useMemo(() => {
    return bookings.data?.map(b => ({
      id: b.id,
      title: b.eventTitle || 'Sin Título',
      startsAt: b.startsAt,
      status: 'confirmed'
    })) || []
  }, [bookings.data])


  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error) {
    return (
      <div className="rounded-xl glass-panel p-4 border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Inicia sesión para ver eventos.</p>
        <p className="text-xs text-red-400 mt-1">{sessionError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Eventos</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            {viewMode === 'calendar' ? 'Calendario de Eventos' : 'Ocupación por Salón'}
          </h1>
          <p className="text-sm text-slate-400">
            {viewMode === 'calendar' ? 'Vista mensual de eventos programados.' : 'Rango semanal por hotel.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">

          {/* View Toggle */}
          <div className="flex bg-nano-navy-800 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-nano-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Vista Calendario"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-nano-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Vista Lista"
            >
              <List size={18} />
            </button>
          </div>

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

          {viewMode === 'list' && (
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
              value={currentDate.toISOString().slice(0, 10)}
              onChange={(e) => setCurrentDate(new Date(e.target.value))}
            />
          )}

          <Link
            to="/events/new"
            className="rounded-lg bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-nano-blue-500/20 hover:scale-105 transition-all"
          >
            Nuevo evento
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'calendar' ? (
        <MonthCalendar
          currentDate={currentDate}
          events={calendarEvents}
          onNavigate={setCurrentDate}
        />
      ) : (
        /* LIST VIEW (Legacy) */
        <>
          <form
            className="flex flex-wrap items-center gap-3 rounded-2xl glass-panel p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!hotelId || !spaceName) return
              const selectedHotel = hotels.data?.find((h) => h.id === hotelId)
              const capNumber = spaceCapacity ? Number(spaceCapacity) : null
              try {
                await createSpace.mutateAsync({
                  hotelId,
                  orgId: selectedHotel?.orgId ?? '',
                  name: spaceName,
                  capacity: Number.isFinite(capNumber) ? capNumber : null,
                  notes: null,
                })
                toast.success('Salón creado correctamente')
                setSpaceName('')
                setSpaceCapacity('')
              } catch (e) {
                toast.error('Error al crear salón')
              }
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
          </form>

          {bookings.isLoading && <p className="text-sm text-slate-400">Cargando reservas...</p>}

          <div className="space-y-4">
            {spaces.data?.length === 0 && (
              <EmptyState
                icon={CalendarOff}
                title="Sin salones"
                description="Crea salones para organizar eventos."
                compact
              />
            )}
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
                      <div className="py-2">
                        <EmptyState
                          icon={CalendarOff}
                          title="Sin reservas"
                          description="No hay eventos programados en este rango."
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

    </div>
  )
}
