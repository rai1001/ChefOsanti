import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

test('E4: overrides recalculan necesidades', async ({ page }) => {
  const email = `e2e+overrides+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const eventId = randomUUID()
  const serviceId = randomUUID()
  const templateName = `Plantilla ${Date.now()}`
  const templateItemName = 'Item base E4'
  const customItemName = 'E2E Extra'
  const replacementName = 'E2E Reemplazo'

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org E4', slug: `org-e4-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel E4' })
  await admin.from('events').insert({
    id: eventId,
    org_id: orgId,
    hotel_id: hotelId,
    title: 'Evento E4',
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
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  // Crear plantilla e item base
  await page.goto('/menus')
  await page.getByLabel('Nombre').fill(templateName)
  await page.getByLabel('Categoria').selectOption({ value: 'coffee_break' })
  await page.getByRole('button', { name: /Crear/i }).click()
  await page.getByRole('link', { name: templateName }).click()
  await expect(page.getByRole('heading', { name: templateName })).toBeVisible()

  await page.getByLabel('Nombre').fill(templateItemName)
  await page.getByLabel('Qty/pax sentado').fill('1')
  await page.getByLabel('Qty/pax de pie').fill('2')
  await page.getByLabel('Redondeo').selectOption({ value: 'ceil_unit' })
  await page.getByRole('button', { name: /Agregar item/i }).click()
  await expect(page.getByText(templateItemName)).toBeVisible()

  // Aplicar plantilla al servicio
  await page.goto(`/events/${eventId}`)
  let serviceSection = page.locator('div', { hasText: /coffee_break/i }).first()
  await serviceSection.getByLabel('Plantilla').selectOption({ label: templateName })
  await expect(
    serviceSection.getByText(`Menu aplicado: ${templateName}`, { exact: false }),
  ).toBeVisible({ timeout: 10000 })

  const needsCard = serviceSection.locator('h4', { hasText: 'Necesidades' }).locator('..').locator('..')
  await expect(needsCard.getByText(templateItemName)).toBeVisible()
  await expect(needsCard.getByText(/100/)).toBeVisible() // 2 * 50 pax

  // Excluir item de plantilla
  const modCard = serviceSection.locator('h3', { hasText: 'Modificaciones' }).locator('..').locator('..')
  const firstItemBlock = modCard.locator('div').filter({ hasText: templateItemName }).first()
  await firstItemBlock.getByRole('button', { name: /Quitar/ }).click()
  await expect(needsCard.getByText(templateItemName)).toHaveCount(0)

  // Añadir item personalizado
  const customCard = serviceSection.locator('h4', { hasText: 'Items personalizados' }).locator('..')
  await customCard.getByLabel('Nombre').fill(customItemName)
  await customCard.getByLabel('Qty/pax de pie').fill('1')
  await customCard.getByLabel('Redondeo').selectOption({ value: 'ceil_unit' })
  await customCard.getByRole('button', { name: /Anadir item/i }).click()
  const extraRow = needsCard.locator('div', { hasText: customItemName }).last()
  await expect(extraRow).toBeVisible()
  await expect(extraRow.getByText(/50\.00/)).toBeVisible()

  // Restaurar y sustituir item original
  await firstItemBlock.getByRole('button', { name: /Restaurar/ }).click()
  await firstItemBlock.getByRole('button', { name: /Sustituir/ }).click()
  const replaceForm = serviceSection.locator('form').filter({ hasText: 'Guardar sustitucion' }).first()
  await replaceForm.getByLabel('Nombre').fill(replacementName)
  await replaceForm.getByLabel('Qty/pax de pie').fill('1')
  await replaceForm.getByLabel('Redondeo').selectOption({ value: 'ceil_unit' })
  await replaceForm.getByRole('button', { name: /Guardar sustitucion/i }).click()

  const replacementRow = needsCard.locator('div', { hasText: replacementName }).last()
  await expect(replacementRow).toBeVisible()
  await expect(replacementRow.getByText(/50\.00/)).toBeVisible()
  await expect(needsCard.getByText(templateItemName)).toHaveCount(0)

  // Notas
  const notesCard = serviceSection.locator('h4', { hasText: 'Notas' }).locator('..')
  await notesCard.getByPlaceholder('Alergias u observaciones').fill('Nota e2e')
  await notesCard.getByRole('button', { name: /Anadir nota/i }).click()
  await expect(notesCard.getByText('Nota e2e')).toBeVisible()
})
