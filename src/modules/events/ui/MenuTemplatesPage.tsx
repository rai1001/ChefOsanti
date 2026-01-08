import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateMenuTemplate, useMenuTemplates } from '../data/menus'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

const schema = z.object({
  name: z.string().min(1, 'Nombre obligatorio'),
  category: z.enum(['deportivo', 'turistico', 'empresa', 'coffee_break', 'coctel', 'otros']),
  notes: z.string().optional(),
})
type Form = z.infer<typeof schema>

export function MenuTemplatesPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId, loading: orgLoading } = useActiveOrgId()
  const templates = useMenuTemplates(activeOrgId ?? undefined)
  const create = useCreateMenuTemplate()
  const { role } = useCurrentRole()
  const canWrite = can(role, 'menus:write')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: Form) => {
    if (!activeOrgId) return
    await create.mutateAsync({ ...values, orgId: activeOrgId })
  }

  if (loading || orgLoading) return <p className="p-4 text-sm text-slate-600">Cargando organizacion...</p>
  if (!session || error)
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesion para ver plantillas.</p>
      </div>
    )

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Menus</p>
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas</h1>
        </div>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Crear plantilla</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-slate-800">Nombre</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('name')}
              disabled={!canWrite}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </label>
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-slate-800">Categoria</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('category')}
              disabled={!canWrite}
            >
              <option value="deportivo">Deportivo</option>
              <option value="turistico">Turistico</option>
              <option value="empresa">Empresa</option>
              <option value="coffee_break">Coffee break</option>
              <option value="coctel">Coctel</option>
              <option value="otros">Otros</option>
            </select>
            {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
          </label>
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-slate-800">Notas</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register('notes')}
              disabled={!canWrite}
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting || !activeOrgId || !canWrite}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              title={!canWrite ? 'Sin permisos para crear' : undefined}
            >
              {isSubmitting ? 'Creando...' : 'Crear'}
            </button>
            {create.isError && (
              <p className="mt-2 text-sm text-red-600">
                {(create.error as Error).message || 'Error al crear plantilla'}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-2">
        {templates.data?.map((tmpl) => (
          <Link
            key={tmpl.id}
            to={`/menus/${tmpl.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-200"
          >
              <div>
                <p className="text-sm font-semibold text-slate-900">{tmpl.name}</p>
                <p className="text-xs text-slate-600">
                Categoria: {tmpl.category} {tmpl.notes ? `- ${tmpl.notes}` : ''}
                </p>
              </div>
            <span className="text-xs font-semibold text-brand-600">Ver</span>
          </Link>
        ))}
        {!templates.data?.length && (
          <p className="text-sm text-slate-600">Aun no hay plantillas creadas.</p>
        )}
      </div>
    </div>
  )
}
