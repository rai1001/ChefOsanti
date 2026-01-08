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

test('E1: crear salón, evento y reserva', async ({ page }) => {
  const email = `e2e+events+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org E2E Eventos', slug: `org-e2e-events-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel E2E Eventos' })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })

  // ir al tablero y crear salón
  await page.goto('/events')
  await page.getByRole('combobox').first().selectOption(hotelId)
  await page.getByPlaceholder('Nombre').fill('Sala E2E')
  await page.getByPlaceholder('Capacidad').fill('50')
  await page.getByRole('button', { name: /Crear sal/i }).click()
  await expect(page.getByText(/Sala E2E/i)).toBeVisible()

  // crear evento
  await page.getByRole('link', { name: /Nuevo evento/i }).click()
  await page.getByLabel('Hotel').selectOption({ label: 'Hotel E2E Eventos' })
  await page.getByLabel('Titulo').fill('Evento E2E')
  await page.getByLabel('Estado').selectOption({ value: 'confirmed' })
  await page.getByRole('button', { name: /Crear evento/i }).click()

  await page.waitForURL(/\/events\/.+/)
  await expect(page.getByRole('heading', { name: /Evento E2E/i })).toBeVisible()

  // crear reserva
  const start = toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  const end = toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000))
  const bookingForm = page.locator('form').first()
  await bookingForm.getByLabel('Salon').selectOption({ label: 'Sala E2E' })
  await bookingForm.getByLabel('Inicio').fill(start)
  await bookingForm.getByLabel('Fin').fill(end)
  await bookingForm.getByRole('button', { name: /Anadir reserva/i }).click()

  const bookingRow = page.locator('div').filter({ hasText: /Sala E2E/ }).first()
  await expect(bookingRow).toBeVisible()
  await expect(bookingRow.getByRole('button', { name: /Borrar/i })).toBeVisible()
})
