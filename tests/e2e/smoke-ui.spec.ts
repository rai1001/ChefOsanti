import { test, expect } from '@playwright/test'

const routes = [
  { path: '/login', expectText: /Inicia sesión/i, name: 'login' },
  { path: '/purchasing/suppliers', expectText: /Proveedores|Inicia sesión/i, name: 'suppliers' },
  { path: '/staff', expectText: /Staff|Inicia sesión/i, name: 'staff' },
  { path: '/reporting', expectText: /Reportes|Inicia sesión/i, name: 'reporting' },
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
      await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
    })
  })
})
