import type { EventService } from '../domain/event'
import type { MenuTemplate } from '../data/menus'
import { ServiceMenuCard } from './ServiceMenuCard'

interface EventServicesSectionProps {
    services: EventService[]
    menuTemplates: MenuTemplate[]
    onDeleteService: (serviceId: string) => void
    onAddService: () => void
}

function formatDate(value?: string | null) {
    if (!value) return ''
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : value
}

export function EventServicesSection({ services, menuTemplates, onDeleteService, onAddService }: EventServicesSectionProps) {
    return (
        <section className="glass-panel">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Servicios</h2>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{services.length} servicios</span>
                    <button onClick={onAddService} className="text-xs text-nano-blue-300 hover:text-white font-medium">
                        + Añadir
                    </button>
                </div>
            </div>
            <div className="divide-y divide-white/5">
                {services.length ? (
                    services.map((s) => (
                        <div
                            key={s.id}
                            className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/5"
                        >
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-200">
                                        <span className="text-nano-blue-300 uppercase tracking-wider text-xs">{s.serviceType}</span> - {formatDate(s.startsAt)} {s.endsAt ? `-> ${formatDate(s.endsAt)}` : ''} - {s.format} -{' '}
                                        {s.pax} pax
                                    </p>
                                    <p className="text-xs text-slate-400 italic">{s.notes ?? ''}</p>
                                </div>
                                <button
                                    className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                                    onClick={() => onDeleteService(s.id)}
                                >
                                    Borrar
                                </button>
                            </div>
                            <ServiceMenuCard
                                serviceId={s.id}
                                orgId={s.orgId}
                                format={s.format}
                                pax={s.pax}
                                templates={menuTemplates}
                            />
                        </div>
                    ))
                ) : (
                    <p className="px-4 py-6 text-sm text-slate-400 italic">Sin servicios.</p>
                )}
            </div>
        </section>
    )
}
