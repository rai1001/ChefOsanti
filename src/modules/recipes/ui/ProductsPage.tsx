import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateProduct, useProducts } from '../data/products'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { Package } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from '@/modules/shared/ui/Toast'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

export default function ProductsPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const products = useProducts(activeOrgId ?? undefined)
  const createProduct = useCreateProduct(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [baseUnit, setBaseUnit] = useState<'kg' | 'ud'>('ud')
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')
  const [isImporterOpen, setIsImporterOpen] = useState(false)
  // queryClient removed
  const formattedError = useFormattedError(error)
  const createError = useFormattedError(createProduct.error)

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/5">
        <p className="text-sm text-red-500">Selecciona una organización válida.</p>
        {formattedError && <p className="text-xs text-red-400 mt-1">{formattedError}</p>}
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !canWrite) return
    try {
      await createProduct.mutateAsync({ name: name.trim(), baseUnit })
      toast.success('Producto creado')
      setName('')
      setBaseUnit('ud')
    } catch (e) {
      toast.error('Error al crear producto')
    }
  }



  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Catálogo</p>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-slate-400">Productos globales por organización.</p>
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

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Nuevo producto</h2>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
        <form className="mt-3 flex flex-col gap-2 md:flex-row md:items-end" onSubmit={onSubmit}>
          <div className="flex flex-col flex-1">
            <FormField
              id="product-name"
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
              placeholder="Nombre del producto"
              className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
            />
          </div>
          <div className="flex flex-col w-32">
            <label className="text-xs font-semibold text-slate-300 mb-1.5" htmlFor="product-unit">Unidad base</label>
            <select
              id="product-unit"
              className="h-10 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value as 'kg' | 'ud')}
              disabled={!canWrite}
            >
              <option value="ud">ud</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={createProduct.isPending || !canWrite}
            title={!canWrite ? 'Sin permisos' : undefined}
          >
            {createProduct.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </form>
        {createError && (
          <div className="mt-2 text-xs text-red-400">
            <span className="font-semibold">Error:</span> {createError}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Listado</h2>
          {products.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <div className="divide-y divide-white/10">
          {products.data?.length ? (
            products.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    Unidad: {p.baseUnit} - Activo: {p.active ? 'Si' : 'No'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8">
              <EmptyState
                icon={Package}
                title="Sin productos"
                description="Crea productos base o impórtalos para usarlos en tus recetas."
                action={
                  <button
                    onClick={() => setIsImporterOpen(true)}
                    className="text-sm font-semibold text-nano-blue-400 hover:text-nano-blue-300 underline"
                  >
                    Importar productos
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="Productos"
        entity="products"
        fields={[
          { key: 'name', label: 'Nombre' },
          { key: 'baseUnit', label: 'Unidad (kg/ud)', transform: (val) => (val === 'kg' ? 'kg' : 'ud') },
        ]}
      />
    </div>
  )
}
