import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

test('P5: Flujo completo de compra (Crear -> Listar)', async ({ page }) => {
    const email = `e2e+flow+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const orgId = randomUUID()
    const hotelId = randomUUID()
    const orderNumber = `FLOW-${Date.now()}`

    const { admin, anon, anonKey, url } = getServiceClients()
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)

    await admin.from('orgs').insert({ id: orgId, name: 'Org Flow', slug: `org-flow-${orgId.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
    await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel Flow' })
    await admin.from('suppliers').insert({ org_id: orgId, name: 'Supplier Flow' })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })

    // 1. Crear Pedido
    await page.goto('/purchasing/orders')
    await page.getByRole('link', { name: /Nuevo pedido/i }).click()
    await page.getByLabel('Hotel').selectOption({ label: 'Hotel Flow' })
    await page.getByLabel('Proveedor').selectOption({ label: 'Supplier Flow' })
    await page.getByLabel('Número de pedido').fill(orderNumber)
    await page.getByRole('button', { name: /Crear pedido/i }).click()

    // 2. Verificar en la lista
    await page.goto('/purchasing/orders')
    await expect(page.getByText(orderNumber)).toBeVisible()

    // 3. Ver detalle
    await page.getByText(orderNumber).first().click()
    await expect(page.getByRole('heading', { name: new RegExp(orderNumber, 'i') })).toBeVisible()
    await expect(page.getByText(/Estado: draft/i)).toBeVisible()
})
