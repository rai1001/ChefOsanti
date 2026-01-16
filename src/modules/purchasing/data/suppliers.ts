import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type {
  ProductType,
  PurchaseUnit,
  RoundingRule,
  Supplier,
  SupplierItem,
} from '@/modules/purchasing/domain/types'

export type CreateSupplierInput = {
  orgId: string
  name: string
  leadTimeDays?: number | null
}

export type CreateSupplierItemInput = {
  supplierId: string
  name: string
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
  pricePerUnit?: number | null
  notes?: string | null
  productTypeOverride?: ProductType | null
  leadTimeDaysOverride?: number | null
}

type SupplierRow = {
  id: string
  org_id: string
  name: string
  created_at: string
  lead_time_days?: number | null
}

type SupplierItemRow = {
  id: string
  supplier_id: string
  name: string
  purchase_unit: PurchaseUnit
  pack_size?: number | null
  rounding_rule: RoundingRule
  price_per_unit?: number | null
  notes?: string | null
  product_type_override?: ProductType | null
  lead_time_days_override?: number | null
  created_at: string
  products?: { product_type?: ProductType | null } | null
}

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    createdAt: row.created_at,
    leadTimeDays: typeof row.lead_time_days === 'number' ? row.lead_time_days : null,
  }
}

function mapSupplierItem(row: SupplierItemRow): SupplierItem {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    name: row.name,
    purchaseUnit: row.purchase_unit,
    packSize: row.pack_size,
    roundingRule: row.rounding_rule,
    pricePerUnit: row.price_per_unit,
    notes: row.notes,
    productTypeOverride: row.product_type_override ?? null,
    productType: row.products?.product_type ?? null,
    leadTimeDaysOverride: typeof row.lead_time_days_override === 'number' ? row.lead_time_days_override : null,
    createdAt: row.created_at,
  }
}

const PAGE_SIZE = 20

async function fetchSuppliersInfinite({
  orgId,
  pageParam = 0,
}: {
  orgId: string
  pageParam: number
}): Promise<Supplier[]> {
  const supabase = getSupabaseClient()
  const from = pageParam * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, org_id, name, created_at, lead_time_days')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .order('name', { ascending: false })
    .range(from, to)

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'fetchSuppliersInfinite',
      orgId,
    })
  }

  return data?.map(mapSupplier) ?? []
}

// Keep original for back-compat if needed, or deprecate.
async function fetchSuppliers(orgId: string): Promise<Supplier[]> {
  return fetchSuppliersInfinite({ orgId, pageParam: 0 }) // Default to first page if called directly
}

async function fetchSupplier(id: string): Promise<Supplier | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, org_id, name, created_at, lead_time_days')
    .eq('id', id)
    .single()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'fetchSupplier',
    })
  }

  return data ? mapSupplier(data) : null
}

async function fetchSupplierItems(supplierId: string): Promise<SupplierItem[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_items')
    .select(
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, product_type_override, lead_time_days_override, created_at, products(product_type)',
    )
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'fetchSupplierItems',
      supplierId,
    })
  }

  return data?.map(mapSupplierItem) ?? []
}

export async function insertSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      org_id: input.orgId,
      name: input.name,
      lead_time_days: typeof input.leadTimeDays === 'number' ? input.leadTimeDays : undefined,
    })
    .select('id, org_id, name, created_at, lead_time_days')
    .single()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'insertSupplier',
      orgId: input.orgId,
    })
  }

  return mapSupplier(data)
}

export async function updateSupplierLeadTime(input: { supplierId: string; leadTimeDays: number }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('suppliers')
    .update({ lead_time_days: input.leadTimeDays })
    .eq('id', input.supplierId)
    .select('id, org_id, name, created_at, lead_time_days')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'updateSupplierLeadTime',
      supplierId: input.supplierId,
    })
  }
  return mapSupplier(data)
}

export async function insertSupplierItem(input: CreateSupplierItemInput): Promise<SupplierItem> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_items')
    .insert({
      supplier_id: input.supplierId,
      name: input.name,
      purchase_unit: input.purchaseUnit,
      rounding_rule: input.roundingRule,
      pack_size: input.packSize ?? null,
      price_per_unit: input.pricePerUnit ?? null,
      notes: input.notes ?? null,
      product_type_override: input.productTypeOverride ?? null,
      lead_time_days_override: typeof input.leadTimeDaysOverride === 'number' ? input.leadTimeDaysOverride : null,
    })
    .select(
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, product_type_override, lead_time_days_override, created_at, products(product_type)',
    )
    .single()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'insertSupplierItem',
      supplierId: input.supplierId,
    })
  }

  return mapSupplierItem(data)
}

export function useSuppliers(orgId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['suppliers', orgId],
    queryFn: () => fetchSuppliers(orgId!),
    enabled: enabled && Boolean(orgId),
  })
}

export function useSuppliersInfinite(orgId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['suppliers', 'infinite', orgId],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchSuppliersInfinite({ orgId: orgId!, pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: Supplier[], allPages: Supplier[][]) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined
    },
    enabled: enabled && Boolean(orgId),
  })
}

export function useSupplier(supplierId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['suppliers', supplierId],
    queryFn: () => fetchSupplier(supplierId!),
    enabled: enabled && Boolean(supplierId),
  })
}

export function useSupplierItems(supplierId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['supplier_items', supplierId],
    queryFn: () => fetchSupplierItems(supplierId!),
    enabled: enabled && Boolean(supplierId),
  })
}

export function useCreateSupplier(orgId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateSupplierInput, 'orgId'>) => {
      if (!orgId) {
        throw new Error('No se puede crear proveedor sin organización.')
      }
      return insertSupplier({ ...input, orgId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['suppliers', 'infinite', orgId] })
      }
    },
  })
}

export function useUpdateSupplierLeadTime(supplierId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (leadTimeDays: number) => {
      if (!supplierId) {
        throw new Error('No se puede actualizar lead time sin proveedor.')
      }
      return updateSupplierLeadTime({ supplierId, leadTimeDays })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', supplierId] })
    },
  })
}

export function useCreateSupplierItem(supplierId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateSupplierItemInput, 'supplierId'>) => {
      if (!supplierId) {
        throw new Error('No se puede crear artículo sin proveedor.')
      }
      return insertSupplierItem({ ...input, supplierId })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier_items', supplierId] })
      if (variables?.name) {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      }
    },
  })
}

export async function listSupplierItemsByOrg(orgId: string): Promise<SupplierItem[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_items')
    .select(
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, product_type_override, lead_time_days_override, created_at, products(product_type), suppliers!inner(org_id)',
    )
    .eq('suppliers.org_id', orgId)
    .order('created_at')

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'listSupplierItemsByOrg',
      orgId,
    })
  }

  return (
    data?.map(mapSupplierItem) ?? []
  )
}

export function useSupplierItemsByOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ['supplier_items_by_org', orgId],
    queryFn: () => listSupplierItemsByOrg(orgId!),
    enabled: Boolean(orgId),
  })
}

export type SupplierLeadTime = {
  id: string
  orgId: string
  supplierId: string
  productType: ProductType
  leadTimeDays: number
  createdAt: string
}

type SupplierLeadTimeRow = {
  id: string
  org_id: string
  supplier_id: string
  product_type: ProductType
  lead_time_days: number
  created_at: string
}

function mapSupplierLeadTime(row: SupplierLeadTimeRow): SupplierLeadTime {
  return {
    id: row.id,
    orgId: row.org_id,
    supplierId: row.supplier_id,
    productType: row.product_type,
    leadTimeDays: row.lead_time_days,
    createdAt: row.created_at,
  }
}

export async function listSupplierLeadTimes(supplierId: string): Promise<SupplierLeadTime[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_lead_times')
    .select('id, org_id, supplier_id, product_type, lead_time_days, created_at')
    .eq('supplier_id', supplierId)
    .order('product_type')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'listSupplierLeadTimes',
      supplierId,
    })
  }
  return data?.map(mapSupplierLeadTime) ?? []
}

export async function upsertSupplierLeadTime(input: {
  orgId: string
  supplierId: string
  productType: ProductType
  leadTimeDays: number
}): Promise<SupplierLeadTime> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_lead_times')
    .upsert(
      {
        org_id: input.orgId,
        supplier_id: input.supplierId,
        product_type: input.productType,
        lead_time_days: input.leadTimeDays,
      },
      { onConflict: 'supplier_id,product_type' },
    )
    .select('id, org_id, supplier_id, product_type, lead_time_days, created_at')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'upsertSupplierLeadTime',
      supplierId: input.supplierId,
    })
  }
  return mapSupplierLeadTime(data)
}

export function useSupplierLeadTimes(supplierId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['supplier_lead_times', supplierId],
    queryFn: () => listSupplierLeadTimes(supplierId!),
    enabled: enabled && Boolean(supplierId),
  })
}

export function useUpsertSupplierLeadTime(orgId: string | undefined, supplierId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { productType: ProductType; leadTimeDays: number }) => {
      if (!orgId || !supplierId) {
        throw new Error('No se puede actualizar lead times sin org/proveedor.')
      }
      return upsertSupplierLeadTime({
        orgId,
        supplierId,
        productType: input.productType,
        leadTimeDays: input.leadTimeDays,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_lead_times', supplierId] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
