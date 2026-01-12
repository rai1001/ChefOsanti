import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
    createUserWithRetry,
    getAnonStorageKey,
    getServiceClients,
    injectSession,
    signInWithRetry,
} from './utils/auth'

test('PR2: Generar plan de producción desde menú', async ({ page }) => {
    const email = `e2e+prod-gen+${Date.now()}@chefos.test`
    const password = 'Test1234!'
    const orgId = randomUUID()
    const hotelId = randomUUID()
    const eventId = randomUUID()
    const serviceId = randomUUID()
    const recipeId = randomUUID()
    const templateId = randomUUID()

    const { admin, anon, anonKey, url } = getServiceClients()
    const user = await createUserWithRetry(admin, email, password)
    const storageKey = getAnonStorageKey(url, anon)

    // 1. Setup Basic Data (Org, Hotel, Event, Service)
    await admin.from('orgs').insert({ id: orgId, name: 'Org E2E Gen', slug: `org-gen-${orgId.slice(0, 6)}` })
    await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
    await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel Gen' })
    await admin.from('events').insert({
        id: eventId,
        org_id: orgId,
        hotel_id: hotelId,
        name: 'Evento Generación',
        status: 'confirmed',
        starts_at: new Date().toISOString(),
        ends_at: new Date().toISOString()
    })

    // Service: 100 pax, sentado
    await admin.from('event_services').insert({
        id: serviceId,
        org_id: orgId,
        event_id: eventId,
        service_type: 'comida',
        format: 'sentado',
        pax: 100,
        starts_at: new Date(Date.now() + 3600000).toISOString()
    })

    // 2. Setup Menu Data
    // Create Recipe
    await admin.from('recipes').insert({
        id: recipeId,
        org_id: orgId,
        name: 'Solomillo Premium',
        status: 'active'
    })

    // Create Menu Template & Item
    await admin.from('menu_templates').insert({
        id: templateId,
        org_id: orgId,
        name: 'Menú Boda',
        type: 'menu'
    })
    await admin.from('menu_template_items').insert({
        template_id: templateId,
        name: 'Solomillo al Whisky',
        qty_per_pax_seated: 1.5,
        qty_per_pax_standing: 0.5,
        unit: 'kg'
    })

    // Link Template to Service
    await admin.from('event_service_menus').insert({
        event_service_id: serviceId,
        template_id: templateId
    })

    // 3. Setup PR2 Mapping Data (Alias & Meta)
    await admin.from('menu_item_recipe_aliases').insert({
        org_id: orgId,
        alias_name: 'Solomillo al Whisky',
        recipe_id: recipeId
    })
    await admin.from('recipe_production_meta').insert({
        org_id: orgId,
        recipe_id: recipeId,
        station: 'caliente',
        lead_time_minutes: 60
    })

    // 4. Run Test Flow
    const session = await signInWithRetry(anon, email, password)
    await injectSession(page, storageKey, session, url, anonKey, { email, password })

    // Go to Event Detail
    await page.goto(`/events/${eventId}`)

    // Ideally should see the Service "Comida" in the list. Click it contextually if check needed.
    // The previous test clicked 'text=Comida'.
    await page.click('text=comida') // service_type is 'comida' (lowercase in db, likely displayed capitalized or as is)

    // Expect "No hay plan" and "Generar desde Menú"
    await expect(page.getByText('No hay plan de producción')).toBeVisible()
    const generateBtn = page.getByRole('button', { name: 'Generar desde Menú' })
    await expect(generateBtn).toBeVisible()

    // Handle Alert
    page.on('dialog', dialog => dialog.accept())

    // Click Generate
    await generateBtn.click()

    // Wait for Task to appear
    // Should see "Solomillo al Whisky"
    await expect(page.getByText('Solomillo al Whisky')).toBeVisible()

    // Verify Station column (Caliente)
    const hotColumn = page.locator('div', { hasText: 'Caliente' }).first() // The column header
    await expect(hotColumn).toBeVisible()

    // Expect badge with Quantity: 100 * 1.5 = 150 kg
    await expect(page.getByText('150 kg')).toBeVisible()
})
