import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateProduct, useProducts } from '../data/products'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

export function ProductsPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const products = useProducts(activeOrgId ?? undefined)
  const createProduct = useCreateProduct(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [baseUnit, setBaseUnit] = useState<'kg' | 'ud'>('ud')
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando organización...</p>
  if (error || !activeOrgId)
    return <p className="p-4 text-sm text-red-600">Selecciona una organización válida.</p>

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !canWrite) return
    await createProduct.mutateAsync({ name: name.trim(), baseUnit })
    setName('')
    setBaseUnit('ud')
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Catalogo</p>
        <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
        <p className="text-sm text-slate-600">Productos globales por organizacion.</p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Nuevo producto</h2>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
        <form className="mt-3 flex flex-col gap-2 md:flex-row md:items-end" onSubmit={onSubmit}>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700" htmlFor="product-name">Nombre</label>
            <input
              id="product-name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700" htmlFor="product-unit">Unidad base</label>
            <select
              id="product-unit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={createProduct.isPending || !canWrite}
            title={!canWrite ? 'Sin permisos' : undefined}
          >
            {createProduct.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          {products.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {products.data?.length ? (
            products.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-600">
                    Unidad: {p.baseUnit} - Activo: {p.active ? 'Si' : 'No'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">Sin productos.</p>
          )}
        </div>
      </div>
    </div>
  )
}
