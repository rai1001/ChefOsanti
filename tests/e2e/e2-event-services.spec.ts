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

test('E2: crear evento y añadir servicio', async ({ page }) => {
  const email = `e2e+services+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const eventTitle = `Evento Servicios ${Date.now()}`

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org E2E Services', slug: `org-e2e-services-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel Servicios E2E' })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })

  // Crear evento
  await page.goto('/events/new')
  await page.getByLabel('Hotel').selectOption({ label: 'Hotel Servicios E2E' })
  await page.getByLabel('Titulo').fill(eventTitle)
  await page.getByLabel('Estado').selectOption({ value: 'confirmed' })
  await page.getByRole('button', { name: /Crear evento/i }).click()

  await page.waitForURL(/\/events\/.+/)
  await expect(page.getByRole('heading', { name: new RegExp(eventTitle, 'i') })).toBeVisible()

  // Añadir servicio
  const serviceForm = page.locator('form').nth(1)
  const start = toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  const end = toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000))
  await serviceForm.getByLabel('Tipo de servicio').selectOption({ value: 'cena' })
  await serviceForm.getByLabel('Inicio').fill(start)
  await serviceForm.getByLabel('Fin (opcional)').fill(end)
  await serviceForm.getByLabel('Pax').fill('50')
  await serviceForm.getByLabel('Formato').selectOption({ value: 'sentado' })
  await serviceForm.getByRole('button', { name: /Anadir servicio/i }).click()

  const serviceRow = page.locator('div').filter({ hasText: /cena/i }).first()
  await expect(serviceRow).toBeVisible()
  await expect(serviceRow.getByText(/50 pax/i)).toBeVisible()
})
