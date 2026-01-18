import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { vi } from 'vitest'

type SupabaseEnv = {
  url: string
  anonKey: string
  serviceKey: string
}

export function loadSupabaseEnv(): SupabaseEnv {
  dotenv.config({ path: 'supabase/.env' })
  dotenv.config({ path: '.env.local' })
  dotenv.config()

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceKey) {
    throw new Error('Faltan SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY para tests de integración')
  }

  return { url, anonKey, serviceKey }
}

export function applySupabaseEnv(env: SupabaseEnv) {
  process.env.VITE_SUPABASE_URL = env.url
  process.env.VITE_SUPABASE_ANON_KEY = env.anonKey
  process.env.VITE_ALLOW_INSECURE_SUPABASE = 'true'
}

export async function ensureSupabaseReady(url: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const res = await fetch(`${url}/auth/v1/health`)
      if (res.ok) return
    } catch {
      // retry
    }
    const delay = Math.min(500 * attempt, 4_000)
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error('Supabase Auth no respondió en el tiempo esperado')
}

function ensureSupabaseRunning() {
  const cleanContainers = () => {
    try {
      execSync(
        'docker rm -f supabase_db_ChefOs-main supabase_kong_ChefOs-main supabase_auth_ChefOs-main supabase_realtime_ChefOs-main supabase_storage_ChefOs-main supabase_pg_meta_ChefOs-main supabase_studio_ChefOs-main supabase_api_ChefOs-main supabase_gateway_ChefOs-main supabase_analytics_ChefOs-main supabase_vector_ChefOs-main',
        { stdio: 'ignore' },
      )
    } catch {
      /* ignore */
    }
  }
  try {
    execSync('supabase status', { stdio: 'ignore' })
    return
  } catch {
    // not running, try to start
  }
  try {
    execSync('supabase stop --project-id ChefOs-main', { stdio: 'ignore' })
  } catch {
    /* ignore */
  }
  try {
    cleanContainers()
  } catch {
    /* ignore */
  }
  try {
    execSync('supabase start -x mailpit,vector', { stdio: 'inherit' })
  } catch (err) {
    cleanContainers()
    execSync('supabase start -x mailpit,vector', { stdio: 'inherit' })
  }
}

let resetChain: Promise<void> = Promise.resolve()

export async function resetSupabaseDatabase() {
  if (process.env.SKIP_SUPABASE_RESET === '1') return
  resetChain = resetChain.then(() => {
    ensureSupabaseRunning()
    try {
      execSync('supabase db reset --local --yes', { stdio: 'inherit' })
    } catch (_err) {
      try {
        execSync('supabase stop --project-id ChefOs-main', { stdio: 'ignore' })
        execSync(
          'docker rm -f supabase_db_ChefOs-main supabase_kong_ChefOs-main supabase_auth_ChefOs-main supabase_realtime_ChefOs-main supabase_storage_ChefOs-main supabase_pg_meta_ChefOs-main supabase_studio_ChefOs-main supabase_api_ChefOs-main supabase_gateway_ChefOs-main supabase_analytics_ChefOs-main supabase_vector_ChefOs-main',
          { stdio: 'ignore' },
        )
      } catch {
        /* ignore */
      }
      ensureSupabaseRunning()
      execSync('supabase db reset --local --yes', { stdio: 'inherit' })
    }
  })
  return resetChain
}

export function createSupabaseClients(env: SupabaseEnv) {
  return {
    admin: createClient(env.url, env.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }),
    anon: createClient(env.url, env.anonKey),
  }
}

export async function bootstrapAppClient(env: SupabaseEnv): Promise<SupabaseClient> {
  applySupabaseEnv(env)
  vi.resetModules()
  const { getSupabaseClient } = await import('@/lib/supabaseClient')
  return getSupabaseClient()
}

export async function createOrgUser(admin: SupabaseClient, label: string) {
  const email = `qa+${label}-${Date.now()}@chefos.local`
  const password = 'Test1234!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('No se pudo crear usuario')
  const orgId = randomUUID()
  const hotelId = randomUUID()

  await admin.from('orgs').insert({ id: orgId, name: `Org ${label}`, slug: `org-${label}-${orgId.slice(0, 6)}` })
  await admin.from('org_memberships').insert({ org_id: orgId, user_id: data.user.id, role: 'admin' })
  await admin.from('hotels').insert({ id: hotelId, org_id: orgId, name: `Hotel ${label}` })

  return { email, password, orgId, hotelId, userId: data.user.id }
}

export async function signInAppUser(appClient: SupabaseClient, email: string, password: string) {
  const { data, error } = await appClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error ?? new Error('No se pudo iniciar sesión')
  return data.session
}
