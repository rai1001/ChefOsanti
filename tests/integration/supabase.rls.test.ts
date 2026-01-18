import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { AppError } from '@/lib/shared/errors'
import {
  bootstrapAppClient,
  createOrgUser,
  createSupabaseClients,
  ensureSupabaseReady,
  loadSupabaseEnv,
  resetSupabaseDatabase,
  signInAppUser,
} from './utils/supabaseTestUtils'

describe.sequential('Supabase RLS end-to-end', () => {
  const env = loadSupabaseEnv()
  const { admin } = createSupabaseClients(env)
  const users: Record<'orgA' | 'orgB', Awaited<ReturnType<typeof createOrgUser>>> = {} as any

  let appClient = null as any
  let listHotelsByOrg: typeof import('@/modules/orgs/data/hotels').listHotelsByOrg
  let createHotel: typeof import('@/modules/orgs/data/hotels').createHotel
  let listExpiryRules: typeof import('@/modules/inventory/data/expiryAlerts').listExpiryRules
  let createExpiryRule: typeof import('@/modules/inventory/data/expiryAlerts').createExpiryRule
  let toggleExpiryRule: typeof import('@/modules/inventory/data/expiryAlerts').toggleExpiryRule
  let listExpiryAlerts: typeof import('@/modules/inventory/data/expiryAlerts').listExpiryAlerts
  const orgData: Record<'orgA' | 'orgB', { supplierId?: string }> = { orgA: {}, orgB: {} }

  beforeAll(async () => {
    await resetSupabaseDatabase()
    await ensureSupabaseReady(env.url)
    appClient = await bootstrapAppClient(env)

    const orgs = await import('@/modules/orgs/data/hotels')
    const inventory = await import('@/modules/inventory/data/expiryAlerts')
    listHotelsByOrg = orgs.listHotelsByOrg
    createHotel = orgs.createHotel
    listExpiryRules = inventory.listExpiryRules
    createExpiryRule = inventory.createExpiryRule
    toggleExpiryRule = inventory.toggleExpiryRule
    listExpiryAlerts = inventory.listExpiryAlerts

    users.orgA = await createOrgUser(admin, 'orgA')
    users.orgB = await createOrgUser(admin, 'orgB')

    // Setup supplier per org for purchasing checks
    const supA = await admin
      .from('suppliers')
      .insert({ org_id: users.orgA.orgId, name: 'QA Supplier A' })
      .select('id')
      .single()
    orgData.orgA.supplierId = supA.data?.id

    await admin
      .from('suppliers')
      .insert({ org_id: users.orgB.orgId, name: 'QA Supplier B' })
      .select('id')
      .single()
  }, 180_000)

  it('enforces org isolation on hotels CRUD', async () => {
    await signInAppUser(appClient, users.orgA.email, users.orgA.password)
    const initial = await listHotelsByOrg(users.orgA.orgId)
    expect(initial.map((h) => h.id)).toContain(users.orgA.hotelId)

    const created = await createHotel({ orgId: users.orgA.orgId, name: 'QA Hotel A' })
    expect(created.orgId).toBe(users.orgA.orgId)

    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgB.email, users.orgB.password)

    const crossRead = await listHotelsByOrg(users.orgA.orgId)
    expect(crossRead).toHaveLength(0)

    await expect(createHotel({ orgId: users.orgA.orgId, name: 'Blocked hotel' })).rejects.toThrow(/row-level security/i)

    const ownHotels = await listHotelsByOrg(users.orgB.orgId)
    expect(ownHotels.length).toBeGreaterThan(0)
  })

  it('restricts expiry rules/alerts to the owning org', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgA.email, users.orgA.password)

    await createExpiryRule({ orgId: users.orgA.orgId, daysBefore: 5, productType: 'fresh' })
    const rules = await listExpiryRules(users.orgA.orgId)
    expect(rules.length).toBeGreaterThan(0)

    const ruleId = rules[0].id
    await toggleExpiryRule({ ruleId, isEnabled: false })
    const toggled = await listExpiryRules(users.orgA.orgId)
    expect(toggled.find((r) => r.id === ruleId)?.isEnabled).toBe(false)

    const alerts = await listExpiryAlerts({ orgId: users.orgA.orgId })
    expect(alerts).toEqual([])

    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgB.email, users.orgB.password)
    expect(await listExpiryRules(users.orgA.orgId)).toEqual([])
    await toggleExpiryRule({ ruleId, isEnabled: true })

    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgA.email, users.orgA.password)
    const after = await listExpiryRules(users.orgA.orgId)
    expect(after.find((r) => r.id === ruleId)?.isEnabled).toBe(false)
  })

  it('blocks cross-org event access and inserts', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgA.email, users.orgA.password)

    const eventId = randomUUID()
    const hotelId = users.orgA.hotelId
    const start = new Date().toISOString()
    const end = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await admin
      .from('events')
      .insert({
        id: eventId,
        org_id: users.orgA.orgId,
        hotel_id: hotelId,
        title: 'QA Event A',
        starts_at: start,
        ends_at: end,
        status: 'confirmed',
      })

    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgB.email, users.orgB.password)
    const { data } = await appClient.from('events').select('id').eq('id', eventId)
    expect(data ?? []).toHaveLength(0)

    const createOtherOrg = await appClient
      .from('events')
      .insert({
        id: randomUUID(),
        org_id: users.orgA.orgId,
        hotel_id: hotelId,
        title: 'Blocked',
        starts_at: start,
        ends_at: end,
        status: 'confirmed',
      })
    expect(createOtherOrg.error?.message ?? '').toMatch(/row-level security|violates|not found|mismatch/i)
  })

  it('enforces purchasing RLS between orgs', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, users.orgB.email, users.orgB.password)

    const poAttempt = await appClient.from('purchase_orders').insert({
      org_id: users.orgA.orgId,
      hotel_id: users.orgA.hotelId,
      supplier_id: orgData.orgA.supplierId,
      status: 'draft',
      order_number: 'PO-X',
    })
    expect(poAttempt.error?.message ?? '').toMatch(/row-level security|violates|mismatch/i)

    const { data } = await appClient.from('purchase_orders').select('id').eq('org_id', users.orgA.orgId)
    expect(data ?? []).toHaveLength(0)
  })
})
