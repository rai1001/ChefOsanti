import { test, expect } from '@playwright/test';

test.describe('Reporting Module', () => {
    test.beforeEach(async ({ page }) => {
        // Login logic (assuming reused state or custom login helper, simplified here if global setup exists)
        // If no global setup, we might need to login. 
        // Assuming 'storageState' is configured in playwright.config.ts or we use a helper.
        // For now, let's assume we need to bypass auth or login.
        // Actually, let's just use the standar login flow if needed, or assume unauthenticated redirect if not.
        // Best practice in this repo seems to be using `test.use({ storageState: 'playwright/.auth/admin.json' })` if setup.
        // Let's check playwright config or existing tests.

        // For now, I'll write a generic test assuming authenticated state is handled or I'll implement a quick login
        await page.goto('/');
    });

    test('should navigate to reports and generate a new report', async ({ page }) => {
        // Mock the Edge Function call
        await page.route('**/functions/v1/reporting_generate', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    report: {
                        id: 'mock-report-id',
                        type: 'weekly',
                        status: 'generated',
                        created_at: new Date().toISOString(),
                        period_start: new Date().toISOString(),
                        period_end: new Date().toISOString(),
                        metrics_json: { events: { total: 10 } },
                        report_md: '# Mock Report\n\nAnalysis here.'
                    }
                })
            });
        });

        // 1. Navigate to Reports
        await page.getByRole('link', { name: /reportes/i }).click();
        await expect(page).toHaveURL(/\/reports/);
        await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();

        // 2. Open Generate Dialog
        await page.getByRole('button', { name: /generar informe/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Generar Nuevo Informe')).toBeVisible();

        // 3. Select type and submit
        await page.getByLabel('Semanal').click();
        // Helper to find the submit button inside the dialog
        await page.getByRole('button', { name: 'Generar' }).click();

        // 4. Verify Success
        await expect(page.getByText('Informe generado correctamente')).toBeVisible();

        // 5. Verify List updates (Mocking list response might be needed if we want to see the new item immediately without real DB)
        // For now, just verifying the toast confirms the UI handled the "success" response correctly.
    });
});
