import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'
import { mockEdgeFunction } from './utils/edge'

async function setupReporting(page: Page) {
  const { admin, anon, anonKey, url } = getServiceClients()
  const email = `e2e+reporting+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const user = await createUserWithRetry(admin, email, password)

  await admin.from('orgs').insert({
    id: orgId,
    name: 'Org Reports',
    slug: `org-reports-${orgId.slice(0, 6)}`,
  })

  await admin.from('org_memberships').insert({
    org_id: orgId,
    user_id: user.id,
    role: 'admin',
    is_active: true,
  })

  const session = await signInWithRetry(anon, email, password)
  const storageKey = getAnonStorageKey(url, anon)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })
}

test.describe('Reporting Module', () => {
  test.beforeEach(async ({ page }) => {
    await setupReporting(page)
  })

  test('should navigate to reports and generate a new report', async ({ page }) => {
    await mockEdgeFunction(page, 'reporting_generate', {
      payload: {
        success: true,
        report: {
          id: 'mock-report-id',
          type: 'weekly',
          status: 'generated',
          created_at: new Date().toISOString(),
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          metrics_json: { events: { total: 10 } },
          report_md: '# Mock Report\n\nAnalysis here.',
        },
      },
    })

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /reportes/i }).click()
    await expect(page).toHaveURL(/\/reports/)
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()

    await page.getByRole('button', { name: /generar informe/i }).click()
    await expect(page.getByText('Generar Nuevo Informe')).toBeVisible()

    await page.getByRole('button', { name: 'Generar', exact: true }).click()

    await expect(page.getByText('Informe generado correctamente')).toBeVisible()
  })

  test('shows error toast when report generation fails', async ({ page }) => {
    await mockEdgeFunction(page, 'reporting_generate', {
      status: 500,
      payload: { error: 'AI Service not configured' },
    })

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /reportes/i }).click()
    await expect(page).toHaveURL(/\/reports/)

    await page.getByRole('button', { name: /generar informe/i }).click()
    await expect(page.getByText('Generar Nuevo Informe')).toBeVisible()

    await page.getByRole('button', { name: 'Generar', exact: true }).click()

    await expect(page.getByText(/Error al generar el informe/i)).toBeVisible()
  })
})
