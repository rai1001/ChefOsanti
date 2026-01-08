import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

function monday() {
  const d = new Date()
  const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)
  const mondayDate = new Date(d.setDate(diff))
  return mondayDate.toISOString().slice(0, 10)
}

test('H2: generar roster respetando time off y bloqueos', async ({ page }) => {
  const email = `e2e+h2+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const orgId = randomUUID()
  const hotelId = randomUUID()
  const weekStart = monday()
  const staff = Array.from({ length: 6 }).map(() => randomUUID())
  const timeOffStaff = staff[0]

  const { admin, anon, anonKey, url } = getServiceClients()
  const user = await createUserWithRetry(admin, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  await admin.from('orgs').insert({ id: orgId, name: 'Org H2', slug: `org-h2-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: 'Hotel H2' })
  await admin.from('scheduling_rules').insert({
    org_id: orgId,
    hotel_id: hotelId,
    morning_required_weekday: 1,
    morning_required_weekend: 1,
    afternoon_required_daily: 1,
  })
  await admin.from('staff_members').insert(
    staff.map((id, idx) => ({
      id,
      org_id: orgId,
      full_name: `Staff ${idx}`,
      role: 'cocinero',
      employment_type: 'fijo',
      active: true,
      shift_pattern: idx < 2 ? 'mañana' : idx < 4 ? 'tarde' : 'rotativo',
      max_shifts_per_week: 5,
    })),
  )
  await admin.from('staff_time_off').insert({
    org_id: orgId,
    staff_member_id: timeOffStaff,
    start_date: weekStart,
    end_date: weekStart,
    type: 'vacaciones',
    approved: true,
  })

  const session = await signInWithRetry(anon, email, password)
  await injectSession(page, storageKey, session, url, anonKey, { email, password })
  await page.addInitScript(({ org }) => localStorage.setItem('activeOrgId', org), { org: orgId })

  await page.goto('/scheduling/generate')
  await page.getByLabel('Hotel').selectOption(hotelId)
  await page.getByLabel('Semana (lunes)').fill(weekStart)
  const previewBtn = page.getByRole('button', { name: 'Previsualizar' })
  await previewBtn.click()
  const applyBtn = page.getByRole('button', { name: 'Aplicar' })
  await expect(applyBtn).toBeEnabled({ timeout: 30000 })
  await applyBtn.click()

  await page.goto('/scheduling')
  await page.getByLabel('Hotel').selectOption(hotelId)
  await page.getByLabel('Semana (lunes)').fill(weekStart)

  // time off staff no aparece en primer dia mañana
  const dayCell = page.getByTestId(`cell-${weekStart}-mañana`)
  await expect(dayCell.getByText('Staff 0')).not.toBeVisible({ timeout: 5000 })
})
