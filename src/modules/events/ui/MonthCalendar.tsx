import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/modules/shared/ui/Card'

interface Event {
  id: string
  title: string
  startsAt: string
  status: string
  color?: string
}

interface MonthCalendarProps {
  currentDate: Date
  events: Event[]
  onNavigate: (date: Date) => void
  onSelectEvent?: (eventId: string) => void
}

export function MonthCalendar({ currentDate, events, onNavigate, onSelectEvent }: MonthCalendarProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayOfWeek = new Date(year, month, 1).getDay()

  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const days = useMemo(() => {
    const d = []
    for (let i = 1; i <= daysInMonth; i++) {
      d.push(new Date(year, month, i))
    }
    return d
  }, [year, month, daysInMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach((event) => {
      const dateKey = new Date(event.startsAt).toDateString()
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)?.push(event)
    })
    return map
  }, [events])

  const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

  return (
    <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate(new Date(year, month - 1, 1))}
            className="rounded-lg border border-border/30 bg-surface/60 p-2 text-muted-foreground hover:text-foreground"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate(new Date(year, month + 1, 1))}
            className="rounded-lg border border-border/30 bg-surface/60 p-2 text-muted-foreground hover:text-foreground"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border/20 bg-border/20">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-surface/60 p-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: adjustedStartDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[120px] bg-surface/40" />
        ))}

        {days.map((date) => {
          const dayEvents = eventsByDay.get(date.toDateString()) || []
          const visibleEvents = dayEvents.slice(0, 3)
          const isToday = date.toDateString() === new Date().toDateString()

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[120px] border-t border-border/20 p-2 transition-colors hover:bg-surface/60 ${
                isToday ? 'bg-accent/10' : 'bg-surface/40'
              }`}
            >
              <div
                className={`mb-2 text-right text-sm font-semibold ${
                  isToday ? 'text-accent' : 'text-muted-foreground'
                }`}
              >
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent?.(event.id)}
                    className="w-full truncate rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-left text-[10px] font-semibold text-accent hover:bg-accent/20"
                    title={event.title}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-center text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
