import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useSupabaseSession } from '../data/session'
import type { LoginInput } from '../domain/types'

const loginSchema = z.object({
  email: z.string().email('Introduce un correo v\xa0lido'),
  password: z.string().min(1, 'La contrase\xa4a es obligatoria'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const session = useSupabaseSession()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = useMemo(
    () => (location.state as any)?.from?.pathname ?? '/dashboard',
    [location.state],
  )

  const [status, setStatus] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!session.loading && session.session) {
      navigate(redirectPath, { replace: true })
    }
  }, [redirectPath, navigate, session.loading, session.session])

  const onSubmit = async (values: LoginInput) => {
    setStatus(null)
    setAuthError(null)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword(values)
      if (error || !data.session) {
        throw error ?? new Error('No se pudo iniciar sesi\xa2n.')
      }
      setStatus('Sesi\xa2n iniciada, redirigiendo...')
      navigate(redirectPath, { replace: true })
    } catch (err: any) {
      const message = err?.message || 'No se pudo iniciar sesi\xa2n. Revisa tus credenciales.'
      setAuthError(message)
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Acceso</p>
        <h1 className="text-2xl font-semibold text-slate-900">Inicia sesi\xa2n en ChefOS</h1>
        <p className="text-sm text-slate-600">Autenticaci\xa2n con Supabase Auth (email y password).</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Correo electr\xa2nico</span>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="operaciones@hotel.com"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Contrase\xa4a</span>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="********"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? 'Accediendo...' : 'Entrar'}
        </button>
      </form>

      {authError && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{authError}</p>
      )}
      {status && (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{status}</p>
      )}
    </div>
  )
}
