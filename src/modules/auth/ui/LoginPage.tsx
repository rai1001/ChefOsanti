import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { fakeLogin } from '../data/authService'
import type { LoginInput } from '../domain/types'

const loginSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [status, setStatus] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginInput) => {
    setStatus(null)
    const result = await fakeLogin(values)
    setStatus(`${result.message}. Conexión real a Supabase Auth pendiente en P1.`)
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Acceso</p>
        <h1 className="text-2xl font-semibold text-slate-900">Inicia sesión en ChefOS</h1>
        <p className="text-sm text-slate-600">
          Autenticación real se conectará a Supabase Auth en la siguiente fase.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Correo electrónico</span>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="operaciones@hotel.com"
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">Contraseña</span>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="••••••••"
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

      {status && (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{status}</p>
      )}
    </div>
  )
}
