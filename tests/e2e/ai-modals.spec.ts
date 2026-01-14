import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { createUserWithRetry, getAnonStorageKey, getServiceClients, injectSession, signInWithRetry } from './utils/auth'
import { mockEdgeFunction } from './utils/edge'

async function setupOrg({ admin, userId }: { admin: any; userId: string }) {
  const orgId = randomUUID()
  const hotelId = randomUUID()

  await admin.from('orgs').insert({ id: orgId, name: 'Org E2E AI', slug: `org-ai-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: userId, role: 'admin', is_active: true })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel AI' })

  return { orgId, hotelId }
}

async function setupOrder({
  admin,
  orgId,
  hotelId,
}: {
  admin: any
  orgId: string
  hotelId: string
}) {
  const supplierId = randomUUID()
  const orderId = randomUUID()
  const orderNumber = `PO-AI-${Date.now()}`

  await admin.from('suppliers').insert({ id: supplierId, org_id: orgId, name: 'Proveedor AI' })
  await admin.from('purchase_orders').insert({
    id: orderId,
    org_id: orgId,
    hotel_id: hotelId,
    supplier_id: supplierId,
    status: 'confirmed',
    order_number: orderNumber,
    total_estimated: 0,
  })

  return { orderId, orderNumber }
}

test.describe('Dashboard AI Modals', () => {
  test('daily brief shows content', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+brief+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    const { orgId } = await setupOrg({ admin, userId: user.id })

    await mockEdgeFunction(page, 'daily_brief', {
      payload: { content: 'Brief OK' },
    })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Generar Daily Brief/i }).click()

    await expect(page.getByText('Daily Brief (IA)')).toBeVisible()
    await expect(page.getByText('Brief OK')).toBeVisible()
  })

  test('daily brief shows error on failure', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+brief-err+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    const { orgId } = await setupOrg({ admin, userId: user.id })

    await mockEdgeFunction(page, 'daily_brief', {
      status: 500,
      payload: 'failure',
    })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Generar Daily Brief/i }).click()

    await expect(page.getByText(/Error:/i)).toBeVisible()
  })

  test('order audit shows result', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+audit+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    const { orgId, hotelId } = await setupOrg({ admin, userId: user.id })
    const { orderNumber } = await setupOrder({ admin, orgId, hotelId })

    await mockEdgeFunction(page, 'order_audit', {
      payload: { status: 'ok', findings: [] },
    })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

    await page.goto('/dashboard')
    await expect(page.getByText(new RegExp(orderNumber, 'i'))).toBeVisible()
    await page.getByRole('button', { name: /Auditar Pedidos/i }).click()

    await expect(page.getByText('Auditoria IA')).toBeVisible()
    await expect(page.getByText(/Estado: Correcto/i)).toBeVisible()
  })

  test('order audit shows error on failure', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+audit-err+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    const { orgId, hotelId } = await setupOrg({ admin, userId: user.id })
    const { orderNumber } = await setupOrder({ admin, orgId, hotelId })

    await mockEdgeFunction(page, 'order_audit', {
      status: 500,
      payload: 'failure',
    })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

    await page.goto('/dashboard')
    await expect(page.getByText(new RegExp(orderNumber, 'i'))).toBeVisible()
    await page.getByRole('button', { name: /Auditar Pedidos/i }).click()

    await expect(page.getByText(/Error:/i)).toBeVisible()
  })
})
