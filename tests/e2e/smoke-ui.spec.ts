import { test, expect } from '@playwright/test'

const routes = [
  { path: '/login', expectText: /Inicia sesión|Inicia sesi?/i, name: 'login' },
  { path: '/purchasing/suppliers', expectText: /Proveedores|Inicia sesión/i, name: 'suppliers' },
  { path: '/purchasing/orders', expectText: /Pedidos de compra|Inicia sesión/i, name: 'purchase-orders', hasTable: true },
  { path: '/staff', expectText: /Staff|Inicia sesión/i, name: 'staff' },
  { path: '/reporting', expectText: /Reportes|Inicia sesión/i, name: 'reporting' },
  { path: '/scheduling', expectText: /Planificaci.+n de turnos|Inicia sesión/i, name: 'scheduling' },
  { path: '/events', expectText: /Eventos|Inicia sesión/i, name: 'events' },
]

test.describe('UI smoke navigation', () => {
  routes.forEach(({ path, expectText, name, hasTable }) => {
    test(`visita ${path}`, async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.goto(path)
      await expect(page.getByText(expectText, { exact: false })).toBeVisible()
      if (hasTable) {
        await expect(page.locator('table.ds-table').first()).toBeVisible()
        await expect(page.getByRole('columnheader', { name: /Pedido/i })).toBeVisible()
      }
      await expect(page).toHaveScreenshot(`smoke-${name}.png`, { fullPage: true })
      await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
    })
  })
})

test('toggles density mode from the header', async ({ page }) => {
  await page.goto('/')
  await page.setViewportSize({ width: 1280, height: 720 })
  const densityButton = page.getByRole('button', { name: /Compacto|Cómodo/i }).first()
  await expect(densityButton).toBeVisible()
  await densityButton.click()
  await expect(page.locator('div[data-density="comfortable"]')).toHaveCount(1)
  await densityButton.click()
  await expect(page.locator('div[data-density="compact"]')).toHaveCount(1)
})
