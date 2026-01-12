import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

function toLocalInput(dt: Date) {
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

test('PR1: Crear plan de producción y gestionar tareas', async ({ page }) => {
    const email = `e2e+production+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const orgId = randomUUID()
    const hotelId = randomUUID()
    const eventTitle = `Evento Producción ${Date.now()}`

    const { admin, anon, anonKey, url } = getServiceClients()
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)

    // Setup basic data
    await admin.from('orgs').insert({ id: orgId, name: 'Org E2E Production', slug: `org-e2e-prod-${orgId.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
    await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel Producción E2E' })

    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })

    // 1. Create Event
    await page.goto('/events/new')
    await page.getByLabel('Hotel').selectOption({ label: 'Hotel Producción E2E' })
    await page.getByLabel('Titulo').fill(eventTitle)
    await page.getByLabel('Estado').selectOption({ value: 'confirmed' })
    await page.getByRole('button', { name: /Crear evento/i }).click()
    await page.waitForURL(/\/events\/.+/)

    // 2. Add Service
    const serviceForm = page.locator('form').nth(1)
    const start = toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
    const end = toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000))
    await serviceForm.getByLabel('Tipo de servicio').selectOption({ value: 'comida' }) // Use lowercase 'comida' as per value
    await serviceForm.getByLabel('Inicio').fill(start)
    await serviceForm.getByLabel('Fin (opcional)').fill(end)
    await serviceForm.getByLabel('Pax').fill('100')
    await serviceForm.getByLabel('Formato').selectOption({ value: 'sentado' })
    await serviceForm.getByRole('button', { name: /Anadir servicio/i }).click()

    // Verify service created/selected
    await expect(page.getByText('comida').first()).toBeVisible()

    // 3. Select Service to view Production Plan
    await page.click('text=Comida')

    // 4. Create Production Plan
    const createPlanBtn = page.getByRole('button', { name: /Crear Plan de Producción/i })
    await expect(createPlanBtn).toBeVisible()
    await createPlanBtn.click()

    // Wait for plan header
    await expect(page.getByText('Mise en place')).toBeVisible()

    // 5. Add Task
    // Use the main "Add Task" button first
    await page.getByRole('button', { name: '+ Añadir Tarea' }).first().click()
    await expect(page.getByRole('dialog').or(page.locator('.rounded-lg.bg-slate-50'))).toBeVisible() // Modal or inline form

    await page.getByLabel('Estación').selectOption({ value: 'frio' })
    await page.getByLabel('Título').fill('Cortar tomates')
    await page.getByLabel('Prioridad').selectOption({ value: '5' }) // Alta
    await page.getByRole('button', { name: 'Guardar' }).click()

    // 6. Verify Task Created
    const taskTitle = page.getByText('Cortar tomates')
    await expect(taskTitle).toBeVisible()
    await expect(page.locator('h4', { hasText: 'Frío' })).toBeVisible()

    // 7. Mark as Done
    const taskCard = page.locator('div', { hasText: 'Cortar tomates' }).last() // Ensure specific card
    const checkbox = taskCard.locator('input[type="checkbox"]')
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // 8. Delete Task
    const deleteBtn = taskCard.getByRole('button').last()
    await deleteBtn.click()
    await expect(taskTitle).not.toBeVisible()
})
