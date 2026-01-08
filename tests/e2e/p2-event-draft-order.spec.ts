import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

test('P2: genera pedido borrador agrupado por proveedor', async ({ page }) => {
  const email = `e2e+p2orders+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const eventId = randomUUID()
  const serviceId = randomUUID()
  const supplierId = randomUUID()
  const supplierItemId = randomUUID()
  const templateId = randomUUID()
  const templateItemId = randomUUID()
  const templateName = `Plantilla P2 ${Date.now()}`
  const templateItemName = 'Item P2 Draft'

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org P2', slug: `org-p2-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel P2' })
  await admin.from('events').insert({
    id: eventId,
    org_id: orgId,
    hotel_id: hotelId,
    title: 'Evento P2',
    status: 'confirmed',
  })
  await admin.from('event_services').insert({
    id: serviceId,
    org_id: orgId,
    event_id: eventId,
    service_type: 'coffee_break',
    format: 'de_pie',
    starts_at: new Date().toISOString(),
    pax: 30,
  })

  await admin.from('suppliers').insert({ id: supplierId, org_id: orgId, name: 'Proveedor P2' })
  await admin.from('supplier_items').insert({
    id: supplierItemId,
    supplier_id: supplierId,
    name: 'Item proveedor P2',
    purchase_unit: 'ud',
    rounding_rule: 'ceil_unit',
  })

  await admin.from('menu_templates').insert({
    id: templateId,
    org_id: orgId,
    name: templateName,
    category: 'coffee_break',
  })
  await admin.from('menu_template_items').insert({
    id: templateItemId,
    org_id: orgId,
    template_id: templateId,
    name: templateItemName,
    unit: 'ud',
    qty_per_pax_seated: 0,
    qty_per_pax_standing: 1,
    rounding_rule: 'ceil_unit',
  })
  await admin.from('event_service_menus').insert({
    org_id: orgId,
    event_service_id: serviceId,
    template_id: templateId,
  })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  await page.goto(`/events/${eventId}`)
  await expect(page.getByText('Pedidos borrador')).toBeVisible()
  await expect(page.getByText(templateItemName).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Generar pedido borrador/i })).toBeEnabled()

  await page.getByRole('button', { name: /Generar pedido borrador/i }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByText('Items sin mapping')).toBeVisible()
  const select = modal.getByLabel(`Mapear ${templateItemName}`)
  await select.selectOption({ value: supplierItemId })
  await modal.getByRole('button', { name: /Guardar alias/i }).click()

  await expect(modal.getByText('Item P2 Draft').first()).toBeVisible()
  await expect(modal.getByRole('button', { name: /Crear borradores/i })).toBeEnabled()
  await modal.getByRole('button', { name: /Crear borradores/i }).click()
  await expect(page.getByText(/Pedidos creados/)).toBeVisible()

  await page.goto('/purchasing/event-orders')
  const expectedOrder = `EV-${eventId.slice(0, 6)}-1`
  await expect(page.getByText(expectedOrder)).toBeVisible({ timeout: 15000 })
  await page.getByRole('link', { name: expectedOrder }).click()
  await expect(page.getByText(templateItemName)).toBeVisible()
})
