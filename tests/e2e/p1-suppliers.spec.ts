import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

test('P1: crear proveedor y artículo', async ({ page }) => {
  const email = `e2e+p1+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({
    id: orgId,
    name: 'Org E2E',
    slug: `org-e2e-${orgId.slice(0, 6)}`,
  })

  await admin.from('org_memberships').insert({
    org_id: orgId,
    user_id: user.id,
    role: 'admin',
  })

  const session = await signInWithRetry(anon, email, password)

  await injectSession(page, storageKey, session, url, anonKey, { email, password })

  await page.goto('/purchasing/suppliers')

  await expect(page.getByRole('heading', { name: /Proveedores/i })).toBeVisible()

  await page.getByLabel('Nombre').fill('E2E Proveedor')
  await page.getByRole('button', { name: /Crear proveedor/i }).click()
  await expect(page.getByText('E2E Proveedor')).toBeVisible()
  await page.getByText('E2E Proveedor').click()

  await expect(page.getByRole('heading', { name: /E2E Proveedor/i })).toBeVisible()

  await page.getByLabel('Nombre').fill('E2E Item')
  await page.getByLabel('Unidad de compra').selectOption('ud')
  await page.getByLabel('Regla de redondeo').selectOption('ceil_unit')
  await page.getByLabel('Precio por unidad (EUR)').fill('1.50')
  await page.getByRole('button', { name: /Añadir artículo/i }).click()

  await expect(page.getByText('E2E Item')).toBeVisible()
})
