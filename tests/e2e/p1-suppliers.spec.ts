import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'supabase/.env' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan variables SUPABASE_URL/ANON/SERVICE_ROLE para e2e.')
}

test('P1: crear proveedor y artículo', async ({ page }) => {
  const email = `e2e+p1+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const possibleKeys = [
    (anon.auth as any).storageKey,
    `sb-${new URL(SUPABASE_URL).host}-auth-token`,
    `sb-${new URL(SUPABASE_URL).hostname}-auth-token`,
    'sb-ChefOs-main-auth-token',
  ].filter(Boolean)

  const { data: userData, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createUserError || !userData.user) {
    throw createUserError || new Error('No se pudo crear usuario de prueba')
  }

  const userId = userData.user.id

  const { error: orgError } = await admin.from('orgs').insert({
    id: orgId,
    name: 'Org E2E',
    slug: `org-e2e-${orgId.slice(0, 6)}`,
  })
  if (orgError) {
    throw orgError
  }

  const { error: membershipError } = await admin.from('org_memberships').insert({
    org_id: orgId,
    user_id: userId,
    role: 'owner',
  })
  if (membershipError) {
    throw membershipError
  }

  const { data: sessionData, error: signinError } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signinError || !sessionData.session) {
    throw signinError || new Error('No se pudo iniciar sesión en e2e')
  }

  await page.addInitScript(({ keys, session }) => {
    ;(window as any).__E2E_SESSION__ = session
    keys.forEach((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ currentSession: session, expiresAt: session?.expires_at }),
      )
    })
  }, { keys: possibleKeys, session: sessionData.session })

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
