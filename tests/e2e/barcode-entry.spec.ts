import { test, expect } from '@playwright/test'

test('barcode assignment and entry (mocked)', async ({ page }) => {
  await page.goto('/')
  await page.goto('/purchasing/stock')

  // if not authenticated, skip gracefully
  const login = page.getByText(/Inicia sesi/i)
  if (await login.isVisible().catch(() => false)) {
    test.skip('requires auth session to proceed')
  }

  await expect(page.getByText(/Inventario por lotes/i)).toBeVisible()

  // open modal
  const newEntryButton = page.getByRole('button', { name: /Nueva entrada/i })
  await newEntryButton.click()

  // enable scanner and simulate barcode
  const simulateInput = page.getByTestId('mock-barcode-input')
  await simulateInput.fill('TEST-12345')
  await page.getByRole('button', { name: /Simular/i }).click()

  // assign barcode by selecting first product
  const productSelect = page.getByRole('combobox', { name: /Producto/i })
  await productSelect.selectOption({ index: 1 })

  const qtyInput = page.getByRole('spinbutton', { name: /Cantidad/i })
  await qtyInput.fill('1')
  await page.getByRole('button', { name: /Guardar/i }).click()

  await expect(page.getByText(/Guardando/i).or(page.getByText(/Sin lotes|Lotes/))).toBeVisible()
})
