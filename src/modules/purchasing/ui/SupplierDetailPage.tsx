import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import {
  useCreateSupplierItem,
  useSupplier,
  useSupplierItems,
} from '@/modules/purchasing/data/suppliers'
import type { PurchaseUnit, RoundingRule } from '@/modules/purchasing/domain/types'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const itemSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    purchaseUnit: z.enum(['kg', 'ud']),
    roundingRule: z.enum(['ceil_pack', 'ceil_unit', 'none']),
    packSize: z.number().optional(),
    pricePerUnit: z.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.roundingRule === 'ceil_pack' && (!data.packSize || data.packSize <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['packSize'],
        message: 'Obligatorio cuando la regla es por pack',
      })
    }
  })

type ItemForm = z.infer<typeof itemSchema>

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const supplier = useSupplier(id, !!session && !loading)
  const items = useSupplierItems(id, !!session && !loading)
  const createItem = useCreateSupplierItem(id)
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createItem.error)
  const supplierError = useFormattedError(supplier.error)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      purchaseUnit: 'ud',
      roundingRule: 'none',
      packSize: undefined,
      pricePerUnit: undefined,
      notes: '',
    },
  })

  const roundingRule = watch('roundingRule')

  const onSubmit = async (values: ItemForm) => {
    const packSize =
      typeof values.packSize === 'number' && !Number.isNaN(values.packSize)
        ? values.packSize
        : undefined
    const pricePerUnit =
      typeof values.pricePerUnit === 'number' && !Number.isNaN(values.pricePerUnit)
        ? values.pricePerUnit
        : undefined

    await createItem.mutateAsync({
      name: values.name,
      purchaseUnit: values.purchaseUnit as PurchaseUnit,
      roundingRule: values.roundingRule as RoundingRule,
      packSize: packSize ?? null,
      pricePerUnit: pricePerUnit ?? null,
      notes: values.notes ?? null,
    })
    reset({
      name: '',
      purchaseUnit: 'ud',
      roundingRule: 'none',
      packSize: undefined,
      pricePerUnit: undefined,
      notes: '',
    })
  }

  const isPackRule = useMemo(() => roundingRule === 'ceil_pack', [roundingRule])

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

  if (supplier.isError) {
    return (
      <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 m-4">
        <p className="font-semibold text-red-400">Error al cargar proveedor</p>
        <p className="text-sm text-red-400/80">{supplierError}</p>
      </div>
    )
  }



  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Compras</p>
          <div className="flex items-center gap-2">
            <Link to="/purchasing/suppliers" className="text-sm text-nano-blue-400 hover:text-nano-blue-300 underline transition-colors">
              Proveedores
            </Link>
            <span className="text-slate-400">/</span>
            <h1 className="text-2xl font-bold text-white">
              {supplier.data?.name ?? 'Proveedor'}
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Añade artículos con reglas de redondeo y unidades de compra.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Artículos</h2>
          {items.isLoading && (
            <span className="text-xs text-slate-400">Cargando artículos...</span>
          )}
        </div>
        <div className="divide-y divide-white/10">
          {items.data?.length ? (
            items.data.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    Unidad: {item.purchaseUnit} · Regla: {item.roundingRule}
                    {item.packSize ? ` · Pack: ${item.packSize}` : ''}{' '}
                    {item.pricePerUnit ? `· Precio: €${item.pricePerUnit}` : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-400 italic">Sin artículos aún.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white">Añadir artículo</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Nombre</span>
            <input
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              placeholder="Producto"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Unidad de compra</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('purchaseUnit')}
            >
              <option value="ud">Unidades</option>
              <option value="kg">Kilogramos</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Regla de redondeo</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('roundingRule')}
            >
              <option value="none">Sin redondeo</option>
              <option value="ceil_unit">Redondear a unidad</option>
              <option value="ceil_pack">Redondear por pack</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Tamaño de pack</span>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              placeholder="Ej: 5"
              {...register('packSize', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
            {errors.packSize && <p className="text-xs text-red-500">{errors.packSize.message}</p>}
            {isPackRule && (
              <p className="text-xs text-slate-400">Obligatorio cuando se redondea por pack.</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Precio por unidad (EUR)</span>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              placeholder="Ej: 2.50"
              {...register('pricePerUnit', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
            {errors.pricePerUnit && (
              <p className="text-xs text-red-500">{errors.pricePerUnit.message}</p>
            )}
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Notas</span>
            <textarea
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              placeholder="Detalles adicionales"
              rows={3}
              {...register('notes')}
            />
          </label>

          {createItem.isError && (
            <div className="md:col-span-2 rounded-md bg-red-500/10 p-2">
              <p className="text-xs font-medium text-red-400">Error</p>
              <p className="text-[10px] text-red-400/80">{createError}</p>
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Añadir artículo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
