import { test, expect } from '@playwright/test'

test('crear preparación y producir', async ({ page }) => {
  await page.goto('/')
  await page.goto('/inventory/preparations')

  const login = page.getByText(/Inicia sesi/i)
  if (await login.isVisible().catch(() => false)) {
    test.skip('requires auth')
  }

  await expect(page.getByText(/Elaboraciones/i)).toBeVisible()

  const newBtn = page.getByRole('button', { name: /Nueva preparación/i })
  await newBtn.click()

  const nameInput = page.getByLabel(/Nombre/i)
  await nameInput.fill(`Prep ${Date.now()}`)
  await page.getByLabel(/Rendimiento/i).fill('5')
  await page.getByLabel(/Vida útil/i).fill('2')
  await page.getByRole('button', { name: /Guardar/i }).click()

  const produceBtn = page.getByRole('button', { name: /Producir/i }).first()
  await produceBtn.click()

  const locationSelect = page.getByLabel(/Ubicación/i)
  await locationSelect.selectOption({ index: 1 })
  await page.getByLabel(/Cantidad producida/i).fill('3')
  await page.getByRole('button', { name: /Confirmar producción/i }).click()

  await expect(page.getByText(/Producción|lote/i).or(page.getByText(/Inventario por lotes/i))).toBeVisible({ timeout: 10000 })
})
