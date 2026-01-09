import { useEffect } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useCreateEvent, useHotels } from '../data/events'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const schema = z.object({
  hotelId: z.string().min(1, 'Hotel obligatorio'),
  title: z.string().min(1, 'Titulo obligatorio'),
  clientName: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'in_production', 'closed', 'cancelled']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  notes: z.string().optional(),
})

type Form = z.infer<typeof schema>

function toISOStringOrNull(value?: string) {
  if (!value) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

export default function NewEventPage() {
  const { session, loading, error } = useSupabaseSession()
  const hotels = useHotels()
  const createEvent = useCreateEvent()
  const navigate = useNavigate()
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createEvent.error)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'draft',
    },
  })

  const currentHotel = watch('hotelId')

  useEffect(() => {
    if (!currentHotel && hotels.data?.length) {
      setValue('hotelId', hotels.data[0].id)
    }
  }, [hotels.data, setValue, currentHotel])

  const onSubmit = async (values: Form) => {
    const selectedHotel = hotels.data?.find((h) => h.id === values.hotelId)
    const orgId = selectedHotel?.orgId ?? ''
    const created = await createEvent.mutateAsync({
      ...values,
      hotelId: values.hotelId,
      orgId,
      startsAt: toISOStringOrNull(values.startsAt),
      endsAt: toISOStringOrNull(values.endsAt),
    })
    navigate(`/events/${created.id}`)
  }

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error) {
    return (
      <div className="rounded-xl glass-panel p-4 border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Inicia sesión para crear eventos.</p>
        <p className="text-xs text-red-400 mt-1">{sessionError}</p>
      </div>
    )
  }



  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Eventos</p>
        <h1 className="text-2xl font-bold text-white mt-1">Nuevo evento</h1>
        <p className="text-sm text-slate-400">Crea el contenedor y luego asigna las reservas de salón.</p>
      </header>

      <div className="rounded-2xl glass-panel p-6 shadow-xl border border-white/10">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hotel</span>
            <select
              className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50"
              {...register('hotelId')}
            >
              <option value="">Selecciona hotel</option>
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {errors.hotelId && <p className="text-xs text-red-400">{errors.hotelId.message}</p>}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Título</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 placeholder:text-slate-600"
              placeholder="Ej. Convención Interna 2024"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 placeholder:text-slate-600"
              placeholder="Nombre del cliente o empresa"
              {...register('clientName')}
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50"
                {...register('status')}
              >
                <option value="draft">Borrador</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_production">En producción</option>
                <option value="closed">Cerrado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inicio (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 [color-scheme:dark]"
                {...register('startsAt')}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fin (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 [color-scheme:dark]"
                {...register('endsAt')}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notas</span>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 placeholder:text-slate-600"
              rows={3}
              placeholder="Detalles logísticos importantes..."
              {...register('notes')}
            />
          </label>

          {createError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-bold text-red-400">Error</p>
              <p className="text-xs text-red-300">{createError}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando evento...' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
