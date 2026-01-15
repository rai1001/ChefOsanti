import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type ServiceRequirementRecipe = {
  id: string
  name: string
  servings: number
  defaultServings: number
}

export type ServiceRequirementProduct = {
  id: string
  name: string
  qty: number
  unit: 'kg' | 'ud'
}

export type ServiceRequirements = {
  serviceId: string
  eventId: string
  pax: number
  missingItems: string[]
  recipes: ServiceRequirementRecipe[]
  products: ServiceRequirementProduct[]
}

function mapRequirements(row: any): ServiceRequirements {
  return {
    serviceId: row.service_id,
    eventId: row.event_id,
    pax: Number(row.pax ?? 0),
    missingItems: Array.isArray(row.missing_items) ? row.missing_items : [],
    recipes:
      Array.isArray(row.recipes)
        ? row.recipes.map((r: any) => ({
            id: r.recipe_id,
            name: r.name,
            servings: Number(r.servings ?? 0),
            defaultServings: Number(r.default_servings ?? 1),
          }))
        : [],
    products:
      Array.isArray(row.products)
        ? row.products.map((p: any) => ({
            id: p.product_id,
            name: p.name,
            qty: Number(p.qty ?? 0),
            unit: p.unit,
          }))
        : [],
  }
}

export async function computeServiceRequirements(serviceId: string): Promise<ServiceRequirements> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('compute_service_requirements', {
    p_event_service_id: serviceId,
    p_strict: false,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'computeServiceRequirements',
      serviceId,
    })
  }
  return mapRequirements(data)
}

export function useServiceRequirements(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service_requirements', serviceId],
    queryFn: () => computeServiceRequirements(serviceId ?? ''),
    enabled: Boolean(serviceId),
  })
}
