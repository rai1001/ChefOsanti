import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

Deno.test('OPTIONS returns ok', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  const { handler } = await import(`./index.ts?test=options-${Date.now()}`)

  const res = await handler(new Request('http://localhost', { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
})

Deno.test('enqueue requires attachmentId', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  const { handler } = await import(`./index.ts?test=enqueue-${Date.now()}`)

  const res = await handler(
    new Request('http://localhost/functions/v1/ocr_process/enqueue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }),
  )
  const body = await res.json()

  assertEquals(res.status, 400)
  assert(body.error)
})

Deno.test('run requires jobId', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  const { handler } = await import(`./index.ts?test=run-${Date.now()}`)

  const res = await handler(
    new Request('http://localhost/functions/v1/ocr_process/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }),
  )
  const body = await res.json()

  assertEquals(res.status, 400)
  assert(body.error)
})

Deno.test('unknown path returns 404', async () => {
  Deno.env.set('SUPABASE_URL', 'http://localhost')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
  const { handler } = await import(`./index.ts?test=notfound-${Date.now()}`)

  const res = await handler(new Request('http://localhost/functions/v1/ocr_process/unknown', { method: 'POST' }))
  assertEquals(res.status, 404)
})
