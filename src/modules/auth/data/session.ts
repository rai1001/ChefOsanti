import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient, supabaseClient } from '@/lib/supabaseClient'

type SessionState = {
  session: Session | null
  loading: boolean
  error?: Error
}

export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true })

  useEffect(() => {
    if (!supabaseClient) {
      setState({
        session: null,
        loading: false,
        error: new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'),
      })
      return
    }

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

    maybeSetE2ESession()
      .then(() => client.auth.getSession())
      .then(({ data, error }) => {
        if (error) throw error
        setState({ session: data.session ?? null, loading: false })
      })
      .catch((error) => {
        setState({ session: null, loading: false, error })
      })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setState({ session: session ?? null, loading: false })
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}
