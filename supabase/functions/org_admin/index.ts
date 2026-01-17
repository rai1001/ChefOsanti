// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function supabaseForUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

async function requireAdmin(userClient: ReturnType<typeof createClient>, orgId: string) {
  const { data: roleOk, error } = await userClient.rpc('has_org_role', {
    p_org_id: orgId,
    p_roles: ['admin'],
  })
  if (error) {
    return { ok: false, error: error.message || 'role check failed' }
  }
  if (!roleOk) {
    return { ok: false, error: 'not authorized' }
  }
  return { ok: true }
}

async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? []
    const found = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (found) return found
    if (users.length < perPage) break
    page += 1
  }
  return null
}

export async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing Supabase env vars' })
  }

  const userClient = supabaseForUser(req)
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const action = String(body.action || '')
  const orgId = String(body.orgId || '')

  if (!orgId) {
    return jsonResponse(400, { error: 'orgId requerido' })
  }

  const adminCheck = await requireAdmin(userClient, orgId)
  if (!adminCheck.ok) {
    return jsonResponse(403, { error: adminCheck.error })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  if (action === 'invite') {
    const email = String(body.email || '').trim().toLowerCase()
    const role = String(body.role || 'staff').toLowerCase()
    const allowedRoles = ['admin', 'manager', 'staff']

    if (!email) {
      return jsonResponse(400, { error: 'email requerido' })
    }
    if (!allowedRoles.includes(role)) {
      return jsonResponse(400, { error: 'rol invalido' })
    }

    let userId: string | undefined
    let invited = false

    const inviteRes = await adminClient.auth.admin.inviteUserByEmail(email)
    if (inviteRes.error) {
      const msg = inviteRes.error.message?.toLowerCase() || ''
      const isExisting = msg.includes('already') || msg.includes('exists')
      if (!isExisting) {
        return jsonResponse(400, { error: inviteRes.error.message })
      }
      const existing = await findUserByEmail(adminClient, email)
      if (!existing) {
        return jsonResponse(404, { error: 'Usuario ya existe pero no se pudo resolver' })
      }
      userId = existing.id
    } else {
      userId = inviteRes.data?.user?.id
      invited = true
    }

    if (!userId) {
      return jsonResponse(500, { error: 'No se pudo resolver userId' })
    }

    const { data: membership, error: membershipErr } = await adminClient
      .from('org_memberships')
      .upsert(
        {
          org_id: orgId,
          user_id: userId,
          role,
          is_active: false,
        },
        { onConflict: 'org_id,user_id' },
      )
      .select('org_id, user_id, role')
      .single()

    if (membershipErr) {
      return jsonResponse(400, { error: membershipErr.message })
    }

    return jsonResponse(200, {
      invited,
      userId: membership.user_id,
      orgId: membership.org_id,
      role: membership.role,
      email,
    })
  }

  if (action === 'remove') {
    const userId = String(body.userId || '')
    const deleteAuth = Boolean(body.deleteAuth)

    if (!userId) {
      return jsonResponse(400, { error: 'userId requerido' })
    }

    const { data: adminRows, count: adminCount, error: adminErr } = await adminClient
      .from('org_memberships')
      .select('user_id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('role', 'admin')

    if (adminErr) {
      return jsonResponse(400, { error: adminErr.message })
    }

    const isAdminTarget = (adminRows ?? []).some((row) => row.user_id === userId)
    if (isAdminTarget && (adminCount ?? 0) <= 1) {
      return jsonResponse(400, { error: 'No puedes eliminar el ultimo admin' })
    }

    const { data: removed, error: removeErr } = await adminClient
      .from('org_memberships')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select('user_id, role')
      .maybeSingle()

    if (removeErr) {
      return jsonResponse(400, { error: removeErr.message })
    }

    let deletedAuth = false
    if (deleteAuth) {
      const { count: remainingCount, error: remainingErr } = await adminClient
        .from('org_memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (!remainingErr && (remainingCount ?? 0) === 0) {
        const delRes = await adminClient.auth.admin.deleteUser(userId)
        if (!delRes.error) {
          deletedAuth = true
        }
      }
    }

    return jsonResponse(200, {
      removed: removed?.user_id ?? null,
      deleteAuth: deletedAuth,
    })
  }

  return jsonResponse(400, { error: 'accion invalida' })
}

if (import.meta.main) {
  serve(handler)
}
