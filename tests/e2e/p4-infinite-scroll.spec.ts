import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

test('P4: Infinite Scroll en la lista de proveedores', async ({ page }) => {
    const email = `e2e+scroll+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const orgId = randomUUID()

    const { admin, anon, anonKey, url } = getServiceClients()
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)

    await admin.from('orgs').insert({ id: orgId, name: 'Org Scroll', slug: `org-scroll-${orgId.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })

    // Insertar 25 proveedores (PAGE_SIZE es 20)
    const suppliers = Array.from({ length: 25 }, (_, i) => ({
        org_id: orgId,
        name: `Supplier ${String(i + 1).padStart(2, '0')}`,
    }))
    await admin.from('suppliers').insert(suppliers)

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })

    await page.goto('/purchasing/suppliers')

    // Debería ver los primeros 20 (u ordenados por fecha, los más recientes)
    await expect(page.locator('text=Supplier 25')).toBeVisible()
    await expect(page.locator('text=Supplier 06')).toBeVisible()

    // No debería ver el "Supplier 01" aún (está en la página 2)
    await expect(page.locator('text=Supplier 01')).not.toBeVisible()

    // Click en "Cargar más"
    const loadMore = page.getByRole('button', { name: /Cargar más/i })
    await expect(loadMore).toBeVisible()
    await loadMore.click()

    // Ahora debería ver Supplier 01
    await expect(page.locator('text=Supplier 01')).toBeVisible()
    await expect(loadMore).not.toBeVisible() // Ya no hay más páginas
})
