import { test, expect } from '@playwright/test'

test.describe('Inventory batches', () => {
  test('navega y muestra lotes', async ({ page }) => {
    await page.goto('/')
    await page.goto('/purchasing/stock')
    // if not authenticated, allow login screen to satisfy minimal visibility
    const loginText = page.getByText(/Inicia sesi/i)
    if (await loginText.isVisible().catch(() => false)) {
      test.skip('Requires auth to verify batches UI')
    }
    await expect(page.getByText(/Inventario por lotes/i)).toBeVisible()
    // choose first location if dropdown exists
    const locationSelect = page.locator('select').nth(1)
    if (await locationSelect.isVisible()) {
      const options = await locationSelect.locator('option').all()
      if (options.length > 1) {
        const value = await options[1].getAttribute('value')
        if (value) {
          await locationSelect.selectOption(value)
        }
      }
    }
    await expect(page.locator('table')).toBeVisible()
  })
})
