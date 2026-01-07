import { useEffect } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useCreateEvent, useHotels } from '../data/events'

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

export function NewEventPage() {
  const { session, loading, error } = useSupabaseSession()
  const hotels = useHotels()
  const createEvent = useCreateEvent()
  const navigate = useNavigate()

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

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando sesion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para crear eventos.</p>
      </div>
    )

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Eventos</p>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo evento</h1>
        <p className="text-sm text-slate-600">Crea el contenedor y luego asigna las reservas de salon.</p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Hotel</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              {...register('hotelId')}
            >
              <option value="">Selecciona hotel</option>
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {errors.hotelId && <p className="text-xs text-red-600">{errors.hotelId.message}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Titulo</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Convencion interna"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Cliente</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Nombre cliente"
              {...register('clientName')}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800">Estado</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                {...register('status')}
              >
                <option value="draft">Borrador</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_production">En produccion</option>
                <option value="closed">Cerrado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800">Inicio (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                {...register('startsAt')}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800">Fin (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                {...register('endsAt')}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Notas</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              rows={3}
              placeholder="Detalles logisticos"
              {...register('notes')}
            />
          </label>

          {createEvent.isError && (
            <p className="text-sm text-red-600">
              {(createEvent.error as Error).message || 'Error al crear el evento.'}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Creando...' : 'Crear evento'}
          </button>
        </form>
      </div>
    </div>
  )
}
