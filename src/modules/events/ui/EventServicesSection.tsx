import { useState } from 'react'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
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
        <section className="ds-card">
            <div className="ds-section-header">
                <div>
                    <h2 className="text-sm font-semibold text-white">Servicios</h2>
                    <p className="text-xs text-slate-400">{services.length} servicios</p>
                </div>
                <button onClick={onAddService} className="ds-btn ds-btn-ghost text-xs px-3 py-1">
                    + Añadir
                </button>
            </div>

            {services.length ? (
                <div className="overflow-x-auto">
                    <table className="ds-table min-w-full">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Horario</th>
                                <th>Formato</th>
                                <th className="is-num text-right">Pax</th>
                                <th className="is-action">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr key={service.id}>
                                    <td className="text-slate-200">
                                        <span className="uppercase tracking-wide text-[10px] text-nano-blue-300">{service.serviceType}</span>
                                    </td>
                                    <td>
                                        {formatDate(service.startsAt)}{' '}
                                        {service.endsAt ? `→ ${formatDate(service.endsAt)}` : ''}
                                    </td>
                                    <td>{service.format}</td>
                                    <td className="is-num">{service.pax}</td>
                                    <td className="is-action">
                                        <button
                                            className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                                            onClick={() => setToDelete(service.id)}
                                        >
                                            Borrar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-6">
                    <EmptyState
                        title="Sin servicios"
                        description="Comienza añadiendo tu primer servicio."
                        action={
                            <button
                                type="button"
                                onClick={onAddService}
                                className="text-sm font-semibold text-nano-blue-400 hover:text-nano-blue-300 underline"
                            >
                                Añadir servicio
                            </button>
                        }
                    />
                </div>
            )}

            {services.length > 0 && (
                <div className="mt-4 space-y-4">
                    {services.map((service) => (
                        <ServiceMenuCard
                            key={service.id}
                            serviceId={service.id}
                            orgId={service.orgId}
                            format={service.format}
                            pax={service.pax}
                            templates={menuTemplates}
                        />
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar servicio"
                description="Esta acción borrará el servicio del evento."
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
