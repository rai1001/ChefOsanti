import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { useMenuItemAliases, useUpsertAlias } from '@/modules/purchasing/data/aliases'
import { useEventNeeds, useCreateEventDraftOrders } from '@/modules/purchasing/data/eventOrders'
import { useSupplierItemsByOrg } from '@/modules/purchasing/data/suppliers'

import { parseOcrText, type OcrDraft } from '../domain/ocrParser'
import {
  useCreateBooking,
  useCreateEventService,
  useDeleteBooking,
  useDeleteEventService,
  useEvent,
  useEventServices,
  useSpaces,
} from '../data/events'

import { useApplyOcrDraft as useApplyOcrDraftHook, useEventAttachments, useOcrEnqueue, useOcrRun, useUploadEventAttachment } from '../data/ocr'
import { useMenuTemplates } from '../data/menus'
import { DraftOrdersModal } from './DraftOrdersModal'
import { OcrReviewModal } from './OcrReviewModal'
import { ErrorBoundary } from '@/modules/shared/ui/ErrorBoundary'

// New Components
import { EventDetailsSection } from './EventDetailsSection'
import { EventBookingsSection } from './EventBookingsSection'
import { EventServicesSection } from './EventServicesSection'
import { AddBookingModal, type BookingForm } from './AddBookingModal'
import { AddServiceModal, type ServiceForm } from './AddServiceModal'
import { ProductionSection } from '@/modules/production/ui/ProductionSection'

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

export default function EventDetailPage() {
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

  // UI State for Modals
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false)
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)

  const sessionError = useFormattedError(error)
  const eventError = useFormattedError(eventQuery.error)
  // These errors can be passed to modals if needed, or handled via toast ideally.
  // For now, modals show errors if mutation fails? 
  // The original inline form showed createBookingError inline. 
  // I should pass it or handle it. 
  // But wait, the mutation state (isError) is accessible.
  // The modals rely on onSubmit assumption.
  // Ideally, I should pass the mutation status or error to the modal?
  // Or simpler: The modal logic I wrote just calls onSubmit and closes. 
  // If mutation fails, it throws, so strict implementation would handle that.
  // But standard pattern: `mutateAsync` throws if error. 
  // So inside `handleFormSubmit` in modal: `await onSubmit(data)`. 
  // If `onSubmit` throws, the modal stays open?
  // My modal implementation: `await onSubmit(data); reset(); onClose();`
  // Yes, if `onSubmit` throws, it won't close. Nice.

  const onSubmitBooking = async (values: BookingForm) => {
    await createBooking.mutateAsync({
      spaceId: values.spaceId,
      startsAt: toISO(values.startsAt),
      endsAt: toISO(values.endsAt),
      groupLabel: values.groupLabel ?? null,
      note: values.note ?? null,
    })
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
  }

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando sesion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para ver eventos.</p>
        <p className="text-xs text-red-500 mt-1">{sessionError}</p>
      </div>
    )

  if (eventQuery.isLoading) return <p className="p-4 text-sm text-slate-600">Cargando evento...</p>
  if (eventQuery.isError)
    return (
      <p className="p-4 text-sm text-red-600">
        Error al cargar: {eventError}
      </p>
    )

  const event = eventQuery.data?.event
  const bookings = eventQuery.data?.bookings ?? []
  const eventServices = services.data ?? []

  if (!event) return null

  return (
    <ErrorBoundary module="EventDetailPage">
      <div className="space-y-4 animate-fade-in">

        <EventDetailsSection event={event} />

        <EventBookingsSection
          bookings={bookings}
          onDeleteBooking={(id) => deleteBooking.mutate(id)}
          onAddBooking={() => setIsAddBookingOpen(true)}
        />

        {/* Keeping OCR Section Inline for now as it wasn't requested to be extracted */}
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
                    e.target.value = ''
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
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:border-white/30 transition-all disabled:opacity-50"
                    disabled={ocrEnqueue.isPending || ocrRun.isPending}
                    onClick={async () => {
                      try {
                        const { jobId } = await ocrEnqueue.mutateAsync(att.id)
                        await ocrRun.mutateAsync(jobId)
                        attachments.refetch()
                      } catch (err) {
                        console.error(err)
                      }
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

        <EventServicesSection
          services={eventServices}
          menuTemplates={menuTemplates.data ?? []}
          onDeleteService={(id) => deleteService.mutate(id)}
          onAddService={() => setIsAddServiceOpen(true)}
        />

        <ProductionSection
          services={eventServices}
          orgId={event.orgId}
          hotelId={event.hotelId}
          eventId={event.id}
        />

        {/* Keeping Draft Orders Section Inline */}
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

      </div>

      <AddBookingModal
        isOpen={isAddBookingOpen}
        onClose={() => setIsAddBookingOpen(false)}
        onSubmit={onSubmitBooking}
        spaces={spaces.data ?? []}
        existingBookings={bookings}
      />

      <AddServiceModal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSubmit={onSubmitService}
      />

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
