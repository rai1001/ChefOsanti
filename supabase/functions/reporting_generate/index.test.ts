import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

Deno.test('OPTIONS returns ok', async () => {
  const { handler } = await import('./index.ts')
  const res = await handler(new Request('http://localhost', { method: 'OPTIONS' }))

  assertEquals(res.status, 200)
})

Deno.test('missing orgId returns 400', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  const { handler } = await import(`./index.ts?test=missing-org-${Date.now()}`)

  const res = await handler(
    new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'weekly' }),
    }),
  )
  const body = await res.json()

  assertEquals(res.status, 400)
  assert(body.error)
})
