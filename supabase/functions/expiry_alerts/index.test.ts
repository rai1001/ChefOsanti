import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

Deno.test('OPTIONS returns ok', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  const { handler } = await import(`./index.ts?test=options-${Date.now()}`)

  const res = await handler(new Request('http://localhost', { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
})

Deno.test('requires job secret when configured', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  Deno.env.set('EXPIRY_JOB_SECRET', 'secret')
  const { handler } = await import(`./index.ts?test=secret-${Date.now()}`)

  const res = await handler(new Request('http://localhost', { method: 'POST' }))
  assertEquals(res.status, 401)
})
