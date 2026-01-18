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
describe.sequential('Supabase Inventory RLS', () => {
  const env = loadSupabaseEnv()
  const { admin } = createSupabaseClients(env)
  let appClient: any
  let orgA: Awaited<ReturnType<typeof createOrgUser>>
  let orgB: Awaited<ReturnType<typeof createOrgUser>>
  let alertId: string
  let createExpiryRule: typeof import('@/modules/inventory/data/expiryAlerts').createExpiryRule
  let listExpiryRules: typeof import('@/modules/inventory/data/expiryAlerts').listExpiryRules
  let listExpiryAlerts: typeof import('@/modules/inventory/data/expiryAlerts').listExpiryAlerts
  let dismissExpiryAlert: typeof import('@/modules/inventory/data/expiryAlerts').dismissExpiryAlert
  let createManualEntry: typeof import('@/modules/inventory/data/batches').createManualEntry
  let listBatches: typeof import('@/modules/inventory/data/batches').listBatches
  let listLocations: typeof import('@/modules/inventory/data/batches').listLocations
  let createPreparation: typeof import('@/modules/inventory/data/preparations').createPreparation
  let listPreparations: typeof import('@/modules/inventory/data/preparations').listPreparations
  let createPreparationRun: typeof import('@/modules/inventory/data/preparations').createPreparationRun
  let AppErrorCls: any
  let locationId: string
  let supplierItemId: string
  let prepId: string | undefined
  let manualBatchId: string | undefined

  beforeAll(async () => {
    await resetSupabaseDatabase()
    await ensureSupabaseReady(env.url)
    appClient = await bootstrapAppClient(env)
    const mod = await import('@/modules/inventory/data/expiryAlerts')
    createExpiryRule = mod.createExpiryRule
    listExpiryRules = mod.listExpiryRules
    listExpiryAlerts = mod.listExpiryAlerts
    dismissExpiryAlert = mod.dismissExpiryAlert
    const batches = await import('@/modules/inventory/data/batches')
    createManualEntry = batches.createManualEntry
    listBatches = batches.listBatches
    listLocations = batches.listLocations
    const preps = await import('@/modules/inventory/data/preparations')
    createPreparation = preps.createPreparation
    listPreparations = preps.listPreparations
    createPreparationRun = preps.createPreparationRun
    AppErrorCls = (await import('@/lib/shared/errors')).AppError
    orgA = await createOrgUser(admin, 'invA')
    orgB = await createOrgUser(admin, 'invB')

    // Setup inventory location and supplier item for orgA
    locationId = randomUUID()
    await admin.from('inventory_locations').insert({
      id: locationId,
      org_id: orgA.orgId,
      hotel_id: orgA.hotelId,
      name: 'QA Location A',
    })
    const supplierRes = await admin
      .from('suppliers')
      .insert({ org_id: orgA.orgId, name: 'Inv Supplier A' })
      .select('id')
      .single()
    const supplierId = supplierRes.data?.id as string

    const supplierItemRes = await admin
      .from('supplier_items')
      .insert({
        supplier_id: supplierId,
        name: 'Flour bag',
        purchase_unit: 'kg',
        rounding_rule: 'none',
        price_per_unit: 1.5,
      })
      .select('id')
      .single()
    supplierItemId = supplierItemRes.data?.id as string

    // Rule + batch + alert
    const ruleRes = await admin
      .from('expiry_rules')
      .insert({ org_id: orgA.orgId, days_before: 5, product_type: 'fresh' })
      .select('id')
      .single()
    const ruleId = ruleRes.data?.id as string

    const batchId = randomUUID()
    await admin.from('stock_batches').insert({
      id: batchId,
      org_id: orgA.orgId,
      location_id: locationId,
      supplier_item_id: supplierItemId,
      qty: 10,
      unit: 'kg',
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      lot_code: 'QA-BATCH',
      source: 'purchase',
    })

    const alertRes = await admin
      .from('expiry_alerts')
      .insert({
        org_id: orgA.orgId,
        batch_id: batchId,
        rule_id: ruleId,
        status: 'open',
      })
      .select('id')
      .single()
    alertId = alertRes.data?.id as string
  }, 180_000)

  it('allows owner to list and dismiss expiry alerts', async () => {
    await signInAppUser(appClient, orgA.email, orgA.password)
    try {
      await createExpiryRule({ orgId: orgA.orgId, daysBefore: 5, productType: 'fresh' })
    } catch (err) {
      if (!(err instanceof AppErrorCls) || err.type !== 'ConflictError') throw err
    }

    await dismissExpiryAlert(alertId)
    const check = await admin.from('expiry_alerts').select('status').eq('id', alertId).single()
    expect(check.data?.status).toBe('dismissed')
  })

  it('denies other org from touching alerts', async () => {
    await admin.from('expiry_alerts').update({ status: 'open' }).eq('id', alertId)
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgB.email, orgB.password)
    await expect(listExpiryAlerts({ orgId: orgA.orgId })).rejects.toBeInstanceOf(AppErrorCls)
    await dismissExpiryAlert(alertId).catch(() => {})
    const check = await admin.from('expiry_alerts').select('status').eq('id', alertId).single()
    expect(check.data?.status).toBe('open')
  })

  it('permite entrada manual y listados en ubicaciones propias', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgA.email, orgA.password)

    const expiresAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
    manualBatchId = await createManualEntry({
      orgId: orgA.orgId,
      locationId,
      supplierItemId,
      qty: 5,
      unit: 'kg',
      expiresAt,
      lotCode: 'MANUAL-1',
      source: 'adjustment',
    })

    const batches = await listBatches({ locationId, expiringSoon: true })
    expect(batches.find((b) => b.id === manualBatchId)).toMatchObject({
      lotCode: 'MANUAL-1',
      supplierItemId,
    })

    const search = await listBatches({ locationId, search: 'Flour' })
    expect(search.some((b) => b.id === manualBatchId)).toBe(true)

    const locations = await listLocations(orgA.orgId)
    expect(locations.map((l) => l.id)).toContain(locationId)
  })

  it('deniega ver ubicaciones y lotes de otra organizacion', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgB.email, orgB.password)

    const batches = await listBatches({ locationId, expired: false })
    expect(batches).toEqual([])

    const otherLocations = await listLocations(orgA.orgId)
    expect(otherLocations).toEqual([])
  })

  it('crea preparaciones y runs via RPC respetando RLS', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgA.email, orgA.password)

    await createPreparation({
      orgId: orgA.orgId,
      name: 'Salsa verde QA',
      defaultYieldQty: 10,
      defaultYieldUnit: 'kg',
      shelfLifeDays: 2,
      storage: 'fridge',
      defaultProcessType: 'cooked',
      allergens: 'sulfites',
    })

    const prepRow = await admin
      .from('preparations')
      .select('id')
      .eq('org_id', orgA.orgId)
      .eq('name', 'Salsa verde QA')
      .single()
    prepId = prepRow.data?.id as string
    expect(prepId).toBeTruthy()

    const listed = await listPreparations(orgA.orgId)
    expect(listed.map((p) => p.name)).toContain('Salsa verde QA')

    let run: Awaited<ReturnType<typeof createPreparationRun>>
    try {
      run = await createPreparationRun({
        orgId: orgA.orgId,
        preparationId: prepId,
        locationId,
        producedQty: 4,
        producedUnit: 'kg',
        producedAt: new Date().toISOString(),
        processType: 'cooked',
      })
    } catch (err: any) {
      console.error('createPreparationRun error', err)
      throw err
    }

    expect(run.batchId).toBeTruthy()
    const batches = await listBatches({ locationId })
    expect(batches.some((b) => b.id === run.batchId)).toBe(true)
  })
})
