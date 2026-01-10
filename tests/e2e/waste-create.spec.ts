
import { test, expect } from '@playwright/test'

test.describe('Waste Management', () => {
    test('should allow creating a new waste entry', async ({ page }) => {
        // 1. Login and Navigate
        await page.goto('/login')
        await page.getByPlaceholder('tucorreo@empresa.com').fill('admin@chefos.com')
        await page.getByPlaceholder('••••••••').fill('password123')
        await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
        await page.waitForURL('/dashboard')

        await page.goto('/waste')

        // 2. Open Dialog
        await page.getByRole('button', { name: 'Registrar Merma' }).click()
        await expect(page.getByText('Registrar nueva merma')).toBeVisible()

        // 3. Fill Form
        // Select Hotel (first option)
        await page.locator('select[name="hotelId"]').selectOption({ index: 1 })

        // Select Product (first option)
        await page.locator('select[name="productId"]').selectOption({ index: 1 })

        // Verify auto-fill unit/cost (optional check, but good for regression)
        // await expect(page.locator('input[name="unit"]')).not.toBeEmpty()

        await page.locator('input[name="quantity"]').fill('2.5')

        // Select Reason
        await page.locator('select[name="reasonId"]').selectOption({ index: 1 })

        await page.locator('textarea[name="notes"]').fill('Test E2E Waste')

        // 4. Submit
        await page.getByRole('button', { name: 'Registrar Merma', exact: true }).click()

        // 5. Verify Success
        await expect(page.getByText('Merma registrada correctamente')).toBeVisible()

        // 6. Verify entry in table (reload or wait for optimistic update)
        // Assuming table shows date or note
        // await expect(page.getByText('Test E2E Waste')).toBeVisible() 
    })
})
