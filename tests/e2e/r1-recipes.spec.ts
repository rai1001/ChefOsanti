import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

test('R1: productos y recetas basicos', async ({ page }) => {
  const email = `e2e+r1+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const productName = `E2E Producto ${Date.now()}`
  const recipeName = `E2E Receta ${Date.now()}`

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org R1', slug: `org-r1-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel R1' })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  await admin
    .from('products')
    .insert({ org_id: orgId, name: productName, base_unit: 'ud', active: true })
    .throwOnError()

  await page.goto('/products')
  await expect(page.getByRole('heading', { name: /^Productos$/i })).toBeVisible()
  await expect(page.getByText(productName)).toBeVisible({ timeout: 15000 })

  await page.goto('/recipes')
  await expect(page.getByRole('heading', { name: /Recetas por organizacion/i })).toBeVisible()
  await page.getByLabel('Nombre').fill(recipeName)
  await page.getByLabel('Raciones base').fill('10')
  await page.getByRole('button', { name: 'Crear' }).click()

  const recipeLink = page.getByRole('link', { name: recipeName })
  await expect(recipeLink).toBeVisible({ timeout: 15000 })
  await recipeLink.click()
  await expect(page.getByText(recipeName)).toBeVisible({ timeout: 15000 })

  await page.getByLabel('Producto').selectOption({ label: `${productName} (ud)` })
  await page.getByLabel('Cantidad').fill('2')
  await page.getByRole('button', { name: /Añadir|Anadir/ }).click()
  await expect(page.getByText(productName).nth(0)).toBeVisible()
})
