import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type {
  PurchaseUnit,
  RoundingRule,
  Supplier,
  SupplierItem,
} from '@/modules/purchasing/domain/types'

export type CreateSupplierInput = {
  orgId: string
  name: string
}

export type CreateSupplierItemInput = {
  supplierId: string
  name: string
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
  pricePerUnit?: number | null
  notes?: string | null
}

function mapSupplier(row: any): Supplier {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    createdAt: row.created_at,
  }
}

function mapSupplierItem(row: any): SupplierItem {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    name: row.name,
    purchaseUnit: row.purchase_unit,
    packSize: row.pack_size,
    roundingRule: row.rounding_rule,
    pricePerUnit: row.price_per_unit,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, org_id, name, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'fetchSuppliers',
    })
  }

  return data?.map(mapSupplier) ?? []
}

async function fetchSupplier(id: string): Promise<Supplier | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, org_id, name, created_at')
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
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, created_at',
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
    })
    .select('id, org_id, name, created_at')
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
    })
    .select(
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, created_at',
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

export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    enabled,
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
      'id, supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes, created_at, suppliers!inner(org_id)',
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
