import { test, expect } from '@playwright/test'

const SAMPLE_TEXT = `
ALBARAN DEMO 999
Proveedor Demo
Fecha: 12/01/2026
Tomate rama 2 kg
Huevos L 6 ud
`

test('importar albaran (OCR mock) crea lotes', async ({ page }) => {
  await page.goto('/')
  await page.goto('/purchasing/stock')

  const login = page.getByText(/Inicia sesi/i)
  if (await login.isVisible().catch(() => false)) {
    test.skip('requires auth session')
  }

  await expect(page.getByText(/Inventario por lotes/i)).toBeVisible()

  const locationSelect = page.getByRole('combobox').nth(1)
  await locationSelect.selectOption({ index: 1 })

  const importBtn = page.getByRole('button', { name: /Importar albar/i })
  await importBtn.click()

  await page.getByPlaceholder(/Pega el texto/i).fill(SAMPLE_TEXT)
  await page.getByRole('button', { name: /Procesar OCR/i }).click()

  const productSelects = page.getByRole('combobox', { name: /Producto línea/i })
  if (await productSelects.count() > 0) {
    await productSelects.nth(0).selectOption({ index: 1 })
  }

  const importChecks = page.getByRole('checkbox')
  await importChecks.nth(0).check()

  await page.getByRole('button', { name: /Guardar albar/ }).click()

  await expect(page.getByText(/importado/i)).toBeVisible({ timeout: 10000 })
})
