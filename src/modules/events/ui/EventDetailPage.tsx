import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useMenuItemAliases, useUpsertAlias } from '@/modules/purchasing/data/aliases'
import { useEventNeeds, useCreateEventDraftOrders } from '@/modules/purchasing/data/eventOrders'
import { useSupplierItemsByOrg } from '@/modules/purchasing/data/suppliers'
import {
  applyRoundingToLines,
  groupMappedNeeds,
  mapNeedsToSupplierItems,
} from '@/modules/purchasing/domain/eventDraftOrder'
import { detectOverlaps } from '../domain/event'
import { parseOcrText, type OcrDraft } from '../domain/ocrParser'
import { computeServiceNeedsWithOverrides } from '../domain/overrides'
import {
  useCreateBooking,
  useCreateEventService,
  useDeleteBooking,
  useDeleteEventService,
  useEvent,
  useEventServices,
  useSpaces,
} from '../data/events'
import {
  useAddServiceItem,
  useAddServiceNote,
  useDeleteAddedItem,
  useExcludeTemplateItem,
  useReplaceTemplateItem,
  useRemoveReplacement,
  useServiceOverrides,
} from '../data/overrides'
import { useApplyOcrDraft as useApplyOcrDraftHook, useEventAttachments, useOcrEnqueue, useOcrRun, useServiceMenuContent, useUploadEventAttachment } from '../data/ocr'
import { useApplyTemplateToService, useMenuTemplates, useServiceMenu, type MenuTemplate } from '../data/menus'
import { DraftOrdersModal } from './DraftOrdersModal'
import { ErrorBoundary } from '@/modules/shared/ui/ErrorBoundary'

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

type BookingForm = z.infer<typeof bookingSchema>

const serviceSchema = z
  .object({
    serviceType: z.enum(['desayuno', 'coffee_break', 'comida', 'merienda', 'cena', 'coctel', 'otros']),
    format: z.enum(['sentado', 'de_pie']),
    startsAt: z.string().min(1, 'Inicio obligatorio'),
    endsAt: z.string().optional(),
    pax: z.number().nonnegative('Pax >= 0'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.endsAt) return true
      const start = new Date(data.startsAt).getTime()
      const end = new Date(data.endsAt).getTime()
      return Number.isFinite(start) && Number.isFinite(end) && end > start
    },
    { message: 'Fin debe ser posterior al inicio', path: ['endsAt'] },
  )

type ServiceForm = z.infer<typeof serviceSchema>

const overrideItemSchema = z
  .object({
    section: z.string().optional(),
    name: z.string().min(1, 'Nombre obligatorio'),
    unit: z.enum(['ud', 'kg']),
    qtyPerPaxSeated: z.number().nonnegative('>=0'),
    qtyPerPaxStanding: z.number().nonnegative('>=0'),
    roundingRule: z.enum(['ceil_unit', 'ceil_pack', 'none']),
    packSize: z.number().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) =>
      data.roundingRule !== 'ceil_pack' || (data.packSize !== undefined && data.packSize > 0),
    { message: 'pack_size obligatorio con ceil_pack', path: ['packSize'] },
  )
  .refine((data) => data.qtyPerPaxSeated > 0 || data.qtyPerPaxStanding > 0, {
    message: 'Define ratio para sentado o de_pie',
    path: ['qtyPerPaxSeated'],
  })

type OverrideItemForm = z.infer<typeof overrideItemSchema>

function normalizeDraft(raw: any, fallbackText: string): OcrDraft {
  if (!raw || !Array.isArray(raw.detectedServices)) {
    return parseOcrText(fallbackText || '')
  }
  return {
    rawText: raw.rawText ?? fallbackText ?? '',
    warnings: raw.warnings ?? [],
    detectedServices: raw.detectedServices.map((svc: any) => ({
      serviceType: svc.serviceType ?? svc.service_type ?? 'otros',
      startsAtGuess: svc.startsAtGuess ?? svc.starts_at_guess ?? null,
      paxGuess: svc.paxGuess ?? svc.pax_guess ?? null,
      formatGuess: svc.formatGuess ?? svc.format_guess ?? 'sentado',
      sections: (svc.sections ?? []).map((sec: any) => ({
        title: sec.title ?? 'Seccion',
        items: sec.items ?? [],
      })),
    })),
  }
}

function toISO(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toISOString() : ''
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : value
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const eventQuery = useEvent(id)
  const spaces = useSpaces(eventQuery.data?.event.hotelId)
  const createBooking = useCreateBooking(id, eventQuery.data?.event.orgId)
  const deleteBooking = useDeleteBooking(id)
  const services = useEventServices(id)
  const menuTemplates = useMenuTemplates(eventQuery.data?.event.orgId)
  const createService = useCreateEventService(id, eventQuery.data?.event.orgId)
  const deleteService = useDeleteEventService(id)
  const attachments = useEventAttachments(id)
  const uploadAttachment = useUploadEventAttachment(id, eventQuery.data?.event.orgId)
  const ocrEnqueue = useOcrEnqueue(id)
  const ocrRun = useOcrRun(id)
  const applyDraft = useApplyOcrDraftHook(id, eventQuery.data?.event.orgId)
  const [draftToReview, setDraftToReview] = useState<OcrDraft | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const eventNeeds = useEventNeeds(id)
  const aliases = useMenuItemAliases(eventQuery.data?.event.orgId)
  const supplierItemsByOrg = useSupplierItemsByOrg(eventQuery.data?.event.orgId)
  const createDraftOrders = useCreateEventDraftOrders(
    eventQuery.data?.event.orgId,
    eventQuery.data?.event.hotelId,
    eventQuery.data?.event.id,
  )
  const upsertAlias = useUpsertAlias(eventQuery.data?.event.orgId)
  const [draftOrdersOpen, setDraftOrdersOpen] = useState(false)
  const [draftSuccess, setDraftSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      startsAt: '',
      endsAt: '',
    },
  })

  const {
    register: registerService,
    handleSubmit: handleSubmitService,
    reset: resetService,
    formState: { errors: serviceErrors, isSubmitting: serviceSubmitting },
  } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      serviceType: 'cena',
      format: 'sentado',
      pax: 0,
    },
  })

  useEffect(() => {
    if (spaces.data?.length && !watch('spaceId')) {
      reset({ ...watch(), spaceId: spaces.data[0].id })
    }
  }, [spaces.data])

  const selectedSpaceId = watch('spaceId')
  const startsAt = watch('startsAt')
  const endsAt = watch('endsAt')

  const overlapWarning = useMemo(() => {
    const list = (eventQuery.data?.bookings ?? []).filter((b) => b.spaceId === selectedSpaceId)
    if (!selectedSpaceId || !startsAt || !endsAt) return false
    return detectOverlaps(list, { startsAt, endsAt })
  }, [eventQuery.data?.bookings, selectedSpaceId, startsAt, endsAt])

  const onSubmit = async (values: BookingForm) => {
    await createBooking.mutateAsync({
      spaceId: values.spaceId,
      startsAt: toISO(values.startsAt),
      endsAt: toISO(values.endsAt),
      groupLabel: values.groupLabel ?? null,
      note: values.note ?? null,
    })
    reset({ spaceId: values.spaceId, startsAt: '', endsAt: '', groupLabel: '', note: '' })
  }

  const onSubmitService = async (values: ServiceForm) => {
    await createService.mutateAsync({
      serviceType: values.serviceType,
      format: values.format,
      startsAt: toISO(values.startsAt),
      endsAt: values.endsAt ? toISO(values.endsAt) : null,
      pax: values.pax,
      notes: values.notes ?? null,
    })
    resetService({
      serviceType: values.serviceType,
      format: values.format,
      pax: 0,
      startsAt: '',
      endsAt: '',
      notes: '',
    })
  }

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando sesion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para ver eventos.</p>
      </div>
    )

  if (eventQuery.isLoading) return <p className="p-4 text-sm text-slate-600">Cargando evento...</p>
  if (eventQuery.isError)
    return (
      <p className="p-4 text-sm text-red-600">
        Error al cargar: {(eventQuery.error as Error).message}
      </p>
    )

  const event = eventQuery.data?.event
  const bookings = eventQuery.data?.bookings ?? []
  const eventServices = services.data ?? []

  return (
    <ErrorBoundary module="EventDetailPage">
      <div className="space-y-4 animate-fade-in">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Eventos</p>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{event?.title}</h1>
            <p className="text-sm text-slate-400">
              Estado: <span className="text-slate-200">{event?.status}</span> - Cliente: <span className="text-slate-200">{event?.clientName ?? 'N/D'}</span>
            </p>
            <p className="text-xs text-slate-500">
              {event?.startsAt ? `Inicio ${formatDate(event.startsAt)}` : ''}{' '}
              {event?.endsAt ? `Fin ${formatDate(event.endsAt)}` : ''}
            </p>
          </div>
        </header>

        <section className="glass-panel">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Reservas de salón</h2>
            <span className="text-xs text-slate-400">{bookings.length} reservas</span>
          </div>
          <div className="divide-y divide-white/5">
            {bookings.length ? (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between transition-colors hover:bg-white/5"
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
                    className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => deleteBooking.mutate(b.id)}
                  >
                    Borrar
                  </button>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400 font-light italic">Sin reservas.</p>
            )}
          </div>
        </section>

        <section className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Añadir reserva de salón</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Salón</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all"
                {...register('spaceId')}
              >
                <option value="" className="bg-nano-navy-900 text-slate-400">Selecciona salón</option>
                {spaces.data?.map((s) => (
                  <option key={s.id} value={s.id} className="bg-nano-navy-900">
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.spaceId && <p className="text-xs text-red-400">{errors.spaceId.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Inicio</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                {...register('startsAt')}
              />
              {errors.startsAt && <p className="text-xs text-red-400">{errors.startsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Fin</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                {...register('endsAt')}
              />
              {errors.endsAt && <p className="text-xs text-red-400">{errors.endsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Group label (opcional)</span>
              <input
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="A+B"
                {...register('groupLabel')}
              />
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-medium text-slate-300">Nota</span>
              <textarea
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                rows={2}
                {...register('note')}
              />
            </label>

            {overlapWarning && (
              <p className="md:col-span-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
                Aviso: hay solape con otra reserva de este salón.
              </p>
            )}

            {createBooking.isError && (
              <p className="md:col-span-2 text-sm text-red-400">
                {(createBooking.error as Error).message || 'Error al crear reserva.'}
              </p>
            )}

            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-nano-blue-600/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? 'Guardando...' : 'Añadir reserva'}
              </button>
            </div>
          </form>
        </section>

        <section className="glass-panel">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Adjuntos / OCR</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="flex w-full flex-col gap-1 text-sm bg-white/5 border border-white/10 border-dashed rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer group">
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">Subir PDF/imagen/texto</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-nano-blue-500/20 file:text-nano-blue-300 hover:file:bg-nano-blue-500/30"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file && eventQuery.data?.event.orgId) {
                    await uploadAttachment.mutateAsync(file)
                  }
                }}
              />
            </label>
            {attachments.isLoading && <p className="text-sm text-slate-400">Cargando adjuntos...</p>}
            {attachments.data?.map((att) => (
              <div
                key={att.id}
                className="flex flex-col gap-2 rounded border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">{att.originalName}</p>
                  <p className="text-xs text-slate-500">
                    {att.mimeType} {att.job ? ` - estado OCR: ${att.job.status}` : ' - sin OCR'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:border-white/30 transition-all"
                    onClick={async () => {
                      const { jobId } = await ocrEnqueue.mutateAsync(att.id)
                      await ocrRun.mutateAsync(jobId)
                      attachments.refetch()
                    }}
                  >
                    Procesar OCR
                  </button>
                  {att.job?.status === 'done' && (
                    <button
                      type="button"
                      className="rounded-md border border-nano-blue-500/30 bg-nano-blue-500/10 px-3 py-1 text-xs font-semibold text-nano-blue-300 hover:bg-nano-blue-500/20 hover:border-nano-blue-500/50 transition-all"
                      onClick={() => {
                        const draft = normalizeDraft(att.job?.draftJson, att.job?.extractedText ?? '')
                        setDraftToReview(draft)
                        setReviewOpen(true)
                      }}
                    >
                      Revisar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {attachments.data?.length === 0 && !attachments.isLoading && (
              <p className="text-sm text-slate-500 italic">Sin adjuntos subidos.</p>
            )}
          </div>
        </section>

        <section className="glass-panel">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Servicios</h2>
            <span className="text-xs text-slate-400">{eventServices.length} servicios</span>
          </div>
          <div className="divide-y divide-white/5">
            {eventServices.length ? (
              eventServices.map((s) => (
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
                      onClick={() => deleteService.mutate(s.id)}
                    >
                      Borrar
                    </button>
                  </div>
                  <ServiceMenuCard
                    serviceId={s.id}
                    orgId={s.orgId}
                    format={s.format}
                    pax={s.pax}
                    templates={menuTemplates.data ?? []}
                  />
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400 italic">Sin servicios.</p>
            )}
          </div>
        </section>

        <section className="glass-panel">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Pedidos borrador</h2>
              <p className="text-xs text-slate-400">
                Genera pedidos agrupados por proveedor desde las necesidades de este evento.
              </p>
            </div>
            {draftSuccess && <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{draftSuccess}</span>}
          </div>
          <div className="space-y-2 px-4 py-3">
            {eventNeeds.isLoading && <p className="text-sm text-slate-400">Calculando necesidades...</p>}
            {Boolean(eventNeeds.data?.missingServices.length) && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                Servicios sin plantilla aplicada: {eventNeeds.data?.missingServices.length}. No se incluyen en el pedido.
              </div>
            )}
            <p className="text-sm text-slate-300">
              Items calculados: {eventNeeds.data?.needs.length ?? 0}
            </p>
            <button
              type="button"
              className="mt-2 rounded-md bg-nano-blue-600/80 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                eventNeeds.isLoading ||
                !eventNeeds.data?.needs.length ||
                createDraftOrders.isPending ||
                aliases.isLoading ||
                supplierItemsByOrg.isLoading
              }
              onClick={() => setDraftOrdersOpen(true)}
            >
              Generar pedido borrador
            </button>
            {!eventNeeds.data?.needs.length && !eventNeeds.isLoading && (
              <p className="text-xs text-slate-500 italic mt-1">
                Aplica una plantilla con ratios para calcular necesidades antes de generar el pedido.
              </p>
            )}
          </div>
        </section>

        <section className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Añadir servicio</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmitService(onSubmitService)}>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Tipo de servicio</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all"
                {...registerService('serviceType')}
              >
                <option value="desayuno" className="bg-nano-navy-900">Desayuno</option>
                <option value="coffee_break" className="bg-nano-navy-900">Coffee break</option>
                <option value="comida" className="bg-nano-navy-900">Comida</option>
                <option value="merienda" className="bg-nano-navy-900">Merienda</option>
                <option value="cena" className="bg-nano-navy-900">Cena</option>
                <option value="coctel" className="bg-nano-navy-900">Cóctel</option>
                <option value="otros" className="bg-nano-navy-900">Otros</option>
              </select>
              {serviceErrors.serviceType && (
                <p className="text-xs text-red-400">{serviceErrors.serviceType.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Formato</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all"
                {...registerService('format')}
              >
                <option value="sentado" className="bg-nano-navy-900">Sentado</option>
                <option value="de_pie" className="bg-nano-navy-900">De pie</option>
              </select>
              {serviceErrors.format && <p className="text-xs text-red-400">{serviceErrors.format.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Inicio</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                {...registerService('startsAt')}
              />
              {serviceErrors.startsAt && <p className="text-xs text-red-400">{serviceErrors.startsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Fin (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                {...registerService('endsAt')}
              />
              {serviceErrors.endsAt && <p className="text-xs text-red-400">{serviceErrors.endsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-300">Pax</span>
              <input
                type="number"
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                {...registerService('pax', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                })}
              />
              {serviceErrors.pax && <p className="text-xs text-red-400">{serviceErrors.pax.message}</p>}
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-medium text-slate-300">Notas</span>
              <textarea
                className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                rows={2}
                {...registerService('notes')}
              />
            </label>

            {createService.isError && (
              <p className="md:col-span-2 text-sm text-red-400">
                {(createService.error as Error).message || 'Error al crear servicio.'}
              </p>
            )}

            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={serviceSubmitting}
                className="w-full rounded-lg bg-nano-blue-600/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {serviceSubmitting ? 'Guardando...' : 'Añadir servicio'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {draftOrdersOpen && (
        <DraftOrdersModal
          needs={eventNeeds.data?.needs ?? []}
          missingServices={eventNeeds.data?.missingServices ?? []}
          aliases={aliases.data ?? []}
          supplierItems={supplierItemsByOrg.data ?? []}
          onClose={() => setDraftOrdersOpen(false)}
          onCreated={(ids) => {
            setDraftSuccess(`Pedidos creados: ${ids.length}`)
            setDraftOrdersOpen(false)
          }}
          onSaveAlias={async (aliasText, supplierItemId) => {
            await upsertAlias.mutateAsync({ aliasText, supplierItemId })
          }}
          createDraftOrders={createDraftOrders}
          loading={!eventNeeds.data || aliases.isLoading || supplierItemsByOrg.isLoading}
        />
      )}

      {reviewOpen && draftToReview && (
        <OcrReviewModal
          draft={draftToReview}
          onClose={() => {
            setReviewOpen(false)
            setDraftToReview(null)
          }}
          onApply={async (draft) => {
            await applyDraft.mutateAsync(draft)
            setReviewOpen(false)
            setDraftToReview(null)
          }}
        />
      )}
    </ErrorBoundary>
  )
}



function ServiceMenuCard({
  serviceId,
  orgId,
  format,
  pax,
  templates,
}: {
  serviceId: string
  orgId: string
  format: 'sentado' | 'de_pie'
  pax: number
  templates: MenuTemplate[]
}) {
  const serviceMenu = useServiceMenu(serviceId)
  const content = useServiceMenuContent(serviceId)
  const overrides = useServiceOverrides(serviceId)
  const applyTemplate = useApplyTemplateToService(serviceId)
  const excludeItem = useExcludeTemplateItem(serviceId)
  const addItem = useAddServiceItem(serviceId)
  const deleteAdded = useDeleteAddedItem(serviceId)
  const replaceItem = useReplaceTemplateItem(serviceId)
  const removeReplacement = useRemoveReplacement(serviceId)
  const addNote = useAddServiceNote(serviceId)
  const [noteText, setNoteText] = useState('')
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: addSubmitting },
  } = useForm<OverrideItemForm>({
    resolver: zodResolver(overrideItemSchema),
    defaultValues: {
      unit: 'ud',
      roundingRule: 'ceil_unit',
      qtyPerPaxSeated: 0,
      qtyPerPaxStanding: 0,
    },
  })

  const {
    register: registerReplace,
    handleSubmit: handleSubmitReplace,
    reset: resetReplace,
    formState: { errors: replaceErrors, isSubmitting: replaceSubmitting },
  } = useForm<OverrideItemForm>({
    resolver: zodResolver(overrideItemSchema),
    defaultValues: {
      unit: 'ud',
      roundingRule: 'ceil_unit',
      qtyPerPaxSeated: 0,
      qtyPerPaxStanding: 0,
    },
  })

  const templateItems = serviceMenu.data?.items ?? []

  const excludedSet = useMemo(
    () => new Set(overrides.data?.excluded.map((e) => e.templateItemId)),
    [overrides.data],
  )
  const replacementsMap = useMemo(() => {
    const map = new Map<string, AddedItem>()
    overrides.data?.replaced.forEach((r) => map.set(r.templateItemId, r.replacement))
    return map
  }, [overrides.data])
  const addedItems = overrides.data?.added ?? []

  const overridesForCalc: ServiceOverrides = useMemo(
    () => ({
      excluded: overrides.data?.excluded ?? [],
      added: addedItems.map(({ id, ...rest }) => rest),
      replaced:
        overrides.data?.replaced.map(({ templateItemId, replacement }) => ({
          templateItemId,
          replacement,
        })) ?? [],
    }),
    [overrides.data, addedItems],
  )

  const needs = useMemo(
    () =>
      computeServiceNeedsWithOverrides(pax, format, templateItems, overridesForCalc).filter(
        (n) => n.qtyRounded > 0,
      ),
    [pax, format, templateItems, overridesForCalc],
  )

  const toggleExclude = (templateItemId: string, exclude: boolean) => {
    if (!orgId) return
    excludeItem.mutate({ orgId, templateItemId, exclude })
  }

  const onAddSubmit = async (values: OverrideItemForm) => {
    if (!orgId) return
    await addItem.mutateAsync({ orgId, ...values })
    resetAdd({
      unit: 'ud',
      roundingRule: 'ceil_unit',
      qtyPerPaxSeated: 0,
      qtyPerPaxStanding: 0,
      section: values.section,
    })
  }

  const openReplace = (item: any) => {
    setReplaceTarget(item.id)
    resetReplace({
      section: item.section ?? undefined,
      name: item.name,
      unit: item.unit,
      qtyPerPaxSeated: item.qtyPerPaxSeated,
      qtyPerPaxStanding: item.qtyPerPaxStanding,
      roundingRule: item.roundingRule,
      packSize: item.packSize ?? undefined,
      notes: '',
    })
  }

  const onReplaceSubmit = async (values: OverrideItemForm) => {
    if (!orgId || !replaceTarget) return
    await replaceItem.mutateAsync({ orgId, templateItemId: replaceTarget, ...values })
    setReplaceTarget(null)
  }

  const onAddNote = async () => {
    if (!orgId || !noteText.trim()) return
    await addNote.mutateAsync({ orgId, note: noteText.trim() })
    setNoteText('')
  }

  return (
    <div className="space-y-4 rounded border border-white/10 bg-white/5 p-3">
      {serviceMenu.data?.template ? (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">
            Menú aplicado: {serviceMenu.data.template.name}
          </p>
          <select
            aria-label="Plantilla"
            className="rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
            onChange={(e) => {
              if (e.target.value) applyTemplate.mutate({ templateId: e.target.value, orgId })
            }}
            defaultValue={serviceMenu.data.template.id}
          >
            <option value="">Cambiar plantilla</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm text-slate-300">Sin menú. Aplica plantilla:</p>
          <select
            aria-label="Plantilla"
            className="rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyTemplate.mutate({ templateId: e.target.value, orgId })
            }}
          >
            <option value="">Selecciona</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {content.data && content.data.length > 0 && (
        <div className="mb-3 rounded border border-white/10 bg-white/5 p-3">
          <h4 className="text-sm font-semibold text-white">Menú OCR</h4>
          <div className="mt-2 space-y-2">
            {content.data.map((sec) => (
              <div key={sec.id} className="rounded border border-white/10 bg-white/5 p-2">
                <p className="text-xs font-semibold text-slate-300">{sec.title}</p>
                <ul className="ml-4 list-disc text-xs text-slate-400">
                  {sec.items.map((it) => (
                    <li key={it.id}>{it.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {serviceMenu.isLoading || overrides.isLoading ? (
        <p className="text-sm text-slate-400">Cargando menú y overrides...</p>
      ) : (
        <>
          {serviceMenu.data?.template ? (
            <div className="space-y-2 rounded border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Modificaciones</h3>
                {excludeItem.isError && (
                  <span className="text-xs text-red-400">Error overrides</span>
                )}
              </div>
              {templateItems.length ? (
                templateItems.map((item) => {
                  const isExcluded = excludedSet.has(item.id)
                  const replacement = replacementsMap.get(item.id)
                  return (
                    <div key={item.id} className="border-t border-white/10 pt-2 first:border-t-0">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p
                            className={`text-sm font-semibold ${isExcluded ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                          >
                            {item.section ? `${item.section} - ` : ''}
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Unidad {item.unit} - sentado {item.qtyPerPaxSeated} - de pie{' '}
                            {item.qtyPerPaxStanding} - {item.roundingRule}{' '}
                            {item.packSize ? `(pack ${item.packSize})` : ''}
                          </p>
                          {replacement && (
                            <p className="text-xs font-semibold text-emerald-400">
                              Sustituido por: {replacement.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:border-white/20 transition-all"
                            onClick={() => toggleExclude(item.id, !isExcluded)}
                          >
                            {isExcluded ? 'Restaurar' : 'Quitar'}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-nano-blue-500/30 bg-nano-blue-500/10 px-2 py-1 text-xs font-semibold text-nano-blue-300 hover:bg-nano-blue-500/20 hover:border-nano-blue-500/50 transition-all"
                            onClick={() => openReplace(item)}
                          >
                            Sustituir
                          </button>
                          {replacement && (
                            <button
                              type="button"
                              className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all"
                              onClick={() => removeReplacement.mutate(item.id)}
                            >
                              Quitar sustitución
                            </button>
                          )}
                        </div>
                      </div>
                      {replaceTarget === item.id && (
                        <form
                          className="mt-2 grid gap-2 rounded border border-white/10 bg-white/5 p-2 md:grid-cols-3"
                          onSubmit={handleSubmitReplace(onReplaceSubmit)}
                        >
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Sección</span>
                            <input
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('section')}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Nombre</span>
                            <input
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('name')}
                            />
                            {replaceErrors.name && (
                              <p className="text-[11px] text-red-400">{replaceErrors.name.message}</p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Unidad</span>
                            <select
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('unit')}
                            >
                              <option value="ud">ud</option>
                              <option value="kg">kg</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Qty/pax sentado</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('qtyPerPaxSeated', {
                                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                              })}
                            />
                            {replaceErrors.qtyPerPaxSeated && (
                              <p className="text-[11px] text-red-400">
                                {replaceErrors.qtyPerPaxSeated.message}
                              </p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Qty/pax de pie</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('qtyPerPaxStanding', {
                                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                              })}
                            />
                            {replaceErrors.qtyPerPaxStanding && (
                              <p className="text-[11px] text-red-400">
                                {replaceErrors.qtyPerPaxStanding.message}
                              </p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Redondeo</span>
                            <select
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('roundingRule')}
                            >
                              <option value="none">none</option>
                              <option value="ceil_unit">ceil_unit</option>
                              <option value="ceil_pack">ceil_pack</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Pack size</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              {...registerReplace('packSize', {
                                setValueAs: (v) =>
                                  v === '' || Number.isNaN(Number(v)) ? undefined : Number(v),
                              })}
                            />
                            {replaceErrors.packSize && (
                              <p className="text-[11px] text-red-400">{replaceErrors.packSize.message}</p>
                            )}
                          </label>
                          <label className="md:col-span-3 space-y-1">
                            <span className="text-xs font-semibold text-slate-300">Notas</span>
                            <textarea
                              className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                              rows={2}
                              {...registerReplace('notes')}
                            />
                          </label>
                          <div className="md:col-span-3 flex gap-2">
                            <button
                              type="submit"
                              disabled={replaceSubmitting}
                              className="rounded-md bg-nano-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {replaceSubmitting ? 'Guardando...' : 'Guardar sustitución'}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/5"
                              onClick={() => setReplaceTarget(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-400">Sin items en la plantilla.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aplica una plantilla para gestionar overrides.</p>
          )}

          <div className="rounded border border-white/10 bg-white/5 p-3">
            <h4 className="text-sm font-semibold text-white">Items personalizados</h4>
            {addedItems.length ? (
              <div className="mt-2 space-y-2">
                {addedItems.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-1 rounded border border-white/10 bg-white/5 p-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{a.name}</p>
                      <p className="text-xs text-slate-400">
                        {a.section ? `${a.section} - ` : ''} {a.unit} - sentado {a.qtyPerPaxSeated} - de
                        pie {a.qtyPerPaxStanding} - {a.roundingRule}{' '}
                        {a.packSize ? `(pack ${a.packSize})` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-400 hover:text-red-300"
                      onClick={() => deleteAdded.mutate({ id: a.id })}
                    >
                      Borrar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Sin items añadidos manuales.</p>
            )}

            <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={handleSubmitAdd(onAddSubmit)}>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Sección</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('section')}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Nombre</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('name')}
                />
                {addErrors.name && <p className="text-[11px] text-red-400">{addErrors.name.message}</p>}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Unidad</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('unit')}
                >
                  <option value="ud">ud</option>
                  <option value="kg">kg</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Qty/pax sentado</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('qtyPerPaxSeated', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                  })}
                />
                {addErrors.qtyPerPaxSeated && (
                  <p className="text-[11px] text-red-400">{addErrors.qtyPerPaxSeated.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Qty/pax de pie</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('qtyPerPaxStanding', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                  })}
                />
                {addErrors.qtyPerPaxStanding && (
                  <p className="text-[11px] text-red-400">{addErrors.qtyPerPaxStanding.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Redondeo</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('roundingRule')}
                >
                  <option value="none">none</option>
                  <option value="ceil_unit">ceil_unit</option>
                  <option value="ceil_pack">ceil_pack</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Pack size</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  {...registerAdd('packSize', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
                {addErrors.packSize && (
                  <p className="text-[11px] text-red-400">{addErrors.packSize.message}</p>
                )}
              </label>
              <label className="md:col-span-3 space-y-1">
                <span className="text-xs font-semibold text-slate-300">Notas</span>
                <textarea
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                  rows={2}
                  {...registerAdd('notes')}
                />
              </label>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="rounded-md bg-nano-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-nano-blue-500/20"
                >
                  {addSubmitting ? 'Guardando...' : 'Añadir item'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-3">
            <h4 className="text-sm font-semibold text-white">Notas</h4>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <textarea
                  className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Alergias u observaciones"
                />
                <button
                  type="button"
                  className="self-start rounded-md bg-nano-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-nano-blue-500/20"
                  onClick={onAddNote}
                  disabled={addNote.isPending}
                >
                  Añadir nota
                </button>
              </div>
              {(overrides.data?.notes ?? []).map((n) => (
                <div key={n.id} className="rounded border border-white/10 bg-white/5 p-2 text-sm">
                  <p className="text-slate-200">{n.note}</p>
                  <p className="text-[11px] text-slate-500">{n.createdAt ?? ''}</p>
                </div>
              ))}
              {!overrides.data?.notes?.length && (
                <p className="text-sm text-slate-400">Sin notas registradas.</p>
              )}
            </div>
          </div>

          <div className="divide-y divide-white/10 rounded border border-white/10 bg-white/5">
            <div className="px-3 py-2">
              <h4 className="text-sm font-semibold text-white">Necesidades</h4>
              <p className="text-xs text-slate-400">
                Calculado con pax {pax} y formato {format}, aplicando overrides.
              </p>
            </div>
            {needs.length ? (
              needs.map((n, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm text-slate-300">
                  <div>
                    <p className="font-semibold text-slate-200">{n.name}</p>
                    <p className="text-xs text-slate-400">
                      Unidad {n.unit} - Cantidad: {n.qtyRounded.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-400">Sin necesidades calculadas.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function OcrReviewModal({
  draft,
  onClose,
  onApply,
}: {
  draft: OcrDraft
  onClose: () => void
  onApply: (draft: OcrDraft) => Promise<void>
}) {
  const [localDraft, setLocalDraft] = useState<OcrDraft>(draft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateService = (idx: number, updater: (svc: any) => any) => {
    setLocalDraft((prev) => {
      const copy = structuredClone(prev)
      copy.detectedServices[idx] = updater(copy.detectedServices[idx])
      return copy
    })
  }

  const updateSection = (svcIdx: number, secIdx: number, title: string, items: string[]) => {
    updateService(svcIdx, (svc: any) => {
      svc.sections[secIdx] = { title, items }
      return svc
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-4xl rounded-xl bg-nano-navy-900 border border-white/10 p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Revisar OCR</h3>
          <button className="text-sm text-slate-400 hover:text-white transition-colors" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="mt-2 max-h-[70vh] space-y-4 overflow-y-auto custom-scrollbar">
          {localDraft.detectedServices.map((svc, idx) => (
            <div key={idx} className="rounded border border-white/10 bg-white/5 p-3">
              <div className="grid gap-2 md:grid-cols-4">
                <label className="text-xs font-semibold text-slate-300">
                  Tipo
                  <select
                    className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                    value={svc.serviceType}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({ ...s, serviceType: e.target.value }))
                    }
                  >
                    <option value="desayuno">desayuno</option>
                    <option value="coffee_break">coffee_break</option>
                    <option value="comida">comida</option>
                    <option value="merienda">merienda</option>
                    <option value="cena">cena</option>
                    <option value="coctel">coctel</option>
                    <option value="otros">otros</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-300">
                  Hora
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                    value={svc.startsAtGuess ?? ''}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({ ...s, startsAtGuess: e.target.value }))
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-300">
                  Pax
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                    value={svc.paxGuess ?? 0}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({
                        ...s,
                        paxGuess: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-300">
                  Formato
                  <select
                    className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                    value={svc.formatGuess ?? 'sentado'}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({ ...s, formatGuess: e.target.value }))
                    }
                  >
                    <option value="sentado">sentado</option>
                    <option value="de_pie">de_pie</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 space-y-2">
                {svc.sections.map((sec, secIdx) => (
                  <div key={secIdx} className="rounded border border-white/10 bg-white/5 p-2">
                    <input
                      className="mb-1 w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                      value={sec.title}
                      onChange={(e) => updateSection(idx, secIdx, e.target.value, sec.items)}
                    />
                    <textarea
                      className="w-full rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none"
                      rows={3}
                      value={sec.items.join('\n')}
                      onChange={(e) =>
                        updateSection(idx, secIdx, sec.title, e.target.value.split('\n').filter(Boolean))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs text-slate-400">Texto bruto (solo lectura)</p>
            <pre className="max-h-32 overflow-y-auto rounded bg-black/50 p-2 text-xs text-slate-300 font-mono">
              {localDraft.rawText}
            </pre>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3">
          <button
            className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-nano-blue-500/20"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              setError(null)
              try {
                await onApply(localDraft)
                onClose()
              } catch (err: any) {
                setError(String(err?.message || err))
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Aplicando...' : 'Aplicar al evento'}
          </button>
        </div>
      </div>
    </div>
  )
}
