import { expect, test } from '@playwright/test'

test('muestra aviso de sesión en proveedores', async ({ page }) => {
  await page.goto('/purchasing/suppliers')
  await expect(page.getByText('ChefOS')).toBeVisible()
  await expect(page.getByText(/Inicia sesión para gestionar proveedores/i)).toBeVisible()
})

test('renderiza pantalla de login', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Inicia sesión en ChefOS/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible()
})
