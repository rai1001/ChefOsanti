import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useProducts } from '../data/products'
import { useAddRecipeLine, useRecipe, useRemoveRecipeLine } from '../data/recipes'
import { computeRecipeNeeds } from '../domain/recipes'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { activeOrgId, loading, error } = useActiveOrgId()
  const recipe = useRecipe(id)
  const products = useProducts(activeOrgId ?? undefined)
  const addLine = useAddRecipeLine(id, activeOrgId ?? undefined)
  const removeLine = useRemoveRecipeLine(id)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')

  const [productId, setProductId] = useState<string>('')
  const [qty, setQty] = useState<number>(0)
  const [unit, setUnit] = useState<'kg' | 'ud'>('ud')
  const [servingsTarget, setServingsTarget] = useState<number>(0)

  const linesScaled = useMemo(() => {
    if (!recipe.data || servingsTarget <= 0) return []
    try {
      return computeRecipeNeeds(
        recipe.data.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unit: l.unit,
          productBaseUnit: l.productBaseUnit,
        })),
        servingsTarget,
        recipe.data.defaultServings,
      )
    } catch (_e) {
      return []
    }
  }, [recipe.data, servingsTarget])

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando organización...</p>
  if (error || !activeOrgId) return <p className="p-4 text-sm text-red-600">Selecciona organización.</p>
  if (recipe.isLoading) return <p className="p-4 text-sm text-slate-600">Cargando receta...</p>
  if (recipe.isError || !recipe.data)
    return <p className="p-4 text-sm text-red-600">No se pudo cargar la receta.</p>

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || qty <= 0 || !canWrite) return
    await addLine.mutateAsync({ productId, qty, unit })
    setProductId('')
    setQty(0)
    setUnit('ud')
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Receta</p>
          <h1 className="text-2xl font-semibold text-slate-900">{recipe.data.name}</h1>
          <p className="text-sm text-slate-600">Raciones base: {recipe.data.defaultServings}</p>
        </div>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Líneas</h2>
          <span className="text-xs text-slate-500">{recipe.data.lines.length} items</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recipe.data.lines.length ? (
            recipe.data.lines.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{l.productName ?? l.productId}</p>
                  <p className="text-xs text-slate-600">
                    Cantidad: {l.qty} {l.unit}
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-red-600 disabled:text-slate-400"
                  onClick={() => l.id && canWrite && removeLine.mutate(l.id)}
                  aria-label={`Eliminar ${l.productName ?? l.productId}`}
                  disabled={!canWrite}
                >
                  Borrar
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">Sin líneas.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Añadir ingrediente</h3>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para editar.</p>}
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700" id="product-select-label">
              Producto
            </span>
            <select
              aria-labelledby="product-select-label"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                const p = products.data?.find((pr) => pr.id === e.target.value)
                if (p) setUnit(p.baseUnit)
              }}
              disabled={!canWrite}
            >
              <option value="">Selecciona</option>
              {products.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.baseUnit})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700" id="qty-label">
              Cantidad
            </span>
            <input
              aria-labelledby="qty-label"
              type="number"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700" id="unit-label">
              Unidad
            </span>
            <select
              aria-labelledby="unit-label"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'kg' | 'ud')}
              disabled={!canWrite}
            >
              <option value="ud">ud</option>
              <option value="kg">kg</option>
            </select>
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={addLine.isPending || !canWrite}
              title={!canWrite ? 'Sin permisos' : undefined}
            >
              {addLine.isPending ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Calcular raciones</h3>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Raciones objetivo:
            <input
              type="number"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={servingsTarget}
              onChange={(e) => setServingsTarget(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <div className="mt-3 divide-y divide-slate-100">
          {linesScaled.length ? (
            linesScaled.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-sm">
                <span>{products.data?.find((p) => p.id === l.productId)?.name ?? l.productId}</span>
                <span>
                  {l.qty.toFixed(2)} {l.unit}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Introduce raciones objetivo para ver cantidades.</p>
          )}
        </div>
      </div>
    </div>
  )
}
