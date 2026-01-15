import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { loginWithPassword } from '../data/authService'
import { useSupabaseSession } from '../data/session'
import type { LoginInput } from '../domain/types'
import { useFormattedError } from '@/lib/shared/useFormattedError'

const loginSchema = z.object({
  email: z.string().email('Introduce un correo valido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
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
      await loginWithPassword(values)
      setStatus('Sesion iniciada, redirigiendo...')
      navigate(redirectPath, { replace: true })
    } catch (err: any) {
      const { title, description } = formatError(err)
      setAuthError({ title, description })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_-200px,_rgb(var(--accent)_/_0.16),_transparent_60%)]" />
        <div className="absolute left-[10%] top-[15%] h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-[5%] bottom-[10%] h-80 w-80 rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute -left-24 -bottom-20 h-72 w-72 rounded-full bg-white/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-2xl border border-white/10 p-8 shadow-[0_30px_80px_rgba(3,7,18,0.6)] animate-fade-in">
            <div className="mb-6 space-y-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(34,211,238,0.7)]" />
                Acceso seguro
              </span>
              <h1 className="text-3xl font-semibold text-foreground">Inicia sesion en ChefOS</h1>
              <p className="text-sm text-muted-foreground">Gestion operativa premium para hosteleria.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo electronico</span>
                <input
                  type="email"
                  id="login-email"
                  autoComplete="email"
                  className="ds-input"
                  placeholder="tucorreo@empresa.com"
                  {...register('email')}
                />
                {errors.email && <p id="email-error" className="text-xs text-danger">{errors.email.message}</p>}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contrasena</span>
                <input
                  type="password"
                  id="login-password"
                  autoComplete="current-password"
                  className="ds-input"
                  placeholder="********"
                  {...register('password')}
                />
                {errors.password && <p id="password-error" className="text-xs text-danger">{errors.password.message}</p>}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-label="Entrar iniciar sesion"
                className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_30px_rgba(34,211,238,0.35)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Accediendo...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <span className="cursor-default">Olvidaste tu contrasena?</span>
              <span className="cursor-default">Necesitas ayuda?</span>
            </div>

            {authError && (
              <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <p className="font-semibold text-foreground">{authError.title}</p>
                <p className="text-xs text-muted-foreground">{authError.description}</p>
              </div>
            )}
            {status && (
              <p className="mt-5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">{status}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
