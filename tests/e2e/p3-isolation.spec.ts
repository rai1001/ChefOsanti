import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

test('P3: Aislamiento de datos entre organizaciones', async ({ page }) => {
    const { admin, anon, anonKey, url } = getServiceClients()

    // --- Setup Org A ---
    const orgA = randomUUID()
    const userAEmail = `e2e+isoA+${Date.now()}@chefos.test`
    const userAPass = 'Test1234!'
    const userA = await createUserWithRetry(admin, userAEmail, userAPass)
    await admin.from('orgs').insert({ id: orgA, name: 'Org A', slug: `org-a-${orgA.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgA, user_id: userA.id, role: 'admin' })
    await admin.from('suppliers').insert({ org_id: orgA, name: 'Supplier Org A' })

    // --- Setup Org B ---
    const orgB = randomUUID()
    const userBEmail = `e2e+isoB+${Date.now()}@chefos.test`
    const userBPass = 'Test1234!'
    const userB = await createUserWithRetry(admin, userBEmail, userBPass)
    await admin.from('orgs').insert({ id: orgB, name: 'Org B', slug: `org-b-${orgB.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgB, user_id: userB.id, role: 'admin' })
    await admin.from('suppliers').insert({ org_id: orgB, name: 'Supplier Org B' })

    // --- Verify as User A ---
    const sessionA = await signInWithRetry(anon, userAEmail, userAPass)
    const keyA = getAnonStorageKey(url, anon)
    await injectSession(page, keyA, sessionA, url, anonKey, { email: userAEmail, password: userAPass })

    await page.goto('/purchasing/suppliers')
    await expect(page.getByText('Supplier Org A')).toBeVisible()
    await expect(page.getByText('Supplier Org B')).not.toBeVisible()

    // --- Logout (by clearing storage or re-injecting) ---
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())

    // --- Verify as User B ---
    const sessionB = await signInWithRetry(anon, userBEmail, userBPass)
    const keyB = getAnonStorageKey(url, anon)
    await injectSession(page, keyB, sessionB, url, anonKey, { email: userBEmail, password: userBPass })

    await page.goto('/purchasing/suppliers')
    await expect(page.getByText('Supplier Org B')).toBeVisible()
    await expect(page.getByText('Supplier Org A')).not.toBeVisible()
})
