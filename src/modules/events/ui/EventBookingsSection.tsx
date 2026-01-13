import { useState } from 'react'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'
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
        <section className="glass-panel">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Reservas de sal¢n</h2>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{bookings.length} reservas</span>
                    <button onClick={onAddBooking} className="text-xs font-medium text-nano-blue-300 hover:text-white">
                        + A¤adir
                    </button>
                </div>
            </div>
            <div className="divide-y divide-white/5">
                {bookings.length ? (
                    bookings.map((b) => (
                        <div
                            key={b.id}
                            className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-white/5 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-200">
                                    {b.spaceName ?? b.spaceId} - {formatDate(b.startsAt)} {'->'} {formatDate(b.endsAt)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {b.groupLabel ? `${b.groupLabel} - ` : ''}
                                    {b.note ?? ''}
                                </p>
                            </div>
                            <button
                                className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
                                onClick={() => setToDelete(b.id)}
                            >
                                Borrar
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="px-4 py-6 text-sm font-light italic text-slate-400">Sin reservas.</p>
                )}
            </div>
            <ConfirmDialog
                open={!!toDelete}
                title="Eliminar reserva"
                description="Esta acci¢n borrar  la reserva del sal¢n."
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
