import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { AddedItem, ExcludedItem, ReplacedItem } from '../domain/overrides'

export type ServiceOverridesData = {
  excluded: ExcludedItem[]
  added: (AddedItem & { id: string })[]
  replaced: (ReplacedItem & { id: string })[]
  notes: { id: string; note: string; createdAt?: string; createdBy?: string | null }[]
}

export async function fetchOverrides(eventServiceId: string): Promise<ServiceOverridesData> {
  const supabase = getSupabaseClient()
  const [excluded, added, replaced, notes] = await Promise.all([
    supabase.from('event_service_excluded_items').select('template_item_id').eq('event_service_id', eventServiceId),
    supabase.from('event_service_added_items').select('*').eq('event_service_id', eventServiceId),
    supabase.from('event_service_replaced_items').select('*').eq('event_service_id', eventServiceId),
    supabase.from('event_service_notes').select('*').eq('event_service_id', eventServiceId).order('created_at', { ascending: false }),
  ])

  if (excluded.error) {
    throw mapSupabaseError(excluded.error, {
      module: 'events',
      operation: 'fetchOverrides',
      step: 'excluded',
      eventServiceId,
    })
  }
  if (added.error) {
    throw mapSupabaseError(added.error, {
      module: 'events',
      operation: 'fetchOverrides',
      step: 'added',
      eventServiceId,
    })
  }
  if (replaced.error) {
    throw mapSupabaseError(replaced.error, {
      module: 'events',
      operation: 'fetchOverrides',
      step: 'replaced',
      eventServiceId,
    })
  }
  if (notes.error) {
    throw mapSupabaseError(notes.error, {
      module: 'events',
      operation: 'fetchOverrides',
      step: 'notes',
      eventServiceId,
    })
  }

  return {
    excluded: excluded.data?.map((row) => ({ templateItemId: row.template_item_id })) ?? [],
    added:
      added.data?.map((row) => ({
        id: row.id,
        name: row.name,
        unit: row.unit,
        qtyPerPaxSeated: row.qty_per_pax_seated,
        qtyPerPaxStanding: row.qty_per_pax_standing,
        roundingRule: row.rounding_rule,
        packSize: row.pack_size,
        section: row.section,
        notes: row.notes,
      })) ?? [],
    replaced:
      replaced.data?.map((row) => ({
        id: row.id,
        templateItemId: row.template_item_id,
        replacement: {
          name: row.name,
          unit: row.unit,
          qtyPerPaxSeated: row.qty_per_pax_seated,
          qtyPerPaxStanding: row.qty_per_pax_standing,
          roundingRule: row.rounding_rule,
          packSize: row.pack_size,
          section: row.section,
          notes: row.notes,
        },
      })) ?? [],
    notes:
      notes.data?.map((row) => ({
        id: row.id,
        note: row.note,
        createdAt: row.created_at,
        createdBy: row.created_by,
      })) ?? [],
  }
}

export function useServiceOverrides(eventServiceId: string | undefined) {
  return useQuery({
    queryKey: ['service_overrides', eventServiceId],
    queryFn: () => fetchOverrides(eventServiceId ?? ''),
    enabled: Boolean(eventServiceId),
  })
}

export function useExcludeTemplateItem(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { orgId: string; templateItemId: string; exclude: boolean }) => {
      const supabase = getSupabaseClient()
      if (params.exclude) {
        const { error } = await supabase.from('event_service_excluded_items').upsert({
          org_id: params.orgId,
          event_service_id: eventServiceId,
          template_item_id: params.templateItemId,
        })
        if (error) {
          throw mapSupabaseError(error, {
            module: 'events',
            operation: 'excludeTemplateItem',
            eventServiceId,
            templateItemId: params.templateItemId,
          })
        }
      } else {
        const { error } = await supabase
          .from('event_service_excluded_items')
          .delete()
          .eq('event_service_id', eventServiceId)
          .eq('template_item_id', params.templateItemId)
        if (error) {
          throw mapSupabaseError(error, {
            module: 'events',
            operation: 'unexcludeTemplateItem',
            eventServiceId,
            templateItemId: params.templateItemId,
          })
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_requirements', eventServiceId] })
    },
  })
}

export function useAddServiceItem(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { orgId: string } & AddedItem) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('event_service_added_items').insert({
        org_id: params.orgId,
        event_service_id: eventServiceId,
        section: params.section ?? null,
        name: params.name,
        unit: params.unit,
        qty_per_pax_seated: params.qtyPerPaxSeated,
        qty_per_pax_standing: params.qtyPerPaxStanding,
        rounding_rule: params.roundingRule,
        pack_size: params.packSize ?? null,
        notes: params.notes ?? null,
      })
      if (error) {
        throw mapSupabaseError(error, {
          module: 'events',
          operation: 'addServiceItem',
          eventServiceId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_requirements', eventServiceId] })
    },
  })
}

export function useDeleteAddedItem(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('event_service_added_items')
        .delete()
        .eq('event_service_id', eventServiceId)
        .eq('id', params.id)
      if (error) {
        throw mapSupabaseError(error, {
          module: 'events',
          operation: 'deleteAddedItem',
          eventServiceId,
          itemId: params.id,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_requirements', eventServiceId] })
    },
  })
}

export function useReplaceTemplateItem(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { orgId: string; templateItemId: string } & AddedItem) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('event_service_replaced_items').upsert(
        {
          org_id: params.orgId,
          event_service_id: eventServiceId,
          template_item_id: params.templateItemId,
          section: params.section ?? null,
          name: params.name,
          unit: params.unit,
          qty_per_pax_seated: params.qtyPerPaxSeated,
          qty_per_pax_standing: params.qtyPerPaxStanding,
          rounding_rule: params.roundingRule,
          pack_size: params.packSize ?? null,
          notes: params.notes ?? null,
        },
        { onConflict: 'event_service_id,template_item_id' },
      )
      if (error) {
        throw mapSupabaseError(error, {
          module: 'events',
          operation: 'replaceTemplateItem',
          eventServiceId,
          templateItemId: params.templateItemId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_requirements', eventServiceId] })
    },
  })
}

export function useRemoveReplacement(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateItemId: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('event_service_replaced_items')
        .delete()
        .eq('event_service_id', eventServiceId)
        .eq('template_item_id', templateItemId)
      if (error) {
        throw mapSupabaseError(error, {
          module: 'events',
          operation: 'removeReplacement',
          eventServiceId,
          templateItemId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
      qc.invalidateQueries({ queryKey: ['service_requirements', eventServiceId] })
    },
  })
}

export function useAddServiceNote(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { orgId: string; note: string }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('event_service_notes').insert({
        org_id: params.orgId,
        event_service_id: eventServiceId,
        note: params.note,
      })
      if (error) {
        throw mapSupabaseError(error, {
          module: 'events',
          operation: 'addServiceNote',
          eventServiceId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_overrides', eventServiceId] })
    },
  })
}
