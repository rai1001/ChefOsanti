
import { useMemo } from 'react'

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
}

export function MonthCalendar({ currentDate, events, onNavigate }: MonthCalendarProps) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon...

    // Adjust for Monday start (0 = Mon, 6 = Sun)
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
        events.forEach(e => {
            const dateKey = new Date(e.startsAt).toDateString()
            if (!map.has(dateKey)) map.set(dateKey, [])
            map.get(dateKey)?.push(e)
        })
        return map
    }, [events])

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

    return (
        <div className="glass-panel rounded-2xl p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white capitalize">
                    {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => onNavigate(new Date(year, month - 1, 1))}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => onNavigate(new Date(year, month + 1, 1))}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-white/10 rounded-lg overflow-hidden border border-white/10">
                {/* Weekday Headers */}
                {weekDays.map(day => (
                    <div key={day} className="bg-nano-navy-900/80 p-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}

                {/* Empty Cells for Start Padding */}
                {Array.from({ length: adjustedStartDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-nano-navy-900/30 min-h-[120px]" />
                ))}

                {/* Days */}
                {days.map(date => {
                    const dayEvents = eventsByDay.get(date.toDateString()) || []
                    const isToday = date.toDateString() === new Date().toDateString()

                    return (
                        <div key={date.toISOString()} className={`bg-nano-navy-900/30 min-h-[120px] p-2 hover:bg-white/5 transition-colors group relative border-t border-l border-white/5 first:border-l-0 ${isToday ? 'bg-nano-blue-900/10' : ''}`}>
                            <div className={`mb-2 text-right text-sm font-medium ${isToday ? 'text-nano-blue-400' : 'text-slate-400'}`}>
                                {date.getDate()}
                            </div>

                            <div className="space-y-1">
                                {dayEvents.map(ev => (
                                    <div
                                        key={ev.id}
                                        className="text-[10px] px-2 py-1 rounded bg-nano-blue-500/20 text-nano-blue-200 border border-nano-blue-500/10 truncate font-medium hover:scale-105 transition-transform cursor-pointer"
                                        title={ev.title}
                                    >
                                        {ev.title}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-[10px] text-slate-500 text-center italic">
                                        + {dayEvents.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
