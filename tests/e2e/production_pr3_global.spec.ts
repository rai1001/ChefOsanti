import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

test('PR3: Tablero Global de Producción', async ({ page }) => {
    const email = `e2e+prod-global+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const orgId = randomUUID()
    const hotelId = randomUUID()

    // Event 1: Today
    const event1Id = randomUUID()
    const service1Id = randomUUID()

    // Event 2: Tomorrow
    const event2Id = randomUUID()
    const service2Id = randomUUID()

    const { admin, anon, anonKey, url } = getServiceClients()
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)

    // 1. Setup Data
    await admin.from('orgs').insert({ id: orgId, name: 'Org Global Prod', slug: `org-global-${orgId.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
    await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel Global' })

    // Event 1 (Today)
    await admin.from('events').insert({
        id: event1Id, org_id: orgId, hotel_id: hotelId,
        name: 'Evento Hoy', status: 'confirmed',
        starts_at: new Date().toISOString(), ends_at: new Date().toISOString()
    })
    await admin.from('event_services').insert({
        id: service1Id, org_id: orgId, event_id: event1Id,
        service_type: 'comida', format: 'sentado', pax: 50
    })
    // Plan & Task for Event 1
    const { data: plan1 } = await admin.from('production_plans').insert({
        org_id: orgId, event_id: event1Id, event_service_id: service1Id, hotel_id: hotelId,
        status: 'in_progress', generated_from: 'manual'
    }).select().single()

    await admin.from('production_tasks').insert({
        org_id: orgId, plan_id: plan1.id,
        station: 'frio', title: 'Tarea Evento Hoy', priority: 5, status: 'todo'
    })

    // Event 2 (Tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await admin.from('events').insert({
        id: event2Id, org_id: orgId, hotel_id: hotelId,
        name: 'Evento Mañana', status: 'confirmed',
        starts_at: tomorrow.toISOString(), ends_at: tomorrow.toISOString()
    })
    await admin.from('event_services').insert({
        id: service2Id, org_id: orgId, event_id: event2Id,
        service_type: 'cena', format: 'cocktail', pax: 80
    })
    // Plan & Task for Event 2
    const { data: plan2 } = await admin.from('production_plans').insert({
        org_id: orgId, event_id: event2Id, event_service_id: service2Id, hotel_id: hotelId,
        status: 'draft', generated_from: 'manual'
    }).select().single()

    await admin.from('production_tasks').insert({
        org_id: orgId, plan_id: plan2.id,
        station: 'caliente', title: 'Tarea Evento Mañana', priority: 3, status: 'todo',
        due_at: tomorrow.toISOString() // Explicit due date
    })

    // 2. Login & Navigate
    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })

    await page.goto('/production')

    // 3. Verify "Today" View
    // Should see Event 1 task, but NOT Event 2 task (unless filtered)
    await expect(page.getByText('Tarea Evento Hoy')).toBeVisible()
    await expect(page.getByText('Evento Hoy')).toBeVisible() // Badge
    // Tarea Mañana might strictly not appear if filter is Today (default)
    // Actually, logic filters by plan event date OR due date. 
    // Default filter is 'today'.

    // 4. Verify "Tomorrow" View
    await page.getByRole('button', { name: 'Mañana' }).click()
    await expect(page.getByText('Tarea Evento Mañana')).toBeVisible()
    await expect(page.getByText('Evento Mañana')).toBeVisible()

    // 5. Verify "7 Days" View (Both)
    await page.getByRole('button', { name: '7 Días' }).click()
    await expect(page.getByText('Tarea Evento Hoy')).toBeVisible()
    await expect(page.getByText('Tarea Evento Mañana')).toBeVisible()
})
