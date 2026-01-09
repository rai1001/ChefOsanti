import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { getEnv } from '@/config/env'
import { mapSupabaseError } from '@/lib/shared/errors'
import { parseOcrText, type OcrDraft } from '../domain/ocrParser'

const { supabaseUrl } = getEnv()

export type OcrJob = {
  id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  provider: string
  extractedText?: string | null
  draftJson?: any
  createdAt?: string
}

export type EventAttachment = {
  id: string
  orgId: string
  eventId: string
  storagePath: string
  originalName: string
  mimeType: string
  sizeBytes?: number | null
  createdAt: string
  job?: OcrJob | null
}

export type MenuContentSection = {
  id: string
  title: string
  sortOrder: number
  items: { id: string; text: string; sortOrder: number }[]
}

function mapJob(row: any): OcrJob {
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    extractedText: row.extracted_text,
    draftJson: row.draft_json,
    createdAt: row.created_at,
  }
}

function mapAttachment(row: any): EventAttachment {
  const jobRow = Array.isArray(row.ocr_jobs) ? row.ocr_jobs[0] : row.ocr_jobs
  return {
    id: row.id,
    orgId: row.org_id,
    eventId: row.event_id,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    job: jobRow ? mapJob(jobRow) : null,
  }
}

export async function listEventAttachments(eventId: string): Promise<EventAttachment[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_attachments')
    .select('*, ocr_jobs(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .order('created_at', { ascending: false, referencedTable: 'ocr_jobs' })
    .order('created_at', { ascending: false })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listEventAttachments',
      eventId,
    })
  }
  return data?.map(mapAttachment) ?? []
}

export async function uploadEventAttachment(eventId: string, orgId: string, file: File): Promise<EventAttachment> {
  const supabase = getSupabaseClient()
  const path = `org/${orgId}/event/${eventId}/${crypto.randomUUID()}_${file.name}`
  const uploadRes = await supabase.storage.from('event-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadRes.error) {
    throw mapSupabaseError(uploadRes.error, {
      module: 'events',
      operation: 'uploadEventAttachment',
      step: 'upload',
      eventId,
    })
  }

  const { data, error } = await supabase
    .from('event_attachments')
    .insert({
      org_id: orgId,
      event_id: eventId,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    })
    .select('*, ocr_jobs(*)')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'uploadEventAttachment',
      step: 'insert',
      eventId,
    })
  }
  return mapAttachment(data)
}

export function useEventAttachments(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event_attachments', eventId],
    queryFn: () => listEventAttachments(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

export function useUploadEventAttachment(eventId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadEventAttachment(eventId ?? '', orgId ?? '', file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_attachments', eventId] }),
  })
}

export async function enqueueOcr(attachmentId: string) {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(`${supabaseUrl}/functions/v1/ocr_process/enqueue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ attachmentId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as { jobId: string }
}

export async function runOcr(jobId: string) {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(`${supabaseUrl}/functions/v1/ocr_process/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as { status: string }
}

export async function processOcrLocally(attachmentId: string, orgId: string) {
  const supabase = getSupabaseClient()
  const mockText =
    'DESAYUNO 08:00 40 pax\nBEBIDAS:\nCafe\nZumo\n\nCENA 21:00 30 pax\nPLATOS:\nPasta\n'
  const draft = parseOcrText(mockText)
  const { data, error } = await supabase
    .from('ocr_jobs')
    .insert({
      org_id: orgId,
      attachment_id: attachmentId,
      status: 'done',
      provider: 'mock',
      extracted_text: mockText,
      draft_json: draft as any,
    })
    .select('id')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'processOcrLocally',
      attachmentId,
    })
  }
  return { jobId: data.id as string }
}

export function useOcrEnqueue(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => enqueueOcr(attachmentId),
    onSuccess: (_data, _vars) => qc.invalidateQueries({ queryKey: ['event_attachments', eventId] }),
  })
}

export function useOcrRun(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => runOcr(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_attachments', eventId] }),
  })
}

export async function applyOcrDraft(params: {
  eventId: string
  orgId: string
  draft: OcrDraft
}): Promise<string[]> {
  const supabase = getSupabaseClient()
  const createdServiceIds: string[] = []
  for (const svc of params.draft.detectedServices) {
    const { data: svcRow, error: svcErr } = await supabase
      .from('event_services')
      .insert({
        org_id: params.orgId,
        event_id: params.eventId,
        service_type: svc.serviceType,
        format: svc.formatGuess ?? 'sentado',
        starts_at: svc.startsAtGuess ? new Date().toISOString().split('T')[0] + 'T' + svc.startsAtGuess + ':00Z' : null,
        pax: svc.paxGuess ?? 0,
      })
      .select('id')
      .single()
    if (svcErr) {
      throw mapSupabaseError(svcErr, {
        module: 'events',
        operation: 'applyOcrDraft',
        step: 'createService',
        eventId: params.eventId,
      })
    }
    const serviceId = svcRow.id as string
    createdServiceIds.push(serviceId)

    for (const [secIdx, section] of svc.sections.entries()) {
      const { data: secRow, error: secErr } = await supabase
        .from('event_service_menu_sections')
        .insert({
          org_id: params.orgId,
          event_service_id: serviceId,
          title: section.title || 'Seccion',
          sort_order: secIdx,
        })
        .select('id')
        .single()
      if (secErr) {
        throw mapSupabaseError(secErr, {
          module: 'events',
          operation: 'applyOcrDraft',
          step: 'createSection',
          eventId: params.eventId,
          serviceId,
        })
      }
      const sectionId = secRow.id as string
      for (const [itemIdx, item] of section.items.entries()) {
        const { error: itemErr } = await supabase.from('event_service_menu_items').insert({
          org_id: params.orgId,
          section_id: sectionId,
          text: item,
          sort_order: itemIdx,
        })
        if (itemErr) {
          throw mapSupabaseError(itemErr, {
            module: 'events',
            operation: 'applyOcrDraft',
            step: 'createItem',
            eventId: params.eventId,
            serviceId,
            sectionId,
          })
        }
      }
    }
  }
  return createdServiceIds
}

export function useApplyOcrDraft(eventId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: OcrDraft) => applyOcrDraft({ eventId: eventId ?? '', orgId: orgId ?? '', draft }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_services', eventId] })
      qc.invalidateQueries({ queryKey: ['event_attachments', eventId] })
      qc.invalidateQueries({ queryKey: ['service_menu_content'] })
    },
  })
}

export async function getServiceMenuContent(serviceId: string): Promise<MenuContentSection[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_service_menu_sections')
    .select('id, title, sort_order, event_service_menu_items (id, text, sort_order)')
    .eq('event_service_id', serviceId)
    .order('sort_order')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'getServiceMenuContent',
      serviceId,
    })
  }
  return (
    data?.map((row: any) => ({
      id: row.id,
      title: row.title,
      sortOrder: row.sort_order,
      items:
        row.event_service_menu_items?.map((it: any) => ({
          id: it.id,
          text: it.text,
          sortOrder: it.sort_order,
        })) ?? [],
    })) ?? []
  )
}

export function useServiceMenuContent(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service_menu_content', serviceId],
    queryFn: () => getServiceMenuContent(serviceId ?? ''),
    enabled: Boolean(serviceId),
  })
}
