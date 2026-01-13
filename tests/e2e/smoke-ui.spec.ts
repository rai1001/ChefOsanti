import { test, expect } from '@playwright/test'

const routes = [
  { path: '/login', expectText: /Inicia sesi▋/i, name: 'login' },
  { path: '/purchasing/suppliers', expectText: /Proveedores|Inicia sesi▋/i, name: 'suppliers' },
  { path: '/purchasing/orders', expectText: /Pedidos de compra|Inicia sesi▋/i, name: 'purchase-orders' },
  { path: '/staff', expectText: /Staff|Inicia sesi▋/i, name: 'staff' },
  { path: '/reporting', expectText: /Reportes|Inicia sesi▋/i, name: 'reporting' },
  { path: '/scheduling', expectText: /Planificaci▋n de turnos|Inicia sesi▋/i, name: 'scheduling' },
  { path: '/events', expectText: /Eventos|Inicia sesi▋/i, name: 'events' },
]

test.describe('UI smoke navigation', () => {
  routes.forEach(({ path, expectText, name }) => {
    test(`visita ${path}`, async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.goto(path)
      await expect(page.getByText(expectText, { exact: false })).toBeVisible()
      await expect(page).toHaveScreenshot(`smoke-${name}.png`, { fullPage: true })
      await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
    })
  })
})
