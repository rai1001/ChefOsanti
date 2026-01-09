import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { normalizeAlias } from '../domain/eventDraftOrder'

export type MenuItemAlias = {
  id: string
  aliasText: string
  normalized: string
  supplierItemId: string
}

export async function listMenuItemAliases(orgId: string): Promise<MenuItemAlias[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('menu_item_aliases').select('*').eq('org_id', orgId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'listMenuItemAliases',
      orgId,
    })
  }
  return (
    data?.map((row) => ({
      id: row.id,
      aliasText: row.alias_text,
      normalized: row.normalized,
      supplierItemId: row.supplier_item_id,
    })) ?? []
  )
}

export function useMenuItemAliases(orgId: string | undefined) {
  return useQuery({
    queryKey: ['menu_item_aliases', orgId],
    queryFn: () => listMenuItemAliases(orgId ?? ''),
    enabled: Boolean(orgId),
  })
}

export function useUpsertAlias(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { aliasText: string; supplierItemId: string }) => {
      const supabase = getSupabaseClient()
      const normalized = normalizeAlias(params.aliasText)
      const { error } = await supabase.from('menu_item_aliases').upsert({
        org_id: orgId,
        alias_text: params.aliasText,
        normalized,
        supplier_item_id: params.supplierItemId,
      })
      if (error) {
        throw mapSupabaseError(error, {
          module: 'purchasing',
          operation: 'upsertAlias',
          orgId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_item_aliases', orgId] })
    },
  })
}
