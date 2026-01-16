import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

type SessionState = {
  session: Session | null
  loading: boolean
  error?: Error
}

let sessionState: SessionState = { session: null, loading: true }
const listeners = new Set<() => void>()
let initialized = false

function emit() {
  listeners.forEach((listener) => listener())
}

function updateState(next: SessionState) {
  sessionState = next
  emit()
}

function ensureInit() {
  if (initialized) return
  initialized = true

  const client = getSupabaseClient()

  const maybeSetE2ESession = async () => {
    const e2eSession = (window as any).__E2E_SESSION__
    if (e2eSession) {
      await client.auth.setSession({
        access_token: e2eSession.access_token,
        refresh_token: e2eSession.refresh_token,
      })
    }
  }

  const storageKey = (client.auth as any).storageKey ?? ''
  const cached = storageKey ? window.localStorage.getItem(storageKey) : null
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed?.currentSession) {
        updateState({ session: parsed.currentSession, loading: false })
        client.auth
          .setSession({
            access_token: parsed.currentSession.access_token,
            refresh_token: parsed.currentSession.refresh_token,
          })
          .catch(() => {})
      }
    } catch (_e) {
      /* ignore parse errors */
    }
  }

  maybeSetE2ESession()
    .then(() => client.auth.getSession())
    .then(({ data, error }) => {
      if (error) throw error
      if (data.session) {
        updateState({ session: data.session, loading: false })
      } else {
        const fallback = (window as any).__E2E_SESSION__ ?? null
        updateState({ session: fallback, loading: false })
      }
    })
    .catch((error) => {
      const mapped = mapSupabaseError(error as any, {
        module: 'auth',
        operation: 'getSession',
      })
      updateState({ session: null, loading: false, error: mapped })
    })

  client.auth.onAuthStateChange((_event, session) => {
    updateState({ session: session ?? null, loading: false })
  })
}

function subscribe(listener: () => void) {
  ensureInit()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  ensureInit()
  return sessionState
}

export function useSupabaseSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
