import { getSupabaseClient } from '@/lib/supabaseClient'
import type { LoginInput } from '../domain/types'

export async function loginWithPassword(input: LoginInput) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword(input)
  if (error || !data.session) {
    throw error ?? new Error('No se pudo iniciar sesión.')
  }
  return data
}
