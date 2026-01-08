import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

test('E5: flujo OCR adjunto -> revisar -> aplicar', async ({ page }) => {
  const email = `e2e+ocr+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const eventId = randomUUID()

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org OCR', slug: `org-ocr-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel OCR' })
  await admin.from('events').insert({
    id: eventId,
    org_id: orgId,
    hotel_id: hotelId,
    title: 'Evento OCR',
    status: 'confirmed',
  })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  // Preparar archivo dummy
  const tmpFile = path.join(os.tmpdir(), `ocr-${Date.now()}.txt`)
  writeFileSync(tmpFile, 'DESAYUNO 07:30 40 pax\nBEBIDAS:\nCafe\n')

  await page.goto(`/events/${eventId}`)
  const ocrSection = page.getByRole('heading', { name: /Adjuntos/i }).locator('..').locator('..')

  await ocrSection.getByLabel(/Subir/).setInputFiles(tmpFile)
  await expect(ocrSection.getByText(path.basename(tmpFile))).toBeVisible({ timeout: 10000 })

  await ocrSection.getByRole('button', { name: /Procesar OCR/i }).click()
  await expect(ocrSection.getByRole('button', { name: /Revisar/i })).toBeVisible({ timeout: 20000 })
  await ocrSection.getByRole('button', { name: /Revisar/i }).click()

  const modal = page.getByRole('heading', { name: /Revisar OCR/i }).locator('..').locator('..')
  await modal.getByRole('button', { name: /Aplicar al evento/i }).click()

  // Ver servicios creados y menu OCR
  await expect(page.getByText(/Menu OCR/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/Cafe/)).toBeVisible()
})
