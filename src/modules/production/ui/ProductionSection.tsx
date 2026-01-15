import { useState, useEffect } from 'react'
import type { EventService } from '@/modules/events/domain/event'
import ProductionPlanView from './ProductionPlanView'

interface ProductionSectionProps {
    services: EventService[]
    orgId: string
    hotelId: string
    eventId: string
}

// Helper to format service label
function getServiceLabel(service: EventService) {
    const time = new Date(service.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${service.serviceType.toUpperCase()} (${time}) - ${service.pax} pax`
}

export function ProductionSection({ services, orgId, hotelId, eventId }: ProductionSectionProps) {
    const [selectedServiceId, setSelectedServiceId] = useState<string>('')

    // Select first service by default
    useEffect(() => {
        if (services.length > 0 && !selectedServiceId) {
            setSelectedServiceId(services[0].id)
        }
    }, [services, selectedServiceId])

    if (services.length === 0) {
        return (
            <section className="glass-panel p-6 text-center">
                <p className="text-slate-400">No hay servicios configurados en este evento. Añade servicios para gestionar la producción.</p>
            </section>
        )
    }

    return (
        <section className="glass-panel text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white/90">
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">Producción</h2>
                    <p className="text-xs text-slate-500">Gestión de tareas y mise en place por servicio</p>
                </div>

                {/* Service Selector */}
                <div className="relative">
                    <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="h-8 rounded-md border-slate-300 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500"
                    >
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {getServiceLabel(service)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 min-h-[400px]">
                {selectedServiceId ? (
                    <ProductionPlanView
                        key={selectedServiceId} // Force remount on change
                        serviceId={selectedServiceId}
                        orgId={orgId}
                        hotelId={hotelId}
                        eventId={eventId}
                    />
                ) : (
                    <p className="text-sm text-slate-400">Selecciona un servicio</p>
                )}
            </div>
        </section>
    )
}
