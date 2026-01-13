import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateSupplier, useSuppliersInfinite } from '../data/suppliers'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { Truck } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from '@/modules/shared/ui/Toast' // Ensure this path is correct
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Tooltip } from '@/modules/shared/ui/Tooltip'
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
      toast.success('Proveedor creado correctamente')
      reset()
    } catch (e) {
      logger.error('Error al crear proveedor', e, { orgId: activeOrgId ?? undefined })
      toast.error('Error al crear proveedor')
    }
  }

  const [isImporterOpen, setIsImporterOpen] = useState(false)
  // queryClient removed

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (!session || error) {
    return <ErrorBanner title="Inicia sesión para gestionar proveedores." message={sessionError} />
  }

  if (!activeOrgId) {
    return (
      <ErrorBanner
        title="Selecciona una organización"
        message="No se encontraron organizaciones asignadas a tu usuario."
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona proveedores y artículos con aislamiento por organización."
        actions={
          canWrite && (
            <button
              onClick={() => setIsImporterOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-nano-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Importar
            </button>
          )
        }
      />

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Listado</h2>
            {suppliers.isLoading && (
              <span className="text-xs text-slate-400">Cargando proveedores...</span>
            )}
          </div>
          <div className="divide-y divide-white/10">
            {suppliers.isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ) : suppliers.data?.pages.flatMap((page: Supplier[]) => page).length ? (
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
              <div className="py-8">
                <EmptyState
                  icon={Truck}
                  title="Sin proveedores"
                  description="Registra tus proveedores para gestionar pedidos y stock."
                  action={
                    canWrite ? (
                      <button
                        onClick={() => setIsImporterOpen(true)}
                        className="text-sm font-semibold text-nano-blue-400 hover:text-nano-blue-300 underline"
                      >
                        Importar proveedores
                      </button>
                    ) : undefined
                  }
                />
              </div>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Nuevo proveedor</h3>
            <Tooltip content="Los proveedores se usan en pedidos y alias de importación.">
              <span className="text-xs text-slate-400 cursor-help">?</span>
            </Tooltip>
          </div>
          {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
          <form className="mt-3 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <FormField
                id="supplier-name"
                label="Nombre"
                placeholder="Proveedor mayorista"
                className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
                error={errors.name}
                {...register('name')}
                disabled={!canWrite}
              />
            </div>
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
