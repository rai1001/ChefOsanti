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
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Tooltip } from '@/modules/shared/ui/Tooltip'

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
  const itemsError = useFormattedError(items.error)

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
  const supplierName = supplier.data?.name ?? 'Proveedor'

  const isPackRule = useMemo(() => roundingRule === 'ceil_pack', [roundingRule])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (!session || error) {
    return (
      <ErrorBanner
        title="Inicia sesi¢n"
        message={sessionError || 'Inicia sesi¢n para gestionar proveedores.'}
      />
    )
  }

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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={supplierName}
        subtitle="A¤ade art¡culos con reglas de redondeo y unidades de compra."
        actions={
          <Link
            to="/purchasing/suppliers"
            className="text-sm font-semibold text-nano-blue-400 underline transition-colors hover:text-nano-blue-300"
          >
            Volver a proveedores
          </Link>
        }
      />

      {supplier.isError && (
        <ErrorBanner
          title="Error al cargar proveedor"
          message={supplierError}
          onRetry={() => supplier.refetch()}
        />
      )}

      <section className="ds-card p-0">
        <div className="ds-section-header">
          <h2 className="text-sm font-semibold text-white">Art¡culos</h2>
          {items.isLoading && <span className="text-xs text-slate-400">Cargando art¡culos...</span>}
        </div>
        <div className="divide-y divide-white/10">
          {items.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="ds-skeleton h-4 w-1/2" />
              <Skeleton className="ds-skeleton h-4 w-3/4" />
            </div>
          ) : items.isError ? (
            <div className="p-4">
              <ErrorBanner
                title="Error al cargar art¡culos"
                message={itemsError}
                onRetry={() => items.refetch()}
              />
            </div>
          ) : items.data?.length ? (
            items.data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    Unidad: {item.purchaseUnit} ú Regla: {item.roundingRule}
                    {item.packSize ? ` ú Pack: ${item.packSize}` : ''}{' '}
                    {item.pricePerUnit ? `ú Precio: ?${item.pricePerUnit}` : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm italic text-slate-400">Sin art¡culos a£n.</p>
          )}
        </div>
      </section>

      <section className="ds-card">
        <h3 className="text-sm font-semibold text-white">A¤adir art¡culo</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Nombre</span>
            <input
              className="ds-input"
              placeholder="Producto"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Unidad de compra</span>
            <select className="ds-input" {...register('purchaseUnit')}>
              <option value="ud">Unidades</option>
              <option value="kg">Kilogramos</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Regla de redondeo</span>
            <select className="ds-input" {...register('roundingRule')}>
              <option value="none">Sin redondeo</option>
              <option value="ceil_unit">Redondear a unidad</option>
              <option value="ceil_pack">Redondear por pack</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Tama¤o de pack</span>
              <Tooltip content="Usado cuando la regla es por pack.">
                <span className="text-xs text-slate-400 underline decoration-dotted">i</span>
              </Tooltip>
            </div>
            <input
              type="number"
              step="0.01"
              className="ds-input"
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
              className="ds-input"
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
              className="ds-input min-h-[96px]"
              placeholder="Detalles adicionales"
              rows={3}
              {...register('notes')}
            />
          </label>

          {createItem.isError && (
            <div className="md:col-span-2">
              <ErrorBanner title="Error al crear art¡culo" message={createError} />
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn ds-btn-primary w-full disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'A¤adir art¡culo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
