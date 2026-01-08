import { test, expect } from '@playwright/test'
import { createUserWithRetry, getAnonStorageKey, getServiceClients, injectSession, signInWithRetry } from './utils/auth'

const ORG_VIP = '00000000-0000-0000-0000-000000000001'
const ORG_BASIC = '00000000-0000-0000-0000-000000000002'

test.describe('AI Access Control', () => {
  test('usuario plan basic ve botones deshabilitados', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+ai-basic+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    await admin
      .from('org_memberships')
      .insert({ org_id: ORG_BASIC, user_id: user.id, role: 'manager', is_active: true })
      .select()

    const session = await signInWithRetry(anon, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: ORG_BASIC })

    await page.goto('/dashboard')
    await expect(page.getByTestId('ai-access-panel')).toBeVisible()
    await expect(page.getByTestId('btn-daily_brief')).toBeDisabled()
    await expect(page.getByTestId('btn-ocr_review')).toBeDisabled()
    await expect(page.getByTestId('btn-order_audit')).toBeDisabled()
  })

  test('admin vip puede usar order_audit', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()
    const email = `e2e+ai-vip+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const user = await createUserWithRetry(admin, email, password)
    await admin
      .from('org_memberships')
      .insert({ org_id: ORG_VIP, user_id: user.id, role: 'admin', is_active: true })
      .select()

    const session = await signInWithRetry(anon, email, password)
    const storageKey = getAnonStorageKey(url, anon)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })
    await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: ORG_VIP })

    await page.goto('/dashboard')
    await expect(page.getByTestId('ai-access-panel')).toBeVisible()
    await expect(page.getByTestId('btn-order_audit')).toBeEnabled({ timeout: 10000 })
  })
})
