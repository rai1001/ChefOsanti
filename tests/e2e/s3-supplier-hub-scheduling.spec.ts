import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import {
  createUserWithRetry,
  getAnonStorageKey,
  getServiceClients,
  injectSession,
  signInWithRetry,
} from './utils/auth'

function getCurrentMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

type HotelInfo = { id: string; name: string }

async function prepareSprint3Context() {
  const { admin, anon, anonKey, url } = getServiceClients()
  const email = `e2e+s3+${Date.now()}@chefos.test`
  const password = 'Test1234!'
  const user = await createUserWithRetry(admin, email, password)

  const orgId = randomUUID()
  await admin.from('orgs').insert({
    id: orgId,
    name: `Sprint 3 Org ${orgId.slice(0, 6)}`,
    slug: `sprint3-${orgId.slice(0, 6)}`,
  })
  await admin.from('org_memberships').insert({
    org_id: orgId,
    user_id: user.id,
    role: 'admin',
  })

  const hotels: HotelInfo[] = [
    { id: randomUUID(), name: 'Hotel Alfa' },
    { id: randomUUID(), name: 'Hotel Beta' },
  ]
  await admin.from('hotels').insert(
    hotels.map((hotel) => ({
      id: hotel.id,
      org_id: orgId,
      name: hotel.name,
      city: 'Madrid',
      country: 'ES',
      currency: 'EUR',
    })),
  )

  const suppliers = [
    { id: randomUUID(), name: 'Alpha Supply' },
    { id: randomUUID(), name: 'Beta Supply' },
    { id: randomUUID(), name: 'Gamma Supply' },
  ]
  await admin.from('suppliers').insert(
    suppliers.map((supplier) => ({ ...supplier, org_id: orgId })),
  )

  const orders = [
    {
      id: randomUUID(),
      hotel_id: hotels[0].id,
      supplier_id: suppliers[0].id,
      status: 'draft',
      order_number: 'E2E-PO-1',
      total_estimated: 180.5,
    },
    {
      id: randomUUID(),
      hotel_id: hotels[1].id,
      supplier_id: suppliers[1].id,
      status: 'confirmed',
      order_number: 'E2E-PO-2',
      total_estimated: 375.75,
    },
  ]
  await admin.from('purchase_orders').insert(
    orders.map((order) => ({
      ...order,
      org_id: orgId,
      approval_status: 'pending',
    })),
  )

  const staffId = randomUUID()
  await admin.from('staff_members').insert({
    id: staffId,
    org_id: orgId,
    home_hotel_id: hotels[0].id,
    full_name: 'Chef E2E',
    role: 'cocinero',
    employment_type: 'fijo',
    active: true,
    notes: 'Automation crew',
  })

  const shiftDate = getCurrentMonday()
  const shiftId = randomUUID()
  await admin.from('shifts').insert({
    id: shiftId,
    org_id: orgId,
    hotel_id: hotels[0].id,
    shift_date: shiftDate,
    shift_type: 'desayuno',
    starts_at: '08:00:00',
    ends_at: '12:00:00',
    required_count: 2,
  })
  await admin.from('staff_assignments').insert({
    id: randomUUID(),
    org_id: orgId,
    shift_id: shiftId,
    staff_member_id: staffId,
  })

  const session = await signInWithRetry(anon, email, password)
  const storageKey = getAnonStorageKey(url, anon)

  return {
    email,
    password,
    session,
    storageKey,
    url,
    anonKey,
    hotels,
  }
}

test.describe('Sprint 3 QA automation', () => {
  test('Supplier & Procurement Hub filters and orders respond to tabs', async ({ page }) => {
    const context = await prepareSprint3Context()
    await injectSession(
      page,
      context.storageKey,
      context.session,
      context.url,
      context.anonKey,
      { email: context.email, password: context.password },
    )

    await page.goto('/purchasing/suppliers')
    await expect(page.getByRole('heading', { name: 'Supplier & Procurement Hub' })).toBeVisible()

    await page.getByRole('button', { name: 'Suppliers Vendors & filters' }).click()
    const search = page.getByPlaceholder('Search suppliers...')
    await search.fill('Alpha')
    await expect(page.getByText('Alpha Supply')).toHaveCount(1)
    await expect(page.getByText('Beta Supply')).toHaveCount(0)
    await search.fill('')
    await page.locator('select.ds-input').nth(0).selectOption('All')
    await page.locator('select.ds-input').nth(3).selectOption(context.hotels[1].id)
    await expect(page.getByText('Beta Supply')).toHaveCount(1)
    await expect(page.getByText('Alpha Supply')).toHaveCount(0)

    await page.getByRole('button', { name: 'Purchase Orders Approvals + spend' }).click()
    await page.locator('select.ds-input').nth(4).selectOption('confirmed')
    await expect(page.getByText('E2E-PO-1')).toHaveCount(0)
    await expect(page.getByText('E2E-PO-2')).toHaveCount(1)
  })

  test('Staff Scheduling grid virtualizes rows and week navigation', async ({ page }) => {
    const context = await prepareSprint3Context()
    await injectSession(
      page,
      context.storageKey,
      context.session,
      context.url,
      context.anonKey,
      { email: context.email, password: context.password },
    )

    await page.goto('/scheduling')
    await page.locator('select.ds-input').first().selectOption(context.hotels[0].id)
    await expect(page.getByRole('heading', { name: 'Staff Scheduling' })).toBeVisible()
    await expect(page.getByText('Chef E2E').first()).toBeVisible()
    await expect(page.getByText('Understaffed: 1 más')).toHaveCount(1)

    await page.getByRole('button', { name: 'Next day' }).click()
    await expect(page.getByText('Understaffed: 1 más')).toHaveCount(0)
    await page.getByRole('button', { name: 'Previous day' }).click()
    await expect(page.getByText('Understaffed: 1 más')).toHaveCount(1)
  })
})
