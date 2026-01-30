import { useState } from 'react'
import { toast } from 'sonner'
import type { Product } from '../domain/recipes'

interface RecipeIngredientFormProps {
  products: (Product & { category?: string | null; active: boolean })[] | undefined
  canWrite: boolean
  isAdding: boolean
  onAdd: (data: { productId: string; qty: number; unit: 'kg' | 'ud' }) => Promise<void>
}

export function RecipeIngredientForm({ products, canWrite, isAdding, onAdd }: RecipeIngredientFormProps) {
  const [productId, setProductId] = useState<string>('')
  const [qty, setQty] = useState<number>(0)
  const [unit, setUnit] = useState<'kg' | 'ud'>('ud')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || qty <= 0 || !canWrite) return
    try {
      await onAdd({ productId, qty, unit })
      toast.success('Ingrediente añadido')
      setProductId('')
      setQty(0)
      setUnit('ud')
    } catch {
      toast.error('Error al añadir ingrediente')
    }
  }

  return (
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
              const p = products?.find((pr) => pr.id === e.target.value)
              if (p) setUnit(p.baseUnit)
            }}
            disabled={!canWrite}
          >
            <option value="">Selecciona</option>
            {products?.map((p) => (
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
            disabled={isAdding || !canWrite}
            title={!canWrite ? 'Sin permisos' : undefined}
          >
            {isAdding ? 'Guardando...' : 'Añadir'}
          </button>
        </div>
      </form>
    </div>
  )
}
