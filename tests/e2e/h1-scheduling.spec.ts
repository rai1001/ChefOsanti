import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

function getMonday() {
  const today = new Date()
  const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

test('H1: asignar turnos con bloqueo de doble asignacion', async ({ page }) => {
  const email = `e2e+h1+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const staffA = randomUUID()
  const staffB = randomUUID()
  const shiftIdDesayuno = randomUUID()
  const shiftIdBar = randomUUID()
  const weekStart = getMonday()

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org H1', slug: `org-h1-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel H1' })
  await admin.from('staff_members').insert([
    { id: staffA, org_id: orgId, full_name: 'Staff A', role: 'cocinero', employment_type: 'fijo', active: true },
    { id: staffB, org_id: orgId, full_name: 'Staff B', role: 'cocinero', employment_type: 'fijo', active: true },
  ])
  await admin.from('shifts').insert([
    {
      id: shiftIdDesayuno,
      org_id: orgId,
      hotel_id: hotelId,
      shift_date: weekStart,
      shift_type: 'desayuno',
      starts_at: '07:00',
      ends_at: '15:00',
      required_count: 1,
    },
    {
      id: shiftIdBar,
      org_id: orgId,
      hotel_id: hotelId,
      shift_date: weekStart,
      shift_type: 'bar_tarde',
      starts_at: '15:00',
      ends_at: '23:00',
      required_count: 1,
    },
  ])

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  await page.goto('/scheduling')
  await page.getByLabel('Hotel').selectOption(hotelId)
  await page.getByLabel('Semana (lunes)').fill(weekStart)
  await expect(page.getByRole('heading', { name: /Planific/i })).toBeVisible()

  const desayunoCell = page.getByTestId(`cell-${weekStart}-desayuno`)
  await expect(desayunoCell).toBeVisible({ timeout: 10000 })
  await desayunoCell.getByLabel(`Asignar-${weekStart}-desayuno`).selectOption(staffA)
  await desayunoCell.getByRole('button', { name: 'Asignar' }).click()
  await expect(desayunoCell.locator('span', { hasText: 'Staff A' })).toBeVisible({ timeout: 10000 })

  const barCell = page.getByTestId(`cell-${weekStart}-bar_tarde`)
  await barCell.getByLabel(`Asignar-${weekStart}-bar_tarde`).selectOption(staffA)
  await barCell.getByRole('button', { name: 'Asignar' }).click()
  await expect(page.getByText(/ya tiene turno/i)).toBeVisible({ timeout: 10000 })

  await barCell.getByLabel(`Asignar-${weekStart}-bar_tarde`).selectOption(staffB)
  await barCell.getByRole('button', { name: 'Asignar' }).click()
  await expect(barCell.locator('span', { hasText: 'Staff B' })).toBeVisible({ timeout: 10000 })
})
