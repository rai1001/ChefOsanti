import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { loginWithPassword } from '../data/authService'
import { useSupabaseSession } from '../data/session'
import type { LoginInput } from '../domain/types'
import { useFormattedError } from '@/lib/shared/useFormattedError'
import { Button } from '@/modules/shared/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'

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
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_-200px,_rgb(var(--accent)_/_0.2),_transparent_60%)]" />
        <div className="absolute left-[12%] top-[18%] h-72 w-72 rounded-full bg-accent/12 blur-[140px]" />
        <div className="absolute right-[8%] bottom-[10%] h-96 w-96 rounded-full bg-accent-alt/12 blur-[180px]" />
        <div className="absolute -left-16 -bottom-24 h-80 w-80 rounded-full bg-white/6 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-14">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <Card className="glass-card border border-white/10 bg-surface/50">
            <CardHeader className="pb-2">
              <Badge variant="info">Acceso seguro</Badge>
              <CardTitle className="mt-3 text-3xl text-foreground">Bienvenido a ChefOS Premium</CardTitle>
              <p className="text-sm text-muted-foreground">
                Operaciones unificadas para hoteles: inventario, compras, producción y reportes en un solo lugar.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/30 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Visibilidad total</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Dashboard ejecutivo</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Modo cocina</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Contraste +44px targets</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/30 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Caducidades</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Alertas activas</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Aprobaciones</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Compras seguras</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-surface/70 shadow-[0_30px_80px_rgba(3,7,18,0.6)]">
            <CardHeader className="space-y-2 pb-4">
              <Badge variant="info" className="w-fit">Acceso seguro</Badge>
              <h1 className="text-3xl font-semibold text-foreground">Inicia sesión en ChefOS</h1>
              <p className="text-sm text-muted-foreground">Gestion operativa premium para hosteleria.</p>
            </CardHeader>
            <CardContent>
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

                <Button type="submit" disabled={isSubmitting} className="w-full" aria-label="Entrar iniciar sesion">
                  {isSubmitting ? 'Accediendo...' : 'Entrar'}
                </Button>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
