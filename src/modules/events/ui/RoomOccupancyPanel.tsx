import { useMemo } from 'react'
import { Badge } from '@/modules/shared/ui/Badge'
import { DataState } from '@/modules/shared/ui/DataState'
import { useRoomSchedules } from '../data/events'

type RoomOccupancyPanelProps = {
  hotelId: string
  date: Date
}

export function RoomOccupancyPanel({ hotelId, date }: RoomOccupancyPanelProps) {
  const isoDate = useMemo(() => date.toISOString().slice(0, 10), [date])
  const rooms = useRoomSchedules({ hotelId, eventDate: isoDate })

  return (
    <section className="rounded-3xl border border-border/25 bg-surface/60 p-5 shadow-[0_20px_40px_rgba(3,7,18,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Room Planning</p>
          <p className="text-lg font-semibold text-foreground">Salas ocupadas del día</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
      <DataState
        loading={rooms.isLoading}
        error={rooms.error}
        empty={Boolean(!rooms.isLoading && (rooms.data?.length ?? 0) === 0)}
        emptyState={
          <div className="text-sm text-muted-foreground">
            No se encontraron eventos para este día. Crea o importa eventos para llenar las salas.
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data?.map((room) => (
            <article key={`${room.roomName}-${room.eventDate}`} className="rounded-2xl border border-white/5 bg-surface2/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{room.roomName}</p>
                <Badge variant={room.confirmedEvents === room.eventCount ? 'success' : 'neutral'}>
                  {room.confirmedEvents}/{room.eventCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Eventos confirmados / total</p>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {room.events.slice(0, 2).map((evt) => (
                  <div key={evt.eventId} className="flex items-center justify-between gap-2">
                    <span className="truncate">{evt.title}</span>
                    <Badge variant={evt.status === 'confirmed' ? 'success' : 'info'} className="text-[10px]">
                      {evt.status}
                    </Badge>
                  </div>
                ))}
                {room.events.length > 2 && (
                  <div className="text-[11px] text-muted-foreground">
                    {room.events.length - 2} evento(s) más...
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </DataState>
    </section>
  )
}
