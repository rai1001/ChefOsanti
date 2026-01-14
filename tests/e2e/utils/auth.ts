import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: 'supabase/.env' })
dotenv.config({ path: '.env.local' })
dotenv.config()

export type RetryOptions = { retries?: number; baseDelayMs?: number; maxDelayMs?: number }

async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 8
  const base = opts.baseDelayMs ?? 250
  const max = opts.maxDelayMs ?? 4000
  let lastError: any
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const delay = Math.min(base * Math.pow(2, i), max)
      console.warn(`[RETRY] Attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`, err)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

export async function createUserWithRetry(admin: SupabaseClient, email: string, password: string) {
  const { data, error } = await retry(() =>
    admin.auth.admin.createUser({ email, password, email_confirm: true }),
  )
  if (error || !data.user) throw error || new Error('No se pudo crear usuario')
  return data.user
}

export async function signInWithRetry(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await retry(() => client.auth.signInWithPassword({ email, password }))
  if (error || !data.session) throw error || new Error('No pudo iniciar sesión')
  return data.session
}

export function getAnonStorageKey(url: string, client: SupabaseClient) {
  return (
    (client.auth as any).storageKey ||
    `sb-${new URL(url).host}-auth-token` ||
    `sb-${new URL(url).hostname}-auth-token`
  )
}

export function getServiceClients() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('Faltan variables SUPABASE_URL/ANON/SERVICE_ROLE')
  return {
    url,
    anonKey: anon,
    admin: createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } }),
    anon: createClient(url, anon),
  }
}

export async function injectSession(
  page: Page,
  storageKey: string,
  session: any,
  supabaseUrl?: string,
  anonKey?: string,
  creds?: { email: string; password: string },
) {
  // Establece el origen correcto antes de inyectar sesión
  await page.goto('/')

  await page.addInitScript(
    ({ key, sessionData }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          currentSession: sessionData,
          expiresAt: sessionData?.expires_at,
        }),
      )
        ; (window as any).__E2E_SESSION__ = sessionData
    },
    { key: storageKey, sessionData: session },
  )

  // Refuerza la sesión en Supabase para el contexto actual
  await page.evaluate(
    async ({ key, sessionData, url, anon }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          currentSession: sessionData,
          expiresAt: sessionData?.expires_at,
        }),
      )
        ; (window as any).__E2E_SESSION__ = sessionData
      if (url && anon) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
        const client = createClient(url, anon)
        await client.auth.setSession(sessionData)
      }
    },
    { key: storageKey, sessionData: session, url: supabaseUrl, anon: anonKey },
  )

  await page.reload({ waitUntil: 'domcontentloaded' })

  if (creds) {
    await page.goto('/login')
    const emailField = page.getByLabel(/Correo/i)
    try {
      await emailField.waitFor({ state: 'visible', timeout: 5000 })
    } catch (_err) {
      return
    }

    await emailField.fill(creds.email)
    const passwordField = page.getByLabel(/Contrase/i)
    await passwordField.fill(creds.password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login')),
      passwordField.press('Enter'),
    ])
  }
}
