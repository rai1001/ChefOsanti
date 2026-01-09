import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { MenuCategory, MenuTemplateItem } from '../domain/menu'

export type MenuTemplate = {
  id: string
  orgId: string
  name: string
  category: MenuCategory
  notes?: string | null
  active: boolean
}

export type ServiceMenu = {
  template: MenuTemplate
  items: MenuTemplateItem[]
}

function mapTemplate(row: any): MenuTemplate {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    category: row.category,
    notes: row.notes,
    active: row.active,
  }
}

function mapItem(row: any): MenuTemplateItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    qtyPerPaxSeated: row.qty_per_pax_seated,
    qtyPerPaxStanding: row.qty_per_pax_standing,
    roundingRule: row.rounding_rule,
    packSize: row.pack_size,
    section: row.section,
  }
}

export async function listMenuTemplates(orgId?: string): Promise<MenuTemplate[]> {
  const supabase = getSupabaseClient()
  const query = supabase.from('menu_templates').select('*').order('created_at', { ascending: false })
  const { data, error } = orgId ? await query.eq('org_id', orgId) : await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listMenuTemplates',
      orgId,
    })
  }
  return data?.map(mapTemplate) ?? []
}

export async function createMenuTemplate(params: {
  orgId: string
  name: string
  category: MenuCategory
  notes?: string | null
}): Promise<MenuTemplate> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_templates')
    .insert({
      org_id: params.orgId,
      name: params.name,
      category: params.category,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createMenuTemplate',
      orgId: params.orgId,
    })
  }
  return mapTemplate(data)
}

export async function listMenuTemplateItems(templateId: string): Promise<MenuTemplateItem[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listMenuTemplateItems',
      templateId,
    })
  }
  return data?.map(mapItem) ?? []
}

export async function createMenuTemplateItem(
  templateId: string,
  orgId: string,
  payload: Omit<MenuTemplateItem, 'id'>,
) {
  if (!templateId || !orgId) {
    throw new Error('Faltan orgId o templateId para crear item')
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_template_items')
    .insert({
      template_id: templateId,
      org_id: orgId,
      section: payload.section ?? null,
      name: payload.name,
      unit: payload.unit,
      qty_per_pax_seated: payload.qtyPerPaxSeated,
      qty_per_pax_standing: payload.qtyPerPaxStanding,
      rounding_rule: payload.roundingRule,
      pack_size: payload.packSize ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createMenuTemplateItem',
      orgId,
      templateId,
    })
  }
  return mapItem(data)
}

export async function applyTemplateToService(eventServiceId: string, templateId: string, orgId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('event_service_menus')
    .upsert(
      {
        event_service_id: eventServiceId,
        template_id: templateId,
        org_id: orgId,
      },
      { onConflict: 'event_service_id' },
    )
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'applyTemplateToService',
      eventServiceId,
      templateId,
    })
  }
}

export async function getServiceMenu(eventServiceId: string): Promise<ServiceMenu | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_service_menus')
    .select('template_id, menu_templates (*)')
    .eq('event_service_id', eventServiceId)
    .maybeSingle()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'getServiceMenu',
      eventServiceId,
    })
  }
  if (!data) return null
  const { template_id, menu_templates } = data as any
  const { data: items, error: itemsErr } = await supabase
    .from('menu_template_items')
    .select('*')
    .eq('template_id', template_id)
  if (itemsErr) {
    throw mapSupabaseError(itemsErr, {
      module: 'events',
      operation: 'getServiceMenu',
      step: 'items',
      templateId: template_id,
    })
  }
  return {
    template: mapTemplate(menu_templates),
    items: items?.map(mapItem) ?? [],
  }
}

// Hooks
export function useMenuTemplates(orgId?: string) {
  return useQuery({
    queryKey: ['menu_templates', orgId],
    queryFn: () => listMenuTemplates(orgId),
    enabled: orgId !== undefined,
  })
}

export function useCreateMenuTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMenuTemplate,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['menu_templates', variables.orgId] })
    },
  })
}

export function useMenuTemplateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['menu_template_items', templateId],
    queryFn: () => listMenuTemplateItems(templateId ?? ''),
    enabled: Boolean(templateId),
  })
}

export function useCreateMenuTemplateItem(templateId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<MenuTemplateItem, 'id'>) =>
      createMenuTemplateItem(templateId ?? '', orgId ?? '', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_template_items', templateId] })
      qc.invalidateQueries({ queryKey: ['menu_templates', orgId] })
    },
  })
}

export function useApplyTemplateToService(eventServiceId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { templateId: string; orgId: string }) =>
      applyTemplateToService(eventServiceId ?? '', params.templateId, params.orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_menu', eventServiceId] })
    },
  })
}

export function useServiceMenu(eventServiceId: string | undefined) {
  return useQuery({
    queryKey: ['service_menu', eventServiceId],
    queryFn: () => getServiceMenu(eventServiceId ?? ''),
    enabled: Boolean(eventServiceId),
  })
}
