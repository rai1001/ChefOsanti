import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type MenuRecipeAlias = {
  id: string
  orgId: string
  aliasName: string
  recipeId: string
}

export async function listMenuRecipeAliases(orgId: string): Promise<MenuRecipeAlias[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('menu_item_recipe_aliases')
    .select('*')
    .eq('org_id', orgId)
    .order('alias_name')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'recipes',
      operation: 'listMenuRecipeAliases',
      orgId,
    })
  }
  return (
    data?.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      aliasName: row.alias_name,
      recipeId: row.recipe_id,
    })) ?? []
  )
}

export function useMenuRecipeAliases(orgId: string | undefined) {
  return useQuery({
    queryKey: ['menu_recipe_aliases', orgId],
    queryFn: () => listMenuRecipeAliases(orgId ?? ''),
    enabled: Boolean(orgId),
  })
}

export function useUpsertMenuRecipeAlias(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { aliasName: string; recipeId: string }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('menu_item_recipe_aliases').upsert(
        {
          org_id: orgId,
          alias_name: params.aliasName.trim(),
          recipe_id: params.recipeId,
        },
        { onConflict: 'org_id,alias_name' },
      )
      if (error) {
        throw mapSupabaseError(error, {
          module: 'recipes',
          operation: 'upsertMenuRecipeAlias',
          orgId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_recipe_aliases', orgId] })
    },
  })
}

export function useDeleteMenuRecipeAlias(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { aliasName: string }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('menu_item_recipe_aliases')
        .delete()
        .eq('org_id', orgId)
        .eq('alias_name', params.aliasName.trim())
      if (error) {
        throw mapSupabaseError(error, {
          module: 'recipes',
          operation: 'deleteMenuRecipeAlias',
          orgId,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_recipe_aliases', orgId] })
    },
  })
}
