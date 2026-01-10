import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateMenuTemplate, useMenuTemplates } from '../data/menus'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from '@/modules/shared/ui/Toast' // Ensure correct path
import { can } from '@/modules/auth/domain/roles'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const schema = z.object({
  name: z.string().min(1, 'Nombre obligatorio'),
  category: z.enum(['deportivo', 'turistico', 'empresa', 'coffee_break', 'coctel', 'otros']),
  notes: z.string().optional(),
})
type Form = z.infer<typeof schema>

export default function MenuTemplatesPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId, loading: orgLoading } = useActiveOrgId()
  const templates = useMenuTemplates(activeOrgId ?? undefined)
  const create = useCreateMenuTemplate()
  const { role } = useCurrentRole()
  const canWrite = can(role, 'menus:write')
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(create.error)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })


  const onSubmit = async (values: Form) => {
    if (!activeOrgId) return
    try {
      await create.mutateAsync({ ...values, orgId: activeOrgId })
      toast.success('Plantilla creada correctamente')
    } catch {
      toast.error('Error al crear plantilla')
    }
  }

  if (loading || orgLoading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (!session || error) {
    return (
      <div className="rounded-xl glass-panel p-4 border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Inicia sesión para ver plantillas.</p>
        <p className="text-xs text-red-400 mt-1">{sessionError}</p>
      </div>
    )
  }



  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Menús</p>
          <h1 className="text-2xl font-bold text-white mt-1">Plantillas</h1>
        </div>
      </header>

      <div className="rounded-2xl glass-panel p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Crear plantilla</h2>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <div className="md:col-span-1">
            <FormField
              id="template-name"
              label="Nombre"
              placeholder="Ej. Menú Boda"
              error={errors.name}
              {...register('name')}
              disabled={!canWrite}
              className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
            />
          </div>
          <label className="space-y-1.5 md:col-span-1">
            <span className="text-sm font-medium text-slate-700">Categoría</span>
            <select
              className="w-full h-10 rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none"
              {...register('category')}
              disabled={!canWrite}
            >
              <option value="deportivo">Deportivo</option>
              <option value="turistico">Turístico</option>
              <option value="empresa">Empresa</option>
              <option value="coffee_break">Coffee break</option>
              <option value="coctel">Cóctel</option>
              <option value="otros">Otros</option>
            </select>
            {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
          </label>
          <div className="md:col-span-1">
            <FormField
              id="template-notes"
              label="Notas"
              placeholder="Opcional"
              {...register('notes')}
              disabled={!canWrite}
              className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
            />
          </div>
          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !activeOrgId || !canWrite}
              className="rounded-lg bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canWrite ? 'Sin permisos para crear' : undefined}
            >
              {isSubmitting ? 'Creando...' : 'Crear Plantilla'}
            </button>
            {createError && (
              <p className="mt-2 text-sm text-red-400">
                <span className="font-semibold">Error:</span> {createError}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates.data?.map((tmpl) => (
          <Link
            key={tmpl.id}
            to={`/menus/${tmpl.id}`}
            className="group flex flex-col justify-between rounded-xl glass-card p-4 hover:bg-white/5 border border-white/5 hover:border-nano-blue-500/30 transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-white group-hover:text-nano-blue-400 transition-colors">{tmpl.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 capitalize">{tmpl.category.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">
                {tmpl.notes || 'Sin notas adicionales.'}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <span className="text-xs font-semibold text-nano-blue-400 group-hover:translate-x-1 transition-transform">Ver detalles &rarr;</span>
            </div>
          </Link>
        ))}
        {!templates.data?.length && (
          <div className="col-span-full py-12">
            <EmptyState
              icon={FileText}
              title="Sin plantillas"
              description="Crea plantillas de menú para agilizar la planificación de eventos."
            />
          </div>
        )}
      </div>
    </div>
  )
}
