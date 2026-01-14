// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const jobSecret = Deno.env.get('EXPIRY_JOB_SECRET')

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (jobSecret) {
    const header = req.headers.get('authorization') || ''
    if (header !== `Bearer ${jobSecret}`) {
      return new Response('unauthorized', { status: 401 })
    }
  }

  try {
    const now = new Date()
    const { data: rules, error: rulesErr } = await serviceClient
      .from('expiry_rules')
      .select('id, org_id, days_before')
      .eq('is_enabled', true)
    if (rulesErr) throw rulesErr

    let created = 0
    for (const rule of rules ?? []) {
      const cutoff = new Date(now.getTime() + (rule.days_before ?? 0) * 24 * 60 * 60 * 1000).toISOString()
      const { data: batches, error: batchErr } = await serviceClient
        .from('stock_batches')
        .select('id, org_id, expires_at, qty')
        .eq('org_id', rule.org_id)
        .gt('qty', 0)
        .not('expires_at', 'is', null)
        .lte('expires_at', cutoff)
      if (batchErr) throw batchErr

      const toInsert =
        batches?.map((b: any) => ({
          org_id: rule.org_id,
          batch_id: b.id,
          rule_id: rule.id,
          status: 'open',
        })) ?? []

      if (toInsert.length) {
        const { data, error: insertErr } = await serviceClient
          .from('expiry_alerts')
          .insert(toInsert, { onConflict: 'org_id,batch_id,rule_id', ignoreDuplicates: true })
          .select('id')
        if (insertErr) throw insertErr
        created += data?.length ?? 0
      }
    }

    return new Response(JSON.stringify({ created }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
  }
}

if (import.meta.main) {
  serve(handler)
}
