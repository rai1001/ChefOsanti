
import { test, expect } from '@playwright/test'

test.describe('Waste Module Smoke Test', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('/login')
        await page.getByPlaceholder('tucorreo@empresa.com').fill('admin@chefos.com')
        await page.getByPlaceholder('••••••••').fill('password123')
        await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
        await page.waitForURL('/dashboard')
    })

    test('should verify full dashboard visibility and stats', async ({ page }) => {
        // 1. Navigate to Waste
        await page.goto('/waste')
        await expect(page.getByRole('heading', { name: 'Mermas', exact: true })).toBeVisible()

        // 2. Verify Key Elements
        await expect(page.getByRole('button', { name: 'Registrar Merma' })).toBeVisible()

        // 3. Verify Filters exist
        await expect(page.locator('input[type="date"]').first()).toBeVisible()
        await expect(page.getByText('Hotel', { exact: true })).toBeVisible()
        await expect(page.getByText('Motivo', { exact: true })).toBeVisible()

        // 4. Verify Stats Cards (assuming standard seed data exists or at least the containers)
        await expect(page.getByText('Coste Total')).toBeVisible()
        await expect(page.getByText('Cantidad Total')).toBeVisible()
        await expect(page.getByText('Principales Motivos')).toBeVisible()

        // 5. Verify Table Headers
        await expect(page.getByText('Fecha')).toBeVisible()
        await expect(page.getByText('Producto')).toBeVisible()
        await expect(page.getByText('Coste U.')).toBeVisible()
    })

    test('should filter entries', async ({ page }) => {
        await page.goto('/waste')

        // Interact with filters
        // Just verifying they are interactive, not necessarily data correctness without controlled seed in this test
        const hotelSelect = page.locator('select').nth(0)
        await hotelSelect.selectOption({ index: 1 }) // Select first available hotel

        // Check if table reloads or stays visible
        await expect(page.locator('table')).toBeVisible()
    })
})
