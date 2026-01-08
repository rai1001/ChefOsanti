import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

function currentWeekStartIso() {
  const now = new Date()
  const dow = (now.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow))
  return monday.toISOString().slice(0, 10)
}

test('Dashboard semanal muestra eventos, pedidos pendientes y notas persistentes', async ({ page }) => {
  const { admin, anon, anonKey, url } = getServiceClients()
  const email = `e2e+dash+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const supplierId = randomUUID()
  const eventId = randomUUID()
  const serviceId = randomUUID()
  const purchaseOrderId = randomUUID()
  const weekStart = currentWeekStartIso()
  const eventStart = `${weekStart}T10:00:00Z`

  const user = await createUserWithRetry(admin, email, password)

  await admin.from('orgs').insert({ id: orgId, name: 'Org Dashboard', slug: `org-dash-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({
    id: hotelId,
    org_id: orgId,
    name: 'Hotel Dashboard',
    city: 'Madrid',
    country: 'ES',
    currency: 'EUR',
  })
  await admin.from('suppliers').insert({ id: supplierId, org_id: orgId, name: 'Proveedor Dash' })
  await admin.from('events').insert({
    id: eventId,
    org_id: orgId,
    hotel_id: hotelId,
    title: 'Evento Dashboard',
    status: 'confirmed',
    starts_at: eventStart,
    ends_at: `${weekStart}T18:00:00Z`,
  })
  await admin.from('event_services').insert({
    id: serviceId,
    org_id: orgId,
    event_id: eventId,
    service_type: 'cena',
    format: 'sentado',
    starts_at: `${weekStart}T20:00:00Z`,
    pax: 50,
  })
  await admin.from('purchase_orders').insert({
    id: purchaseOrderId,
    org_id: orgId,
    hotel_id: hotelId,
    supplier_id: supplierId,
    status: 'confirmed',
    order_number: 'PO-DASH-01',
    total_estimated: 120,
    created_at: `${weekStart}T08:00:00Z`,
  })

  const session = await signInWithRetry(anon, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: /Dashboard semanal/i })).toBeVisible()
  await expect(page.getByText('Evento Dashboard').first()).toBeVisible()
  await expect(page.getByText('PO-DASH-01')).toBeVisible()

  const noteArea = page.getByPlaceholder(/Anota recordatorios/i)
  await noteArea.fill('Nota e2e dashboard')
  await expect(page.getByText(/Guardando|Guardado/i)).toBeVisible()
  await expect(page.getByText('Guardado')).toBeVisible()
  await expect
    .poll(async () => {
      const { data } = await admin
        .from('dashboard_notes')
        .select('content')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle()
      return data?.content
    })
    .toBe('Nota e2e dashboard')

  await page.reload()
  await expect(noteArea).toHaveValue('Nota e2e dashboard')
})
