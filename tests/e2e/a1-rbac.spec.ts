import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

async function loginWithRole(page: Page, role: 'admin' | 'manager' | 'staff') {
  const email = `e2e+rbac+${role}+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const { admin, anon, anonKey, url } = getServiceClients()

  const user = await createUserWithRetry(admin, email, password)
  await admin.from('orgs').insert({
    id: orgId,
    name: `Org ${role}`,
    slug: `org-${role}-${orgId.slice(0, 6)}`,
  })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role })

  const session = await signInWithRetry(anon, email, password)
  const storageKey = getAnonStorageKey(url, anon)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
}

test('staff ve dashboard pero 403 en menus', async ({ page }) => {
  await loginWithRole(page, 'staff')
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible()

  await page.goto('/menus')
  await expect(page.getByText('Acceso denegado')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Menus' })).toHaveCount(0)
})

test('manager puede ver menus', async ({ page }) => {
  await loginWithRole(page, 'manager')
  await page.goto('/menus')
  await expect(page.getByRole('heading', { name: /Plantillas/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Menus' })).toBeVisible()
})

test('admin ve todo el menu', async ({ page }) => {
  await loginWithRole(page, 'admin')
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Personal' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Pedidos$/ })).toBeVisible()
})
