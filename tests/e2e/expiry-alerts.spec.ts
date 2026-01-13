import { test, expect } from '@playwright/test'

test('caducidades dashboard carga', async ({ page }) => {
  await page.goto('/inventory/expiries')

  const login = page.getByText(/Inicia sesion/i)
  if (await login.isVisible().catch(() => false)) {
    test.skip('requires auth session')
  }

  await expect(page.getByText(/Caducidades/i)).toBeVisible()
  await expect(page.getByText(/Alertas abiertas/i)).toBeVisible()
})
