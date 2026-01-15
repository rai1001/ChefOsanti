import { useEffect, useMemo, useState } from 'react'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Circle, Clock, Search } from 'lucide-react'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateEvent, useHotels } from '../data/events'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { Card } from '@/modules/shared/ui/Card'
import { Button } from '@/modules/shared/ui/Button'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { Spinner } from '@/modules/shared/ui/Spinner'

const schema = z.object({
  hotelId: z.string().min(1, 'Hotel requerido'),
  title: z.string().min(1, 'Titulo requerido'),
  clientName: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  eventType: z.enum(['private', 'corporate', 'wedding']).optional(),
  location: z.string().optional(),
  guestCount: z.coerce.number().min(1, 'Invitados requeridos'),
  notes: z.string().optional(),
})

type Form = z.infer<typeof schema>

type Step = {
  label: string
  status: 'done' | 'current' | 'upcoming'
}

function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-6 rounded-2xl border border-border/20 bg-surface/60 px-6 py-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              step.status === 'done'
                ? 'border-accent bg-accent/15 text-accent'
                : step.status === 'current'
                  ? 'border-accent bg-accent text-surface'
                  : 'border-border/40 bg-surface2/80 text-muted-foreground'
            }`}
          >
            {step.status === 'done' ? <CheckCircle size={18} /> : <Circle size={18} />}
          </div>
          <div className="flex flex-col">
            <p
              className={`text-sm font-semibold ${
                step.status === 'current' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {idx + 1}. {step.label}
            </p>
            <div className="h-[2px] w-20 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: step.status === 'done' ? '100%' : step.status === 'current' ? '65%' : '20%' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NewEventPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels()
  const createEvent = useCreateEvent()
  const navigate = useNavigate()
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createEvent.error)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema) as Resolver<Form>,
    defaultValues: {
      title: '',
      eventType: 'corporate',
      guestCount: 150,
    },
  })

  const currentHotel = watch('hotelId')
  const guestCount = Number(watch('guestCount') || 0)

  useEffect(() => {
    if (!currentHotel && hotels.data?.length) {
      setValue('hotelId', hotels.data[0].id)
    }
  }, [hotels.data, setValue, currentHotel])

  const onSubmit: SubmitHandler<Form> = async (values) => {
    const selectedHotel = hotels.data?.find((h) => h.id === values.hotelId)
    const orgId = selectedHotel?.orgId ?? activeOrgId ?? ''

    const startsAt =
      values.startDate && values.startTime ? new Date(`${values.startDate}T${values.startTime}`).toISOString() : null

    const finalNotes = [values.notes, values.eventType ? `Event type: ${values.eventType}` : null]
      .filter(Boolean)
      .join('\n')

    const created = await createEvent.mutateAsync({
      hotelId: values.hotelId,
      orgId,
      title: values.title,
      clientName: values.clientName,
      status: 'confirmed',
      startsAt,
      endsAt: null,
      notes: finalNotes || null,
    })
    navigate(`/events/${created.id}`)
  }

  const costEstimates = useMemo(() => {
    const eventFee = 5000
    const menu = Math.max(0, guestCount) * 80
    const staffing = Math.max(1, Math.ceil((guestCount || 0) / 25)) * 150
    const total = eventFee + menu + staffing
    return { eventFee, menu, staffing, total }
  }, [guestCount])

  const hotelOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return hotels.data ?? []
    return (hotels.data ?? []).filter((h) => h.name.toLowerCase().includes(term))
  }, [hotels.data, searchTerm])

  if (loading) return <div className="p-6"><Spinner /></div>
  if (!session || error) {
    return (
      <EmptyState
        title="Inicia sesion"
        description={sessionError || 'Necesitas sesion activa para crear eventos.'}
      />
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Event Creation Wizard</p>
        <h1 className="text-4xl font-semibold text-foreground">Basic Info</h1>
        <p className="text-sm text-muted-foreground">Define los datos base y continua con menu y staff.</p>
      </header>

      <Stepper
        steps={[
          { label: 'Basic Info', status: 'current' },
          { label: 'Menu Selection', status: 'upcoming' },
          { label: 'Staffing', status: 'upcoming' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-6 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
          <div className="mb-4">
            <p className="text-lg font-semibold text-foreground">Basic Info</p>
            <p className="text-sm text-muted-foreground">Campos obligatorios para crear el evento.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Event Name</label>
              <input
                className="ds-input"
                placeholder="Ej. Gourmet Gala 2024"
                {...register('title')}
              />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Event Date</label>
                <div className="flex items-center gap-2">
                  <input type="date" className="ds-input flex-1" {...register('startDate')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Time</label>
                <div className="flex items-center gap-2">
                  <input type="time" className="ds-input flex-1" {...register('startTime')} />
                  <Clock size={16} className="text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Client</label>
              <input
                className="ds-input"
                placeholder="Nombre del cliente"
                {...register('clientName')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Event Type</label>
              <div className="flex flex-wrap gap-3 rounded-2xl border border-border/30 bg-surface2/70 p-3">
                {[
                  { value: 'private', label: 'Private Dining' },
                  { value: 'corporate', label: 'Corporate' },
                  { value: 'wedding', label: 'Wedding' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="radio" value={opt.value} {...register('eventType')} className="text-accent" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Location</label>
              <input
                className="ds-input"
                placeholder="The Grand Hall, City Center"
                {...register('location')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Hotel</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Search size={14} />
                  </span>
                  <input
                    className="ds-input pl-9"
                    placeholder="Filtrar hoteles"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select className="ds-input mt-2" {...register('hotelId')}>
                  <option value="">Selecciona hotel</option>
                  {hotelOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {errors.hotelId && <p className="text-xs text-danger">{errors.hotelId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Guest Count</label>
                <input type="number" className="ds-input" {...register('guestCount')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Notes</label>
              <textarea
                className="ds-input min-h-[80px]"
                placeholder="Detalles importantes, alergias, timings..."
                {...register('notes')}
              />
            </div>

            {createError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {createError}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creando...' : 'Next: Menu Selection'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit rounded-3xl border border-border/20 bg-surface/70 p-5 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Summary</p>
            <p className="text-sm text-muted-foreground">Real-time cost calculator</p>
          </div>

          <div className="mt-4 space-y-3 text-sm text-foreground">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <span>Event Fee:</span>
              <span className="font-semibold">${costEstimates.eventFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <span>Menu (Est.):</span>
              <span className="font-semibold">${costEstimates.menu.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
              <span>Staffing (Est.):</span>
              <span className="font-semibold">${costEstimates.staffing.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Estimated Cost:</p>
            <p className="text-3xl font-bold text-foreground">${costEstimates.total.toLocaleString()}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
