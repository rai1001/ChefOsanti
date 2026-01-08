import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useMenuItemAliases, useUpsertAlias } from '@/modules/purchasing/data/aliases'
import { useEventNeeds, useCreateEventDraftOrders } from '@/modules/purchasing/data/eventOrders'
import { useSupplierItemsByOrg } from '@/modules/purchasing/data/suppliers'
import type { MenuItemAlias } from '@/modules/purchasing/data/aliases'
import type { SupplierItem } from '@/modules/purchasing/domain/types'
import {
  applyRoundingToLines,
  groupMappedNeeds,
  mapNeedsToSupplierItems,
  type Need,
} from '@/modules/purchasing/domain/eventDraftOrder'
import { detectOverlaps } from '../domain/event'
import { parseOcrText, type OcrDraft } from '../domain/ocrParser'
import { computeServiceNeedsWithOverrides, type AddedItem, type ServiceOverrides } from '../domain/overrides'
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
import {
  useApplyOcrDraft as useApplyOcrDraftHook,
  useEventAttachments,
  useOcrEnqueue,
  useOcrRun,
  useServiceMenuContent,
  useUploadEventAttachment,
} from '../data/ocr'
import { useApplyTemplateToService, useMenuTemplates, useServiceMenu, type MenuTemplate } from '../data/menus'

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
    <>
      <div className="space-y-4">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Eventos</p>
            <h1 className="text-2xl font-semibold text-slate-900">{event?.title}</h1>
            <p className="text-sm text-slate-600">
              Estado: {event?.status} - Cliente: {event?.clientName ?? 'N/D'}
            </p>
            <p className="text-xs text-slate-500">
              {event?.startsAt ? `Inicio ${formatDate(event.startsAt)}` : ''}{' '}
              {event?.endsAt ? `Fin ${formatDate(event.endsAt)}` : ''}
            </p>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Reservas de salon</h2>
            <span className="text-xs text-slate-500">{bookings.length} reservas</span>
          </div>
          <div className="divide-y divide-slate-100">
            {bookings.length ? (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {b.spaceName ?? b.spaceId} - {formatDate(b.startsAt)} {'->'} {formatDate(b.endsAt)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {b.groupLabel ? `${b.groupLabel} - ` : ''}
                      {b.note ?? ''}
                    </p>
                  </div>
                  <button
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                    onClick={() => deleteBooking.mutate(b.id)}
                  >
                    Borrar
                  </button>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-600">Sin reservas.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Anadir reserva de salon</h3>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Salon</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('spaceId')}
              >
                <option value="">Selecciona salon</option>
                {spaces.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.spaceId && <p className="text-xs text-red-600">{errors.spaceId.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Inicio</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('startsAt')}
              />
              {errors.startsAt && <p className="text-xs text-red-600">{errors.startsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Fin</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('endsAt')}
              />
              {errors.endsAt && <p className="text-xs text-red-600">{errors.endsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Group label (opcional)</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="A+B"
                {...register('groupLabel')}
              />
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-sm font-medium text-slate-800">Nota</span>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                {...register('note')}
              />
            </label>

            {overlapWarning && (
              <p className="md:col-span-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Aviso: hay solape con otra reserva de este salon.
              </p>
            )}

            {createBooking.isError && (
              <p className="md:col-span-2 text-sm text-red-600">
                {(createBooking.error as Error).message || 'Error al crear reserva.'}
              </p>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? 'Guardando...' : 'Anadir reserva'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Adjuntos / OCR</h2>
          </div>
          <div className="space-y-3 p-4">
            <label className="flex w-full flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-700">Subir PDF/imagen/texto</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                className="text-sm"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file && eventQuery.data?.event.orgId) {
                    await uploadAttachment.mutateAsync(file)
                  }
                }}
              />
            </label>
            {attachments.isLoading && <p className="text-sm text-slate-600">Cargando adjuntos...</p>}
            {attachments.data?.map((att) => (
              <div
                key={att.id}
                className="flex flex-col gap-2 rounded border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{att.originalName}</p>
                  <p className="text-xs text-slate-600">
                    {att.mimeType} {att.job ? ` - estado OCR: ${att.job.status}` : ' - sin OCR'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400"
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
                      className="rounded-md border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:border-brand-300"
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
              <p className="text-sm text-slate-600">Sin adjuntos subidos.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Servicios</h2>
            <span className="text-xs text-slate-500">{eventServices.length} servicios</span>
          </div>
          <div className="divide-y divide-slate-100">
            {eventServices.length ? (
              eventServices.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {s.serviceType} - {formatDate(s.startsAt)} {s.endsAt ? `-> ${formatDate(s.endsAt)}` : ''} - {s.format} -{' '}
                        {s.pax} pax
                      </p>
                      <p className="text-xs text-slate-600">{s.notes ?? ''}</p>
                    </div>
                    <button
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
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
              <p className="px-4 py-6 text-sm text-slate-600">Sin servicios.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Pedidos borrador</h2>
              <p className="text-xs text-slate-600">
                Genera pedidos agrupados por proveedor desde las necesidades de este evento.
              </p>
            </div>
            {draftSuccess && <span className="text-xs text-emerald-700">{draftSuccess}</span>}
          </div>
          <div className="space-y-2 px-4 py-3">
            {eventNeeds.isLoading && <p className="text-sm text-slate-600">Calculando necesidades...</p>}
            {Boolean(eventNeeds.data?.missingServices.length) && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                Servicios sin plantilla aplicada: {eventNeeds.data?.missingServices.length}. No se incluyen en el pedido.
              </div>
            )}
            <p className="text-sm text-slate-700">
              Items calculados: {eventNeeds.data?.needs.length ?? 0}
            </p>
            <button
              type="button"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
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
              <p className="text-xs text-slate-600">
                Aplica una plantilla con ratios para calcular necesidades antes de generar el pedido.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Anadir servicio</h3>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmitService(onSubmitService)}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Tipo de servicio</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...registerService('serviceType')}
              >
                <option value="desayuno">Desayuno</option>
                <option value="coffee_break">Coffee break</option>
                <option value="comida">Comida</option>
                <option value="merienda">Merienda</option>
                <option value="cena">Cena</option>
                <option value="coctel">Coctel</option>
                <option value="otros">Otros</option>
              </select>
              {serviceErrors.serviceType && (
                <p className="text-xs text-red-600">{serviceErrors.serviceType.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Formato</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...registerService('format')}
              >
                <option value="sentado">Sentado</option>
                <option value="de_pie">De pie</option>
              </select>
              {serviceErrors.format && <p className="text-xs text-red-600">{serviceErrors.format.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Inicio</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...registerService('startsAt')}
              />
              {serviceErrors.startsAt && <p className="text-xs text-red-600">{serviceErrors.startsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Fin (opcional)</span>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...registerService('endsAt')}
              />
              {serviceErrors.endsAt && <p className="text-xs text-red-600">{serviceErrors.endsAt.message}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-800">Pax</span>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...registerService('pax', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                })}
              />
              {serviceErrors.pax && <p className="text-xs text-red-600">{serviceErrors.pax.message}</p>}
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-sm font-medium text-slate-800">Notas</span>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                {...registerService('notes')}
              />
            </label>

            {createService.isError && (
              <p className="md:col-span-2 text-sm text-red-600">
                {(createService.error as Error).message || 'Error al crear servicio.'}
              </p>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={serviceSubmitting}
                className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {serviceSubmitting ? 'Guardando...' : 'Anadir servicio'}
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
    </>
  )
}

function DraftOrdersModal({
  needs,
  missingServices,
  aliases,
  supplierItems,
  onClose,
  onCreated,
  onSaveAlias,
  createDraftOrders,
  loading,
}: {
  needs: Need[]
  missingServices: string[]
  aliases: MenuItemAlias[]
  supplierItems: SupplierItem[]
  onClose: () => void
  onCreated: (ids: string[]) => void
  onSaveAlias: (aliasText: string, supplierItemId: string) => Promise<void>
  createDraftOrders: ReturnType<typeof useCreateEventDraftOrders>
  loading: boolean
}) {
  const [pendingAliases, setPendingAliases] = useState<Record<string, string>>({})
  const [localError, setLocalError] = useState<string | null>(null)
  const savedAliasList = useMemo(
    () => aliases.map((a) => ({ normalized: a.normalized, supplierItemId: a.supplierItemId })),
    [aliases],
  )
  const { mapped, unknown } = useMemo(
    () => mapNeedsToSupplierItems(needs, savedAliasList, supplierItems),
    [needs, savedAliasList, supplierItems],
  )
  const preview = useMemo(() => applyRoundingToLines(groupMappedNeeds(mapped)), [mapped])

  const supplierItemOptions = supplierItems.map((si) => ({
    value: si.id,
    label: `${si.name} (${si.purchaseUnit})`,
  }))

  const handleCreate = async () => {
    if (unknown.length) {
      setLocalError('Mapea todos los items antes de generar.')
      return
    }
    setLocalError(null)
    const result = await createDraftOrders.mutateAsync({
      needs,
      aliases: savedAliasList,
      supplierItems,
    })
    if (result.unknown?.length) {
      setLocalError('Quedan items sin mapear.')
      return
    }
    onCreated(result.createdOrderIds ?? [])
  }

  const saveAlias = async (label: string) => {
    const supplierItemId = pendingAliases[label]
    if (!supplierItemId) return
    setLocalError(null)
    await onSaveAlias(label, supplierItemId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Generar pedidos borrador</h3>
          <button className="text-sm text-slate-600" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="mt-2 space-y-4">
          {loading && <p className="text-sm text-slate-600">Cargando datos...</p>}
          {missingServices.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              {missingServices.length} servicios sin plantilla se omitiran.
            </div>
          )}
          {unknown.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">Items sin mapping</p>
              <p className="text-xs text-amber-700">
                Asigna un articulo de proveedor para cada item antes de generar el pedido.
              </p>
              <div className="mt-2 space-y-2">
                {unknown.map((n, idx) => (
                  <div key={`${n.label}-${idx}`} className="flex flex-col gap-2 rounded border border-amber-100 bg-white p-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{n.label}</p>
                      <p className="text-xs text-slate-600">
                        Cantidad: {n.qty.toFixed(2)} {n.unit}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        aria-label={`Mapear ${n.label}`}
                        value={pendingAliases[n.label] ?? ''}
                        onChange={(e) =>
                          setPendingAliases((prev) => ({ ...prev, [n.label]: e.target.value }))
                        }
                      >
                        <option value="">Selecciona item proveedor</option>
                        {supplierItemOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="rounded-md border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:border-brand-300"
                        disabled={!pendingAliases[n.label] || createDraftOrders.isPending}
                        onClick={() => saveAlias(n.label)}
                      >
                        Guardar alias
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h4 className="text-sm font-semibold text-slate-800">Previsualizacion por proveedor</h4>
              <span className="text-xs text-slate-500">{preview.length} proveedores</span>
            </div>
            <div className="divide-y divide-slate-100">
              {preview.length ? (
                preview.map((group, idx) => (
                  <div key={idx} className="px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700">Proveedor: {group.supplierId}</p>
                    <div className="mt-1 space-y-1">
                      {group.lines.map((line, lineIdx) => (
                        <div key={lineIdx} className="flex items-center justify-between text-sm">
                          <span>{line.label}</span>
                          <span>
                            {line.qty.toFixed(2)} {line.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-600">Sin items para previsualizar.</p>
              )}
            </div>
          </div>

          {localError && <p className="text-sm text-red-600">{localError}</p>}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={createDraftOrders.isPending || unknown.length > 0 || loading || !needs.length}
            onClick={handleCreate}
          >
            {createDraftOrders.isPending ? 'Generando...' : 'Crear borradores'}
          </button>
        </div>
      </div>
    </div>
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
    <div className="space-y-4 rounded border border-slate-200 bg-slate-50 p-3">
      {serviceMenu.data?.template ? (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Menu aplicado: {serviceMenu.data.template.name}
          </p>
          <select
            aria-label="Plantilla"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
          <p className="text-sm text-slate-700">Sin menu. Aplica plantilla:</p>
          <select
            aria-label="Plantilla"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
        <div className="mb-3 rounded border border-slate-200 bg-white p-3">
          <h4 className="text-sm font-semibold text-slate-800">Menu OCR</h4>
          <div className="mt-2 space-y-2">
            {content.data.map((sec) => (
              <div key={sec.id} className="rounded border border-slate-100 p-2">
                <p className="text-xs font-semibold text-slate-700">{sec.title}</p>
                <ul className="ml-4 list-disc text-xs text-slate-600">
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
        <p className="text-sm text-slate-600">Cargando menu y overrides...</p>
      ) : (
        <>
          {serviceMenu.data?.template ? (
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Modificaciones</h3>
                {excludeItem.isError && (
                  <span className="text-xs text-red-600">Error overrides</span>
                )}
              </div>
              {templateItems.length ? (
                templateItems.map((item) => {
                  const isExcluded = excludedSet.has(item.id)
                  const replacement = replacementsMap.get(item.id)
                  return (
                    <div key={item.id} className="border-t border-slate-100 pt-2 first:border-t-0">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p
                            className={`text-sm font-semibold ${isExcluded ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                          >
                            {item.section ? `${item.section} - ` : ''}
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            Unidad {item.unit} - sentado {item.qtyPerPaxSeated} - de pie{' '}
                            {item.qtyPerPaxStanding} - {item.roundingRule}{' '}
                            {item.packSize ? `(pack ${item.packSize})` : ''}
                          </p>
                          {replacement && (
                            <p className="text-xs font-semibold text-emerald-700">
                              Sustituido por: {replacement.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                            onClick={() => toggleExclude(item.id, !isExcluded)}
                          >
                            {isExcluded ? 'Restaurar' : 'Quitar'}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-700 hover:border-brand-300"
                            onClick={() => openReplace(item)}
                          >
                            Sustituir
                          </button>
                          {replacement && (
                            <button
                              type="button"
                              className="rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300"
                              onClick={() => removeReplacement.mutate(item.id)}
                            >
                              Quitar sustitucion
                            </button>
                          )}
                        </div>
                      </div>
                      {replaceTarget === item.id && (
                        <form
                          className="mt-2 grid gap-2 rounded border border-slate-200 bg-slate-50 p-2 md:grid-cols-3"
                          onSubmit={handleSubmitReplace(onReplaceSubmit)}
                        >
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Seccion</span>
                            <input
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('section')}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Nombre</span>
                            <input
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('name')}
                            />
                            {replaceErrors.name && (
                              <p className="text-[11px] text-red-600">{replaceErrors.name.message}</p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Unidad</span>
                            <select
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('unit')}
                            >
                              <option value="ud">ud</option>
                              <option value="kg">kg</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Qty/pax sentado</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('qtyPerPaxSeated', {
                                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                              })}
                            />
                            {replaceErrors.qtyPerPaxSeated && (
                              <p className="text-[11px] text-red-600">
                                {replaceErrors.qtyPerPaxSeated.message}
                              </p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Qty/pax de pie</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('qtyPerPaxStanding', {
                                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                              })}
                            />
                            {replaceErrors.qtyPerPaxStanding && (
                              <p className="text-[11px] text-red-600">
                                {replaceErrors.qtyPerPaxStanding.message}
                              </p>
                            )}
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Redondeo</span>
                            <select
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('roundingRule')}
                            >
                              <option value="none">none</option>
                              <option value="ceil_unit">ceil_unit</option>
                              <option value="ceil_pack">ceil_pack</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Pack size</span>
                            <input
                              type="number"
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              {...registerReplace('packSize', {
                                setValueAs: (v) =>
                                  v === '' || Number.isNaN(Number(v)) ? undefined : Number(v),
                              })}
                            />
                            {replaceErrors.packSize && (
                              <p className="text-[11px] text-red-600">{replaceErrors.packSize.message}</p>
                            )}
                          </label>
                          <label className="md:col-span-3 space-y-1">
                            <span className="text-xs font-semibold text-slate-700">Notas</span>
                            <textarea
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              rows={2}
                              {...registerReplace('notes')}
                            />
                          </label>
                          <div className="md:col-span-3 flex gap-2">
                            <button
                              type="submit"
                              disabled={replaceSubmitting}
                              className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {replaceSubmitting ? 'Guardando...' : 'Guardar sustitucion'}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
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
                <p className="text-sm text-slate-600">Sin items en la plantilla.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Aplica una plantilla para gestionar overrides.</p>
          )}

          <div className="rounded border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-800">Items personalizados</h4>
            {addedItems.length ? (
              <div className="mt-2 space-y-2">
                {addedItems.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-1 rounded border border-slate-100 bg-slate-50 p-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-600">
                        {a.section ? `${a.section} - ` : ''} {a.unit} - sentado {a.qtyPerPaxSeated} - de
                        pie {a.qtyPerPaxStanding} - {a.roundingRule}{' '}
                        {a.packSize ? `(pack ${a.packSize})` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() => deleteAdded.mutate({ id: a.id })}
                    >
                      Borrar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Sin items anadidos manuales.</p>
            )}

            <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={handleSubmitAdd(onAddSubmit)}>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Seccion</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('section')}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Nombre</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('name')}
                />
                {addErrors.name && <p className="text-[11px] text-red-600">{addErrors.name.message}</p>}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Unidad</span>
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('unit')}
                >
                  <option value="ud">ud</option>
                  <option value="kg">kg</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Qty/pax sentado</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('qtyPerPaxSeated', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                  })}
                />
                {addErrors.qtyPerPaxSeated && (
                  <p className="text-[11px] text-red-600">{addErrors.qtyPerPaxSeated.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Qty/pax de pie</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('qtyPerPaxStanding', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                  })}
                />
                {addErrors.qtyPerPaxStanding && (
                  <p className="text-[11px] text-red-600">{addErrors.qtyPerPaxStanding.message}</p>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Redondeo</span>
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('roundingRule')}
                >
                  <option value="none">none</option>
                  <option value="ceil_unit">ceil_unit</option>
                  <option value="ceil_pack">ceil_pack</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Pack size</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  {...registerAdd('packSize', {
                    setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
                {addErrors.packSize && (
                  <p className="text-[11px] text-red-600">{addErrors.packSize.message}</p>
                )}
              </label>
              <label className="md:col-span-3 space-y-1">
                <span className="text-xs font-semibold text-slate-700">Notas</span>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  rows={2}
                  {...registerAdd('notes')}
                />
              </label>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {addSubmitting ? 'Guardando...' : 'Anadir item'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-800">Notas</h4>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <textarea
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Alergias u observaciones"
                />
                <button
                  type="button"
                  className="self-start rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={onAddNote}
                  disabled={addNote.isPending}
                >
                  Anadir nota
                </button>
              </div>
              {(overrides.data?.notes ?? []).map((n) => (
                <div key={n.id} className="rounded border border-slate-100 bg-slate-50 p-2 text-sm">
                  <p className="text-slate-800">{n.note}</p>
                  <p className="text-[11px] text-slate-500">{n.createdAt ?? ''}</p>
                </div>
              ))}
              {!overrides.data?.notes?.length && (
                <p className="text-sm text-slate-600">Sin notas registradas.</p>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            <div className="px-3 py-2">
              <h4 className="text-sm font-semibold text-slate-800">Necesidades</h4>
              <p className="text-xs text-slate-600">
                Calculado con pax {pax} y formato {format}, aplicando overrides.
              </p>
            </div>
            {needs.length ? (
              needs.map((n, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{n.name}</p>
                    <p className="text-xs text-slate-500">
                      Unidad {n.unit} - Cantidad: {n.qtyRounded.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-600">Sin necesidades calculadas.</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Revisar OCR</h3>
          <button className="text-sm text-slate-600" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="mt-2 max-h-[70vh] space-y-4 overflow-y-auto">
          {localDraft.detectedServices.map((svc, idx) => (
            <div key={idx} className="rounded border border-slate-200 p-3">
              <div className="grid gap-2 md:grid-cols-4">
                <label className="text-xs font-semibold text-slate-700">
                  Tipo
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
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
                <label className="text-xs font-semibold text-slate-700">
                  Hora
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={svc.startsAtGuess ?? ''}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({ ...s, startsAtGuess: e.target.value }))
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Pax
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={svc.paxGuess ?? 0}
                    onChange={(e) =>
                      updateService(idx, (s: any) => ({
                        ...s,
                        paxGuess: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Formato
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
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
                  <div key={secIdx} className="rounded border border-slate-100 p-2">
                    <input
                      className="mb-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={sec.title}
                      onChange={(e) => updateSection(idx, secIdx, e.target.value, sec.items)}
                    />
                    <textarea
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
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
            <p className="text-xs text-slate-500">Texto bruto (solo lectura)</p>
            <pre className="max-h-32 overflow-y-auto rounded bg-slate-100 p-2 text-xs text-slate-700">
              {localDraft.rawText}
            </pre>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
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
