import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

function toLocalInput(dt: Date) {
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

test('E3: aplicar plantilla y ver necesidades por pax', async ({ page }) => {
  const email = `e2e+menus+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const eventId = randomUUID()
  const serviceId = randomUUID()
  const templateName = `Plantilla ${Date.now()}`

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org E3', slug: `org-e3-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel E3' })
  await admin.from('events').insert({
    id: eventId,
    org_id: orgId,
    hotel_id: hotelId,
    title: 'Evento E3',
    status: 'confirmed',
  })
  await admin.from('event_services').insert({
    id: serviceId,
    org_id: orgId,
    event_id: eventId,
    service_type: 'coffee_break',
    format: 'de_pie',
    starts_at: new Date().toISOString(),
    pax: 50,
  })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => org && localStorage.setItem('activeOrgId', org), { org: orgId })

  // Crear plantilla
  await page.goto('/menus')
  await page.getByLabel('Nombre').fill(templateName)
  await page.getByLabel('Categoria').selectOption({ value: 'coffee_break' })
  await page.getByRole('button', { name: /Crear/i }).click()

  await page.getByRole('link', { name: templateName }).click()
  await expect(page.getByRole('heading', { name: templateName })).toBeVisible()

  // Añadir item con ratios
  await page.getByLabel('Nombre').fill('Item E3')
  await page.getByLabel('Qty/pax sentado').fill('1')
  await page.getByLabel('Qty/pax de pie').fill('2')
  await page.getByLabel('Redondeo').selectOption({ value: 'ceil_unit' })
  await page.getByRole('button', { name: /Agregar item/i }).click()
  await expect(page.getByText(/Item E3/)).toBeVisible()

  // Abrir servicio y aplicar plantilla
  await page.goto(`/events/${eventId}`)
  const serviceSection = page.locator('div', { hasText: /coffee_break/i }).first()
  await serviceSection.getByLabel('Plantilla').selectOption({ label: templateName })
  const needRow = page.getByText(/Item E3/i).first()
  await expect(needRow).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Unidad ud - Cantidad: 100.00', { exact: true })).toBeVisible({
    timeout: 15000,
  }) // 2 * 50 pax
})
