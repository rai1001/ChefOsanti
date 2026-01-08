import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateMenuTemplateItem, useMenuTemplateItems, useMenuTemplates } from '../data/menus'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

const schema = z
  .object({
    section: z.string().optional(),
    name: z.string().min(1, 'Nombre obligatorio'),
    unit: z.enum(['ud', 'kg']),
    qtyPerPaxSeated: z.number().nonnegative('>=0'),
    qtyPerPaxStanding: z.number().nonnegative('>=0'),
    roundingRule: z.enum(['ceil_unit', 'ceil_pack', 'none']),
    packSize: z.number().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) =>
      data.roundingRule !== 'ceil_pack' || (data.packSize !== undefined && data.packSize > 0),
    { message: 'pack_size obligatorio con ceil_pack', path: ['packSize'] },
  )
  .refine((data) => data.qtyPerPaxSeated > 0 || data.qtyPerPaxStanding > 0, {
    message: 'Define ratio para sentado o de_pie',
    path: ['qtyPerPaxSeated'],
  })

type Form = z.infer<typeof schema>

export function MenuTemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId, loading: orgLoading } = useActiveOrgId()
  const templates = useMenuTemplates(activeOrgId ?? undefined)
  const template = templates.data?.find((t) => t.id === id)
  const items = useMenuTemplateItems(id)
  const createItem = useCreateMenuTemplateItem(id, activeOrgId ?? template?.orgId ?? undefined)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'menus:write')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit: 'ud',
      roundingRule: 'ceil_unit',
      qtyPerPaxSeated: 0,
      qtyPerPaxStanding: 0,
    },
  })

  const onSubmit = async (values: Form) => {
    await createItem.mutateAsync({
      name: values.name,
      unit: values.unit,
      qtyPerPaxSeated: values.qtyPerPaxSeated,
      qtyPerPaxStanding: values.qtyPerPaxStanding,
      roundingRule: values.roundingRule,
      packSize: values.packSize,
      section: values.section,
      notes: values.notes,
    })
    reset({
      unit: 'ud',
      roundingRule: 'ceil_unit',
      qtyPerPaxSeated: 0,
      qtyPerPaxStanding: 0,
      section: values.section,
    })
  }

  if (loading || orgLoading || templates.isLoading)
    return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (!session || error)
    return (
      <div className="rounded border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-red-500">Inicia sesión para ver plantillas.</p>
      </div>
    )

  if (!template) return <p className="p-4 text-sm text-red-400">Plantilla no encontrada.</p>

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Menús</p>
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <p className="text-sm text-slate-400">Categoría: {template.category}</p>
        </div>
      </header>

      <section className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Items</h2>
          <span className="text-xs text-slate-400">{items.data?.length ?? 0} items</span>
        </div>
        <div className="divide-y divide-white/10">
          {items.data?.length ? (
            items.data.map((it) => (
              <div key={it.id} className="px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                <p className="font-semibold text-slate-200">
                  {it.section ? `${it.section} - ` : ''}
                  {it.name}
                </p>
                <p className="text-xs text-slate-500">
                  {it.unit} - seated {it.qtyPerPaxSeated} - de_pie {it.qtyPerPaxStanding} -{' '}
                  {it.roundingRule} {it.packSize ? `(pack ${it.packSize})` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-400 italic">Sin items.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white">Agregar item</h3>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para editar plantillas.</p>}
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Sección</span>
            <input
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('section')}
              disabled={!canWrite}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Nombre</span>
            <input
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('name')}
              disabled={!canWrite}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Unidad</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('unit')}
              disabled={!canWrite}
            >
              <option value="ud">Unidad</option>
              <option value="kg">Kilogramo</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Qty/pax sentado</span>
            <input
              type="number"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('qtyPerPaxSeated', { setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)) })}
              disabled={!canWrite}
            />
            {errors.qtyPerPaxSeated && (
              <p className="text-xs text-red-500">{errors.qtyPerPaxSeated.message}</p>
            )}
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Qty/pax de pie</span>
            <input
              type="number"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('qtyPerPaxStanding', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
              })}
              disabled={!canWrite}
            />
            {errors.qtyPerPaxStanding && (
              <p className="text-xs text-red-500">{errors.qtyPerPaxStanding.message}</p>
            )}
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Redondeo</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('roundingRule')}
              disabled={!canWrite}
            >
              <option value="none">None</option>
              <option value="ceil_unit">Ceil unit</option>
              <option value="ceil_pack">Ceil pack</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Pack size</span>
            <input
              type="number"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('packSize', { setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)) })}
              disabled={!canWrite}
            />
            {errors.packSize && <p className="text-xs text-red-500">{errors.packSize.message}</p>}
          </label>
          <label className="md:col-span-3 space-y-1">
            <span className="text-sm font-medium text-slate-300">Notas</span>
            <textarea
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              rows={2}
              {...register('notes')}
              disabled={!canWrite}
            />
          </label>
          {createItem.isError && (
            <p className="md:col-span-3 text-sm text-red-400">
              {(createItem.error as Error).message || 'Error al crear item'}
            </p>
          )}
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting || !canWrite}
              className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              title={!canWrite ? 'Sin permisos para editar' : undefined}
            >
              {isSubmitting ? 'Guardando...' : 'Agregar item'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
