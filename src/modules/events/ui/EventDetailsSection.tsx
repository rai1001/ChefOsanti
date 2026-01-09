import type { Event } from '../data/events'

interface EventDetailsSectionProps {
    event: Event
}

function formatDate(value?: string | null) {
    if (!value) return ''
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : value
}

export function EventDetailsSection({ event }: EventDetailsSectionProps) {
    return (
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Eventos</p>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{event?.title}</h1>
                <p className="text-sm text-slate-400">
                    Estado: <span className="text-slate-200">{event?.status}</span> - Cliente: <span className="text-slate-200">{event?.clientName ?? 'N/D'}</span>
                </p>
                <p className="text-xs text-slate-500">
                    {event?.startsAt ? `Inicio ${formatDate(event.startsAt)}` : ''}{' '}
                    {event?.endsAt ? `Fin ${formatDate(event.endsAt)}` : ''}
                </p>
            </div>
        </header>
    )
}
