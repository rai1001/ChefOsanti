import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useSupabaseSession } from '../data/session'
import type { LoginInput } from '../domain/types'
import { useFormattedError } from '@/lib/shared/useFormattedError'

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
  const [authError, setAuthError] = useState<{ title: string; description: string } | null>(null)
  const { formatError } = useFormattedError()
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
      const { title, description } = formatError(err)
      setAuthError({ title, description })
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-nano-navy-800/50 p-6 shadow-xl backdrop-blur-sm animate-fade-in">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Acceso</p>
        <h1 className="text-2xl font-bold text-white">Inicia sesión en ChefOS</h1>
        <p className="text-sm text-slate-400">Autenticación con Supabase Auth (email y password).</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-300">Correo electrónico</span>
          <input
            type="email"
            className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-2 focus:ring-nano-blue-500/20 placeholder-slate-500 transition-colors"
            placeholder="operaciones@hotel.com"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-300">Contraseña</span>
          <input
            type="password"
            className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white shadow-sm focus:border-nano-blue-500 focus:outline-none focus:ring-2 focus:ring-nano-blue-500/20 placeholder-slate-500 transition-colors"
            placeholder="********"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Accediendo...' : 'Entrar'}
        </button>
      </form>

      {authError && (
        <div className="mt-4 rounded-md bg-rose-500/20 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
          <p className="font-bold">{authError.title}</p>
          <p>{authError.description}</p>
        </div>
      )}
      {status && (
        <p className="mt-4 rounded-md bg-nano-blue-500/20 border border-nano-blue-500/30 px-3 py-2 text-sm text-nano-blue-300">{status}</p>
      )}
    </div>
  )
}
