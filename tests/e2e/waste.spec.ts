
import { test, expect } from '@playwright/test';

// Use a known demo user or mock auth
// For this environment, we rely on the implementation being accessible
test.describe('Waste Module E2E', () => {
    // Login before tests
    test.beforeEach(async ({ page }) => {
        // Basic mock login or using session if persistent
        // Here we assume standard flow: Login -> Dashboard -> Waste
        await page.goto('/login');
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/dashboard');
    });

    test('should navigate to waste list and view entries', async ({ page }) => {
        await page.click('a[href="/waste"]');
        await expect(page).toHaveURL('/waste');

        // Check header
        await expect(page.getByText('Panel de Mermas')).toBeVisible();

        // Check if table or empty state exists
        const tableVisible = await page.getByRole('table').isVisible();
        const emptyStateVisible = await page.getByText('No hay registros').isVisible();

        expect(tableVisible || emptyStateVisible).toBeTruthy();
    });

    test('should open create dialog', async ({ page }) => {
        await page.goto('/waste');
        await page.click('button:has-text("Registrar Merma")');
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Registrar nueva merma')).toBeVisible();

        // Close it
        await page.click('button:has-text("Cancelar")');
        await expect(page.getByRole('dialog')).toBeHidden();
    });
});
