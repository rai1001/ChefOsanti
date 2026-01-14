import type { Page } from '@playwright/test'

type MockResponse = {
  status?: number
  payload: unknown
  headers?: Record<string, string>
}

export async function mockEdgeFunction(page: Page, name: string, response: MockResponse) {
  const status = response.status ?? 200
  const headers = {
    'content-type': 'application/json',
    ...(response.headers ?? {}),
  }

  await page.route(`**/functions/v1/${name}**`, async (route) => {
    await route.fulfill({
      status,
      headers,
      body: JSON.stringify(response.payload),
    })
  })
}
