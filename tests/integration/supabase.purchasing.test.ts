import { beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  bootstrapAppClient,
  createOrgUser,
  createSupabaseClients,
  ensureSupabaseReady,
  loadSupabaseEnv,
  resetSupabaseDatabase,
  signInAppUser,
} from './utils/supabaseTestUtils'
describe.sequential('Supabase Purchasing RLS', () => {
  const env = loadSupabaseEnv()
  const { admin } = createSupabaseClients(env)
  let appClient: any
  let orgA: Awaited<ReturnType<typeof createOrgUser>>
  let orgB: Awaited<ReturnType<typeof createOrgUser>>
  let supplierA: string
  let createPurchaseOrder: typeof import('@/modules/purchasing/data/orders').createPurchaseOrder
  let listPurchaseOrders: typeof import('@/modules/purchasing/data/orders').listPurchaseOrders
  let listIngredients: typeof import('@/modules/purchasing/data/orders').listIngredients
  let listHotels: typeof import('@/modules/purchasing/data/orders').listHotels
  let addPurchaseOrderLine: typeof import('@/modules/purchasing/data/orders').addPurchaseOrderLine
  let getPurchaseOrderWithLines: typeof import('@/modules/purchasing/data/orders').getPurchaseOrderWithLines
  let updatePurchaseOrderStatus: typeof import('@/modules/purchasing/data/orders').updatePurchaseOrderStatus
  let receivePurchaseOrder: typeof import('@/modules/purchasing/data/orders').receivePurchaseOrder
  let insertSupplier: typeof import('@/modules/purchasing/data/suppliers').insertSupplier
  let insertSupplierItem: typeof import('@/modules/purchasing/data/suppliers').insertSupplierItem
  let listSupplierItemsByOrg: typeof import('@/modules/purchasing/data/suppliers').listSupplierItemsByOrg
  let listSupplierLeadTimes: typeof import('@/modules/purchasing/data/suppliers').listSupplierLeadTimes
  let updateSupplierLeadTime: typeof import('@/modules/purchasing/data/suppliers').updateSupplierLeadTime
  let upsertSupplierLeadTime: typeof import('@/modules/purchasing/data/suppliers').upsertSupplierLeadTime
  let AppErrorCls: any
  let ingredientId: string
  let poId: string
  let poLineId: string

  beforeAll(async () => {
    await resetSupabaseDatabase()
    await ensureSupabaseReady(env.url)
    appClient = await bootstrapAppClient(env)
    const mod = await import('@/modules/purchasing/data/orders')
    createPurchaseOrder = mod.createPurchaseOrder
    listPurchaseOrders = mod.listPurchaseOrders
    listIngredients = mod.listIngredients
    listHotels = mod.listHotels
    addPurchaseOrderLine = mod.addPurchaseOrderLine
    getPurchaseOrderWithLines = mod.getPurchaseOrderWithLines
    updatePurchaseOrderStatus = mod.updatePurchaseOrderStatus
    receivePurchaseOrder = mod.receivePurchaseOrder
    const suppliersMod = await import('@/modules/purchasing/data/suppliers')
    insertSupplier = suppliersMod.insertSupplier
    insertSupplierItem = suppliersMod.insertSupplierItem
    listSupplierItemsByOrg = suppliersMod.listSupplierItemsByOrg
    listSupplierLeadTimes = suppliersMod.listSupplierLeadTimes
    updateSupplierLeadTime = suppliersMod.updateSupplierLeadTime
    upsertSupplierLeadTime = suppliersMod.upsertSupplierLeadTime
    AppErrorCls = (await import('@/lib/shared/errors')).AppError
    orgA = await createOrgUser(admin, 'poA')
    orgB = await createOrgUser(admin, 'poB')

    await signInAppUser(appClient, orgA.email, orgA.password)

    const supplier = await insertSupplier({ orgId: orgA.orgId, name: 'PO Supplier A', leadTimeDays: 2 })
    supplierA = supplier.id
    const item = await insertSupplierItem({
      supplierId: supplierA,
      name: 'Tomate lata',
      purchaseUnit: 'kg',
      roundingRule: 'none',
      packSize: 5,
      pricePerUnit: 3.2,
      productTypeOverride: 'fresh',
      leadTimeDaysOverride: 3,
    })

    const ingredientRes = await appClient
      .from('ingredients')
      .insert({
        org_id: orgA.orgId,
        hotel_id: orgA.hotelId,
        name: 'Tomate QA',
        base_unit: 'kg',
        stock: 0,
      })
      .select('id')
      .single()
    ingredientId = ingredientRes.data?.id as string

    const order = await createPurchaseOrder({
      orgId: orgA.orgId,
      hotelId: orgA.hotelId,
      supplierId: supplierA,
      orderNumber: 'PO-QA-INIT',
      notes: 'primer pedido',
    })
    poId = order.id

    const line = await addPurchaseOrderLine({
      orgId: orgA.orgId,
      purchaseOrderId: poId,
      supplierItemId: item.id,
      ingredientId,
      requestedQty: 10,
      purchaseUnit: 'kg',
      roundingRule: 'none',
      packSize: 5,
      unitPrice: 2.5,
    })
    poLineId = line.id
  }, 180_000)

  it('gestiona proveedores y lead times en la org', async () => {
    await signInAppUser(appClient, orgA.email, orgA.password)

    const suppliers = await admin.from('suppliers').select('id').eq('org_id', orgA.orgId)
    expect((suppliers.data ?? []).map((s) => s.id)).toContain(supplierA)

    const items = await admin.from('supplier_items').select('id, product_type_override').eq('supplier_id', supplierA)
    expect(items.data?.[0]?.product_type_override).toBe('fresh')

    const itemsByOrg = await listSupplierItemsByOrg(orgA.orgId)
    expect(itemsByOrg.some((it) => it.supplierId === supplierA)).toBe(true)

    const updated = await updateSupplierLeadTime({ supplierId: supplierA, leadTimeDays: 5 })
    expect(updated.leadTimeDays).toBe(5)

    const lead = await upsertSupplierLeadTime({
      orgId: orgA.orgId,
      supplierId: supplierA,
      productType: 'fresh',
      leadTimeDays: 4,
    })
    expect(lead.leadTimeDays).toBe(4)

    const leadTimes = await listSupplierLeadTimes(supplierA)
    expect(leadTimes.map((lt) => lt.productType)).toContain('fresh')
  })

  it('CRUD y recepcion de purchase orders actualiza stock', async () => {
    await signInAppUser(appClient, orgA.email, orgA.password)
    const hotels = await listHotels(orgA.orgId)
    expect(hotels.map((h) => h.id)).toContain(orgA.hotelId)

    const ingredients = await listIngredients(orgA.orgId, orgA.hotelId)
    expect(ingredients.map((i) => i.id)).toContain(ingredientId)

    const { order, lines } = await getPurchaseOrderWithLines(poId)
    expect(order.id).toBe(poId)
    expect(lines.map((l) => l.id)).toContain(poLineId)

    const list = await listPurchaseOrders(orgA.orgId)
    expect(list.map((o) => o.id)).toContain(poId)

    await updatePurchaseOrderStatus(poId, 'ordered')
    await receivePurchaseOrder(poId, [{ lineId: poLineId, receivedQty: 10 }])

    const received = await getPurchaseOrderWithLines(poId)
    expect(received.order.status).toBe('received')
    expect(received.order.receivedState).toBe('full')

    const ingredientStock = await appClient.from('ingredients').select('stock').eq('id', ingredientId).single()
    expect(Number(ingredientStock.data?.stock ?? 0)).toBeGreaterThanOrEqual(10)

    const receivedList = await listPurchaseOrders(orgA.orgId, { status: 'received', hotelId: orgA.hotelId })
    expect(receivedList.map((o) => o.id)).toContain(poId)
  })

  it('bloquea inserts y visibilidad entre organizaciones', async () => {
    await signInAppUser(appClient, orgB.email, orgB.password)
    await expect(
      createPurchaseOrder({
        orgId: orgA.orgId,
        hotelId: orgA.hotelId,
        supplierId: supplierA,
        orderNumber: 'PO-BLOCK',
      }),
    ).rejects.toBeInstanceOf(AppErrorCls)

    const list = await listPurchaseOrders(orgA.orgId)
    expect(list).toEqual([])
  })
})
