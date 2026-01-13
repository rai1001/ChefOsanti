import { useState } from 'react'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import type { BookingWithDetails } from '../data/events'

interface EventBookingsSectionProps {
    bookings: BookingWithDetails[]
    onDeleteBooking: (bookingId: string) => void
    onAddBooking: () => void
}

function formatDate(value?: string | null) {
    if (!value) return ''
    const d = new Date(value)
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : value
}

export function EventBookingsSection({ bookings, onDeleteBooking, onAddBooking }: EventBookingsSectionProps) {
    const [toDelete, setToDelete] = useState<string | null>(null)

    return (
        <section className="ds-card">
            <div className="ds-section-header">
                <div>
                    <h2 className="text-sm font-semibold text-white">Reservas de salón</h2>
                    <p className="text-xs text-slate-400">{bookings.length} reservas</p>
                </div>
                <button
                    onClick={onAddBooking}
                    className="ds-btn ds-btn-ghost text-xs px-3 py-1"
                >
                    + Añadir
                </button>
            </div>

            {bookings.length ? (
                <div className="overflow-x-auto">
                    <table className="ds-table min-w-full">
                        <thead>
                            <tr>
                                <th>Sala</th>
                                <th>Inicio</th>
                                <th>Fin</th>
                                <th>Grupo</th>
                                <th>Nota</th>
                                <th className="is-action">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                        {bookings.map((b) => (
                                <tr key={b.id}>
                                    <td>
                                        <span className="font-semibold text-slate-200">
                                            {b.spaceName ?? b.spaceId}
                                        </span>
                                    </td>
                                    <td>{formatDate(b.startsAt)}</td>
                                    <td>{formatDate(b.endsAt)}</td>
                                    <td>{b.groupLabel || '—'}</td>
                                    <td className="truncate max-w-[220px]">
                                        <span title={b.note ?? ''}>{b.note || '—'}</span>
                                    </td>
                                    <td className="is-action">
                                        <button
                                            className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                                            onClick={() => setToDelete(b.id)}
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
                        title="Sin reservas"
                        description="Añade reservas desde el botón superior"
                        action={
                            <button
                                type="button"
                                onClick={onAddBooking}
                                className="text-sm font-semibold text-nano-blue-400 hover:text-nano-blue-300 underline"
                            >
                                Añadir reserva
                            </button>
                        }
                    />
                </div>
            )}

            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar reserva"
                description="Esta acción borrará la reserva del salón."
                confirmLabel="Eliminar"
                onConfirm={() => {
                    if (toDelete) onDeleteBooking(toDelete)
                    setToDelete(null)
                }}
                onCancel={() => setToDelete(null)}
            />
        </section>
    )
}
