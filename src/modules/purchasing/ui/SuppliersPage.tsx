import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateSupplier, useSuppliersInfinite } from '../data/suppliers'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { useState } from 'react'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { logger } from '@/lib/shared/logger'
import type { Supplier } from '../domain/types'

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
})

type SupplierForm = z.infer<typeof supplierSchema>

export default function SuppliersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const suppliers = useSuppliersInfinite(activeOrgId ?? undefined, !!session && !!activeOrgId && !loading)
  const createSupplier = useCreateSupplier(activeOrgId ?? undefined)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'purchasing:write')
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createSupplier.error)

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
    try {
      await createSupplier.mutateAsync(values)
      reset()
    } catch (e) {
      logger.error('Error al crear proveedor', e, { orgId: activeOrgId ?? undefined })
    }
  }

  const [isImporterOpen, setIsImporterOpen] = useState(false)
  // queryClient removed

  if (loading) {
    return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  }

  if (!session || error) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-red-500">Inicia sesión para gestionar proveedores.</p>
        <div className="mt-2 text-xs text-slate-400">
          <p className="font-semibold text-red-400">Error</p>
          <p>{sessionError}</p>
        </div>
      </div>
    )
  }

  if (!activeOrgId) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-400">
          No se encontraron organizaciones asignadas a tu usuario.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Compras</p>
          <h1 className="text-2xl font-bold text-white">Proveedores</h1>
          <p className="text-sm text-slate-400">
            Gestiona proveedores y artículos con aislamiento por organización.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsImporterOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-nano-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Importar
          </button>
        )}
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Listado</h2>
            {suppliers.isLoading && (
              <span className="text-xs text-slate-400">Cargando proveedores...</span>
            )}
          </div>
          <div className="divide-y divide-white/10">
            {suppliers.data?.pages.flatMap((page: Supplier[]) => page).length ? (
              suppliers.data.pages
                .flatMap((page: Supplier[]) => page)
                .map((supplier: Supplier) => (
                  <Link
                    key={supplier.id}
                    to={`/purchasing/suppliers/${supplier.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {supplier.name}
                      </p>
                      <p className="text-xs text-slate-500 group-hover:text-slate-400">
                        Creado el {new Date(supplier.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-nano-blue-400 group-hover:text-nano-blue-300 transition-colors">
                      Ver detalle
                    </span>
                  </Link>
                ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400 italic">
                No hay proveedores registrados todavía.
              </p>
            )}
          </div>
          {suppliers.hasNextPage && (
            <div className="p-4 border-t border-white/10 text-center">
              <button
                onClick={() => suppliers.fetchNextPage()}
                disabled={suppliers.isFetchingNextPage}
                className="text-sm font-medium text-nano-blue-400 hover:text-nano-blue-300 disabled:opacity-50 transition-colors"
              >
                {suppliers.isFetchingNextPage ? 'Cargando más...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm h-fit">
          <h3 className="text-sm font-semibold text-white">Nuevo proveedor</h3>
          {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
          <form className="mt-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-300">Nombre</span>
              <input
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
                placeholder="Proveedor mayorista"
                {...register('name')}
                disabled={!canWrite}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </label>
            {createError && (
              <div className="rounded-md bg-red-500/10 p-2">
                <p className="text-xs font-medium text-red-400">Error</p>
                <p className="text-[10px] text-red-400/80">{createError}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !canWrite}
              className="w-full rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              title={!canWrite ? 'Sin permisos' : undefined}
            >
              {isSubmitting ? 'Creando...' : 'Crear proveedor'}
            </button>
          </form>
        </div>
      </section>

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="Proveedores"
        entity="suppliers"
        fields={[{ key: 'name', label: 'Nombre' }]}
      />
    </div>
  )
}
