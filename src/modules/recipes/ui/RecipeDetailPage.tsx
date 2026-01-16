import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useProducts } from '../data/products'
import { useAddRecipeLine, useRecipe, useRemoveRecipeLine, useRecipeCostBreakdown, useRecipeCostSummary, useRecipeMiseEnPlace } from '../data/recipes'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { toast } from 'sonner'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { activeOrgId, loading, error } = useActiveOrgId()
  const recipe = useRecipe(id)
  const products = useProducts(activeOrgId ?? undefined)
  const addLine = useAddRecipeLine(id, activeOrgId ?? undefined)
  const removeLine = useRemoveRecipeLine(id)
  const costSummary = useRecipeCostSummary(id)
  const costBreakdown = useRecipeCostBreakdown(id)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')
  const formattedError = useFormattedError(error)
  const recipeError = useFormattedError(recipe.error)
  const costError = useFormattedError(costSummary.error ?? costBreakdown.error)

  const [productId, setProductId] = useState<string>('')
  const [qty, setQty] = useState<number>(0)
  const [unit, setUnit] = useState<'kg' | 'ud'>('ud')
  const [miseMode, setMiseMode] = useState<'servings' | 'packs'>('servings')
  const [miseQty, setMiseQty] = useState<number>(0)

  const miseParams = useMemo(() => {
    if (miseQty <= 0) return undefined
    return miseMode === 'servings' ? { servings: miseQty } : { packs: miseQty }
  }, [miseMode, miseQty])
  const mise = useRecipeMiseEnPlace(id, miseParams)
  const effectiveServings =
    miseMode === 'packs' && recipe.data && miseQty > 0
      ? Math.round(recipe.data.defaultServings * miseQty)
      : miseMode === 'servings'
        ? miseQty
        : 0

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/5">
        <p className="text-sm text-red-500">Selecciona organización.</p>
        {formattedError && <p className="text-xs text-red-400 mt-1">{formattedError}</p>}
      </div>
    )
  }
  if (recipe.isLoading) return <p className="p-4 text-sm text-slate-400">Cargando receta...</p>
  if (recipe.isError || !recipe.data) {
    return (
      <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/5">
        <p className="text-sm text-red-400">No se pudo cargar la receta.</p>
        {recipeError && <p className="text-xs text-red-400 mt-1">{recipeError}</p>}
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || qty <= 0 || !canWrite) return
    try {
      await addLine.mutateAsync({ productId, qty, unit })
      toast.success('Ingrediente añadido')
      setProductId('')
      setQty(0)
      setUnit('ud')
    } catch {
      toast.error('Error al añadir ingrediente')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Receta</p>
          <h1 className="text-2xl font-bold text-white">{recipe.data.name}</h1>
          <p className="text-sm text-slate-400">Raciones base: {recipe.data.defaultServings}</p>
        </div>
      </header>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Líneas</h2>
          <span className="text-xs text-slate-400">{recipe.data.lines.length} items</span>
        </div>
        <div className="divide-y divide-white/10">
          {recipe.data.lines.length ? (
            recipe.data.lines.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{l.productName ?? l.productId}</p>
                  <p className="text-xs text-slate-500">
                    Cantidad: {l.qty} {l.unit}
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:text-slate-600"
                  onClick={async () => {
                    if (!l.id || !canWrite) return
                    try {
                      await removeLine.mutateAsync(l.id)
                      toast.success('Ingrediente eliminado')
                    } catch {
                      toast.error('Error al eliminar')
                    }
                  }}
                  aria-label={`Eliminar ${l.productName ?? l.productId}`}
                  disabled={!canWrite || removeLine.isPending}
                >
                  Borrar
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-400 italic">Sin líneas.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Costes y escandallo</h2>
          {costSummary.data && (
            <span className="text-xs text-slate-400">
              Total {costSummary.data.totalCost.toFixed(2)} / racion {costSummary.data.costPerServing.toFixed(2)}
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          {costSummary.isLoading || costBreakdown.isLoading ? (
            <p className="text-sm text-slate-400">Calculando costes...</p>
          ) : costError ? (
            <p className="text-sm text-red-400">No se pudo cargar el coste. {costError}</p>
          ) : costSummary.data ? (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Coste total</p>
                  <p className="text-lg font-semibold text-white">{costSummary.data.totalCost.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Coste por racion</p>
                  <p className="text-lg font-semibold text-white">{costSummary.data.costPerServing.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Sin precio</p>
                  <p className="text-lg font-semibold text-amber-300">{costSummary.data.missingPrices}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Unidades distintas</p>
                  <p className="text-lg font-semibold text-amber-300">{costSummary.data.unitMismatches}</p>
                </div>
              </div>
              <div className="divide-y divide-white/10">
                {costBreakdown.data && costBreakdown.data.length ? (
                  costBreakdown.data.map((line) => (
                    <div key={line.lineId} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="text-slate-200 font-semibold">{line.productName}</p>
                        <p className="text-xs text-slate-500">
                          {line.qty} {line.unit} | compra {line.purchaseUnit ?? '--'} | precio{' '}
                          {line.unitPrice !== null && line.unitPrice !== undefined ? line.unitPrice.toFixed(2) : '--'}
                        </p>
                        {(line.missingPrice || line.unitMismatch) && (
                          <p className="text-[11px] text-amber-300">
                            {line.missingPrice ? 'Sin precio' : 'OK'}
                            {line.missingPrice && line.unitMismatch ? ' / ' : ''}
                            {line.unitMismatch ? 'Unidad distinta' : ''}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-slate-200">
                        {line.lineCost !== null && line.lineCost !== undefined ? line.lineCost.toFixed(2) : '--'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin lineas con coste.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 italic">Sin datos de coste.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white">Añadir ingrediente</h3>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para editar.</p>}
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300" id="product-select-label">
              Producto
            </span>
            <select
              aria-labelledby="product-select-label"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
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
            <span className="text-xs font-semibold text-slate-300" id="qty-label">
              Cantidad
            </span>
            <input
              aria-labelledby="qty-label"
              type="number"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300" id="unit-label">
              Unidad
            </span>
            <select
              aria-labelledby="unit-label"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
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
              className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={addLine.isPending || !canWrite}
              title={!canWrite ? 'Sin permisos' : undefined}
            >
              {addLine.isPending ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white">Mise en place</h3>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Modo:
            <select
              className="rounded-md border border-white/10 bg-nano-navy-900 px-2 py-1 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={miseMode}
              onChange={(e) => setMiseMode(e.target.value as 'servings' | 'packs')}
            >
              <option value="servings">Raciones</option>
              <option value="packs">Packs</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            {miseMode === 'servings' ? 'Raciones objetivo:' : 'Packs objetivo:'}
            <input
              type="number"
              className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors w-24"
              value={miseQty}
              onChange={(e) => setMiseQty(Number(e.target.value) || 0)}
            />
          </label>
          {miseMode === 'packs' && recipe.data && miseQty > 0 && (
            <span className="text-xs text-slate-400">Total raciones: {effectiveServings}</span>
          )}
        </div>
        <div className="mt-3 divide-y divide-white/10">
          {mise.isLoading ? (
            <p className="text-sm text-slate-400">Calculando mise en place...</p>
          ) : mise.isError ? (
            <p className="text-sm text-red-400">No se pudo calcular la mise en place.</p>
          ) : mise.data && mise.data.length ? (
            mise.data.map((l, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-200">{l.productName ?? l.productId}</span>
                <span className="text-slate-400 font-mono">
                  {l.qty.toFixed(2)} {l.unit}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 italic">
              Define raciones o packs para ver cantidades.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
