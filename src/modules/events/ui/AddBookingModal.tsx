import { useMemo } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { detectOverlaps } from '../domain/event'
import type { BookingWithDetails } from '../data/events'
import type { Space } from '../domain/event'

const bookingSchema = z
  .object({
    spaceId: z.string().min(1, 'Sala obligatoria'),
    startsAt: z.string().min(1, 'Inicio obligatorio'),
    endsAt: z.string().min(1, 'Fin obligatorio'),
    groupLabel: z.string().optional(),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startsAt).getTime()
      const end = new Date(data.endsAt).getTime()
      return Number.isFinite(start) && Number.isFinite(end) && end > start
    },
    { message: 'Fin debe ser posterior al inicio', path: ['endsAt'] },
  )

export type BookingForm = z.infer<typeof bookingSchema>

interface AddBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BookingForm) => Promise<void>
  spaces: Space[]
  existingBookings: BookingWithDetails[]
}

export function AddBookingModal({ isOpen, onClose, onSubmit, spaces, existingBookings }: AddBookingModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startsAt: '',
      endsAt: '',
    },
  })

  const selectedSpaceId = watch('spaceId')
  const startsAt = watch('startsAt')
  const endsAt = watch('endsAt')

  const overlapWarning = useMemo(() => {
    const list = existingBookings.filter((b) => b.spaceId === selectedSpaceId)
    if (!selectedSpaceId || !startsAt || !endsAt) return false
    return detectOverlaps(list, { startsAt, endsAt })
  }, [existingBookings, selectedSpaceId, startsAt, endsAt])

  const handleFormSubmit = async (data: BookingForm) => {
    await onSubmit(data)
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Añadir reserva de salón</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)}>
          {Object.keys(errors).length > 0 && (
            <div className="ds-banner error">
              Revisa los errores antes de guardar la reserva.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Salón</span>
              <select className="ds-input" {...register('spaceId')}>
                <option value="">Selecciona salón</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.spaceId && <p className="text-xs text-red-400">{errors.spaceId.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Inicio</span>
              <input type="datetime-local" className="ds-input" {...register('startsAt')} />
              {errors.startsAt && <p className="text-xs text-red-400">{errors.startsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Fin</span>
              <input type="datetime-local" className="ds-input" {...register('endsAt')} />
              {errors.endsAt && <p className="text-xs text-red-400">{errors.endsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Group label (opcional)</span>
              <input
                className="ds-input"
                placeholder="A+B"
                {...register('groupLabel')}
              />
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-medium text-slate-300">Nota</span>
              <textarea className="ds-input min-h-[96px]" rows={2} {...register('note')} />
            </label>
          </div>

          {overlapWarning && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
              Aviso: hay solape con otra reserva de este salón.
            </p>
          )}

          <div className="sticky bottom-0 z-10 mt-4 border-t border-white/10 bg-nano-navy-800/90 py-4 backdrop-blur-sm">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary disabled:opacity-60">
                {isSubmitting ? 'Guardando...' : 'Añadir reserva'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
