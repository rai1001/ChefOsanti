import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useUserMemberships } from '@/modules/orgs/data/memberships'
import { useCreateSupplier, useSuppliers } from '../data/suppliers'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
})

type SupplierForm = z.infer<typeof supplierSchema>

export function SuppliersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { data: memberships } = useUserMemberships(!!session && !loading)
  const orgId = memberships?.[0]?.orgId
  const suppliers = useSuppliers(!!session && !!orgId && !loading)
  const createSupplier = useCreateSupplier(orgId)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'purchasing:write')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = async (values: SupplierForm) => {
    await createSupplier.mutateAsync(values)
    reset()
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-600">Cargando sesión...</p>
  }

  if (!session || error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-red-600">Inicia sesión para gestionar proveedores.</p>
        {error && <p className="text-xs text-slate-500">{error.message}</p>}
      </div>
    )
  }

  if (!orgId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700">
          No se encontraron organizaciones asignadas a tu usuario.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Compras</p>
          <h1 className="text-2xl font-semibold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-600">
            Gestiona proveedores y artículos con aislamiento por organización.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
            {suppliers.isLoading && (
              <span className="text-xs text-slate-500">Cargando proveedores...</span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {suppliers.data?.length ? (
              suppliers.data.map((supplier) => (
                <Link
                  key={supplier.id}
                  to={`/purchasing/suppliers/${supplier.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                    <p className="text-xs text-slate-500">
                      Creado el {new Date(supplier.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <span className="text-xs text-brand-700">Ver detalle</span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-600">
                No hay proveedores registrados todavía.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Nuevo proveedor</h3>
          {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
          <form className="mt-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800">Nombre</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Proveedor mayorista"
                {...register('name')}
                disabled={!canWrite}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </label>
            {createSupplier.isError && (
              <p className="text-xs text-red-600">
                {(createSupplier.error as Error).message || 'Error al crear proveedor.'}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !canWrite}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              title={!canWrite ? 'Sin permisos' : undefined}
            >
              {isSubmitting ? 'Creando...' : 'Crear proveedor'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
