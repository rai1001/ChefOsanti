import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError, AppError } from '@/lib/shared/errors'
import { logger } from '@/lib/shared/logger'
import type { PurchaseOrderStatus } from '../domain/purchaseOrder'
import { type PurchaseUnit, type RoundingRule, type Supplier, type SupplierItem } from '../domain/types'

export type Hotel = { id: string; name: string; orgId: string }
export type Ingredient = {
  id: string
  name: string
  hotelId: string
  orgId: string
  baseUnit: PurchaseUnit
  stock: number
}

export type PurchaseOrder = {
  id: string
  orgId: string
  hotelId: string
  supplierId: string
  status: PurchaseOrderStatus
  orderNumber: string
  notes?: string | null
  totalEstimated: number
  createdAt: string
}

export type PurchaseOrderLine = {
  id: string
  purchaseOrderId: string
  supplierItemId: string
  ingredientId: string
  requestedQty: number
  receivedQty: number
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
  unitPrice?: number | null
  lineTotal: number
}

function mapHotel(row: any): Hotel {
  return { id: row.id, name: row.name, orgId: row.org_id }
}

function mapIngredient(row: any): Ingredient {
  return {
    id: row.id,
    name: row.name,
    hotelId: row.hotel_id,
    orgId: row.org_id,
    baseUnit: row.base_unit,
    stock: row.stock ?? 0,
  }
}

function mapPurchaseOrder(row: any): PurchaseOrder {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    supplierId: row.supplier_id,
    status: row.status,
    orderNumber: row.order_number,
    notes: row.notes,
    totalEstimated: row.total_estimated ?? 0,
    createdAt: row.created_at,
  }
}

function mapPurchaseOrderLine(row: any): PurchaseOrderLine {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    supplierItemId: row.supplier_item_id,
    ingredientId: row.ingredient_id,
    requestedQty: row.requested_qty,
    receivedQty: row.received_qty,
    purchaseUnit: row.purchase_unit,
    roundingRule: row.rounding_rule,
    packSize: row.pack_size,
    unitPrice: row.unit_price,
    lineTotal: row.line_total ?? 0,
  }
}

export async function listHotels(orgId: string): Promise<Hotel[]> {
  if (!orgId) {
    throw new AppError('ValidationError', 'org_id es obligatorio para listar hoteles', {
      module: 'purchasing',
      operation: 'listHotels',
    })
  }

  logger.info('Listando hoteles', { module: 'purchasing', operation: 'listHotels', orgId })
  const { data, error } = await getSupabaseClient()
    .from('hotels')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  if (error) {
    throw mapSupabaseError(error, { module: 'purchasing', operation: 'listHotels' })
  }
  return data?.map(mapHotel) ?? []
}

export async function listIngredients(orgId: string, hotelId?: string): Promise<Ingredient[]> {
  if (!orgId) {
    throw new AppError('ValidationError', 'org_id es obligatorio para listar ingredientes', {
      module: 'purchasing',
      operation: 'listIngredients',
    })
  }

  logger.info('Listando ingredientes', { module: 'purchasing', operation: 'listIngredients', orgId, hotelId })
  let query = getSupabaseClient().from('ingredients').select('*').eq('org_id', orgId).order('name')
  if (hotelId) query = query.eq('hotel_id', hotelId)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, { module: 'purchasing', operation: 'listIngredients', hotelId })
  }
  return data?.map(mapIngredient) ?? []
}

export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('suppliers').select('*').order('name')
  if (error) {
    throw mapSupabaseError(error, { module: 'purchasing', operation: 'listSuppliers' })
  }
  return (
    data?.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      createdAt: row.created_at,
    })) ?? []
  )
}

export async function listSupplierItems(supplierId: string): Promise<SupplierItem[]> {
  if (!supplierId) {
    throw new AppError('ValidationError', 'supplierId es obligatorio', { module: 'purchasing', operation: 'listSupplierItems' })
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('supplier_items')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('name')
  if (error) {
    throw mapSupabaseError(error, { module: 'purchasing', operation: 'listSupplierItems', supplierId })
  }
  return (
    data?.map((row) => ({
      id: row.id,
      supplierId: row.supplier_id,
      name: row.name,
      orgId: row.org_id || '',
      purchaseUnit: row.purchase_unit,
      packSize: row.pack_size,
      roundingRule: row.rounding_rule,
      pricePerUnit: row.price_per_unit,
      notes: row.notes,
      createdAt: row.created_at,
    })) ?? []
  )
}

export async function createPurchaseOrder(params: {
  orgId: string
  hotelId: string
  supplierId: string
  orderNumber: string
  notes?: string
}): Promise<PurchaseOrder> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      org_id: params.orgId,
      hotel_id: params.hotelId,
      supplier_id: params.supplierId,
      order_number: params.orderNumber,
      status: 'draft',
      notes: params.notes ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw mapSupabaseError(error, {
      module: 'purchasing',
      operation: 'createPurchaseOrder',
      orgId: params.orgId,
      hotelId: params.hotelId
    })
  }

  logger.info('Pedido creado exitosamente', { operation: 'createPurchaseOrder', orderId: data.id, orgId: params.orgId })
  return mapPurchaseOrder(data)
}

export async function addPurchaseOrderLine(params: {
  orgId: string
  purchaseOrderId: string
  supplierItemId: string
  ingredientId: string
  requestedQty: number
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
  unitPrice?: number | null
}): Promise<PurchaseOrderLine> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .insert({
      org_id: params.orgId,
      purchase_order_id: params.purchaseOrderId,
      supplier_item_id: params.supplierItemId,
      ingredient_id: params.ingredientId,
      requested_qty: params.requestedQty,
      purchase_unit: params.purchaseUnit,
      rounding_rule: params.roundingRule,
      pack_size: params.packSize ?? null,
      unit_price: params.unitPrice ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapPurchaseOrderLine(data)
}

export async function listPurchaseOrders(filters?: {
  status?: PurchaseOrderStatus
  hotelId?: string
}): Promise<PurchaseOrder[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.hotelId) query = query.eq('hotel_id', filters.hotelId)
  const { data, error } = await query
  if (error) throw error
  return data?.map(mapPurchaseOrder) ?? []
}

export async function getPurchaseOrderWithLines(
  id: string,
): Promise<{ order: PurchaseOrder; lines: PurchaseOrderLine[] }> {
  if (!id) {
    throw new AppError('ValidationError', 'ID de pedido es obligatorio', { module: 'purchasing', operation: 'getPurchaseOrderWithLines' })
  }
  const supabase = getSupabaseClient()
  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError) {
    throw mapSupabaseError(orderError, { module: 'purchasing', operation: 'getPurchaseOrderWithLines', id })
  }

  if (!order) {
    throw new AppError('NotFoundError', 'Pedido no encontrado', { module: 'purchasing', operation: 'getPurchaseOrderWithLines', id })
  }

  const { data: lines, error: linesError } = await supabase
    .from('purchase_order_lines')
    .select('*')
    .eq('purchase_order_id', id)
    .order('created_at', { ascending: true })

  if (linesError) {
    throw mapSupabaseError(linesError, { module: 'purchasing', operation: 'getPurchaseOrderWithLines', id })
  }

  return { order: mapPurchaseOrder(order), lines: lines?.map(mapPurchaseOrderLine) ?? [] }
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      received_at: status === 'received' ? new Date().toISOString() : null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function receivePurchaseOrder(
  id: string,
  lines: { lineId: string; receivedQty: number }[],
) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('receive_purchase_order', {
    p_order_id: id,
    p_lines: lines.map((l) => ({ line_id: l.lineId, received_qty: l.receivedQty })),
  })
  if (error) throw error
}

// Hooks
export function useHotels() {
  return useQuery({ queryKey: ['hotels'], queryFn: listHotels })
}

export function useIngredients(hotelId?: string) {
  return useQuery({ queryKey: ['ingredients', hotelId], queryFn: () => listIngredients(hotelId) })
}

export function useSuppliersLite() {
  return useQuery({ queryKey: ['suppliers-lite'], queryFn: listSuppliers })
}

export function useSupplierItemsList(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-items', supplierId],
    queryFn: () => listSupplierItems(supplierId ?? ''),
    enabled: Boolean(supplierId),
  })
}

export function usePurchaseOrders(filters?: { status?: PurchaseOrderStatus; hotelId?: string }) {
  return useQuery({
    queryKey: ['purchase_orders', filters],
    queryFn: () => listPurchaseOrders(filters),
  })
}

export function usePurchaseOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['purchase_order', orderId],
    queryFn: () => getPurchaseOrderWithLines(orderId ?? ''),
    enabled: Boolean(orderId),
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  })
}

export function useAddPurchaseOrderLine(orderId: string | undefined) {
  const qc = useQueryClient()
  const supabase = getSupabaseClient()
  return useMutation({
    mutationFn: async (
      params: Omit<Parameters<typeof addPurchaseOrderLine>[0], 'purchaseOrderId' | 'orgId'>,
    ) => {
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('org_id')
        .eq('id', orderId ?? '')
        .single()

      if (poError || !po) {
        throw mapSupabaseError(poError || { code: 'PGRST116', message: 'Pedido no encontrado para obtener orgId' }, {
          module: 'purchasing',
          operation: 'useAddPurchaseOrderLine',
          orderId
        })
      }

      const orgId = po.org_id
      if (!orgId) {
        throw new AppError('ValidationError', 'El pedido no tiene org_id asociado', {
          module: 'purchasing',
          operation: 'useAddPurchaseOrderLine',
          orderId
        })
      }
      return addPurchaseOrderLine({ ...params, purchaseOrderId: orderId ?? '', orgId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_order', orderId] }),
  })
}

export function useUpdatePurchaseOrderStatus(orderId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: PurchaseOrderStatus) => updatePurchaseOrderStatus(orderId ?? '', status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
      qc.invalidateQueries({ queryKey: ['purchase_order', orderId] })
    },
  })
}

export function useReceivePurchaseOrder(orderId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lines: { lineId: string; receivedQty: number }[]) =>
      receivePurchaseOrder(orderId ?? '', lines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
      qc.invalidateQueries({ queryKey: ['purchase_order', orderId] })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}
