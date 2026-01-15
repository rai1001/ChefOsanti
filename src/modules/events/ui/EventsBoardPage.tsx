import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useHotels } from '@/modules/events/data/events'
import { useBookingsByHotel } from '@/modules/events/data/events'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { Badge } from '@/modules/shared/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { DataState } from '@/modules/shared/ui/DataState'
import { Skeleton } from '@/modules/shared/ui/Skeleton'

type Status = 'Confirmed' | 'Draft' | 'Completed'

type EventRow = {
  id: string
  name: string
  date: string
  guests: number
  status: Status
  staff: string
}

const statusTone: Record<Status, 'success' | 'warning' | 'info'> = {
  Confirmed: 'success',
  Draft: 'info',
  Completed: 'warning',
}

export default function EventsBoardPage() {
  const { session, loading, error } = useSupabaseSession()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const bookings = useBookingsByHotel({
    hotelId: hotelId || (hotels.data?.[0]?.id ?? ''),
    startsAt: undefined,
    endsAt: undefined,
  })

  useEffect(() => {
    if (!hotelId && hotels.data?.length) setHotelId(hotels.data[0].id)
  }, [hotels.data, hotelId])

  const events: EventRow[] = useMemo(() => {
    if (!bookings.data) return []
    return bookings.data.map((b) => ({
      id: b.id,
      name: b.eventTitle || 'Evento',
      date: b.startsAt ? new Date(b.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--',
      guests: b.groupLabel ? Number(b.groupLabel) || 0 : 0,
      status: 'Confirmed',
      staff: b.spaceName ?? '—',
    }))
  }, [bookings.data])

  const sessionError = useFormattedError(error)
  const bookingsError = useFormattedError(bookings.error)

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Cargando sesión...</p>
  if (!session || error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Inicia sesión para ver eventos. {sessionError}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">ChefOS</p>
          <h1 className="text-4xl font-semibold text-foreground">Events Management Overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border/30 bg-surface/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`rounded-md px-3 py-2 text-sm transition ${viewMode === 'calendar' ? 'bg-brand-500 text-bg shadow-[0_8px_20px_rgb(var(--accent)/0.25)]' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-2 text-sm transition ${viewMode === 'list' ? 'bg-brand-500 text-bg shadow-[0_8px_20px_rgb(var(--accent)/0.25)]' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-surface/70 px-3 py-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Hotel</span>
            <select
              className="bg-transparent text-sm text-foreground outline-none"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/events/new"
            className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-bg shadow-[0_12px_30px_rgb(var(--accent)/0.28)] transition hover:brightness-110"
          >
            New Event
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm9 2-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search events, staff, or keywords..."
              className="h-11 w-full rounded-xl border border-border/30 bg-surface2/70 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <select className="ds-input h-11 w-40 bg-surface/70 text-foreground">
            <option>Date Range</option>
          </select>
          <select className="ds-input h-11 w-36 bg-surface/70 text-foreground">
            <option>Status</option>
          </select>
          <select className="ds-input h-11 w-44 bg-surface/70 text-foreground">
            <option>Assigned To</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border/20 bg-surface/40 backdrop-blur-lg">
          <DataState
            loading={bookings.isLoading}
            error={bookings.error}
            errorTitle="Error al cargar eventos"
            errorMessage={bookingsError}
            onRetry={() => bookings.refetch()}
            empty={events.length === 0}
            emptyState={
              <div className="p-6">
                <EmptyState
                  title="Sin eventos"
                  description="Crea un nuevo evento para empezar a planificar."
                  action={
                    <Link
                      to="/events/new"
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-bg shadow-[0_10px_24px_rgb(var(--accent)/0.25)]"
                    >
                      Nuevo evento
                    </Link>
                  }
                />
              </div>
            }
            skeleton={
              <div className="space-y-2 p-6">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-surface/60">
                  <TableHead>Event Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Guest Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id} className="hover:bg-white/5">
                    <TableCell className="text-foreground">{ev.name}</TableCell>
                    <TableCell className="text-muted-foreground">{ev.date}</TableCell>
                    <TableCell className="text-foreground">{ev.guests}</TableCell>
                    <TableCell>
                      <Badge variant={statusTone[ev.status]} className="capitalize">
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{ev.staff}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      <button
                        type="button"
                        className="rounded-md border border-border/20 bg-surface/50 px-2 py-1 text-xs text-muted-foreground hover:border-accent/50 hover:text-foreground"
                      >
                        ···
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing 1-10 of {events.length} events</span>
          <div className="flex items-center gap-1">
            <button className="rounded-lg border border-border/30 bg-surface/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{'<'}</button>
            <button className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-bg shadow-[0_8px_20px_rgb(var(--accent)/0.25)]">
              1
            </button>
            <button className="rounded-lg border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
              2
            </button>
            <button className="rounded-lg border border-border/30 bg-surface/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{'>'}</button>
          </div>
        </div>
      </section>
    </div>
  )
}
