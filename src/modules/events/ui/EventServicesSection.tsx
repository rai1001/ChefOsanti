import { useState } from 'react'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'
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
    const [toDelete, setToDelete] = useState<string | null>(null)

    return (
        <section className="glass-panel">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Servicios</h2>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{services.length} servicios</span>
                    <button onClick={onAddService} className="text-xs font-medium text-nano-blue-300 hover:text-white">
                        + A¤adir
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
                                        <span className="text-xs uppercase tracking-wider text-nano-blue-300">{s.serviceType}</span> - {formatDate(s.startsAt)} {s.endsAt ? `-> ${formatDate(s.endsAt)}` : ''} - {s.format} - {s.pax} pax
                                    </p>
                                    <p className="text-xs italic text-slate-400">{s.notes ?? ''}</p>
                                </div>
                                <button
                                    className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                                    onClick={() => setToDelete(s.id)}
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
                    <p className="px-4 py-6 text-sm italic text-slate-400">Sin servicios.</p>
                )}
            </div>
            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar servicio"
                description="Esta acci¢n borrar  el servicio del evento."
                confirmLabel="Eliminar"
                onConfirm={() => {
                    if (toDelete) onDeleteService(toDelete)
                    setToDelete(null)
                }}
                onCancel={() => setToDelete(null)}
            />
        </section>
    )
}
