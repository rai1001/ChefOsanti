import { useMemo, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import {
  useCreateSupplierItem,
  useSupplier,
  useSupplierItems,
  useSupplierLeadTimes,
  useUpsertSupplierLeadTime,
  useUpdateSupplierLeadTime,
} from '@/modules/purchasing/data/suppliers'
import type { ProductType, PurchaseUnit, RoundingRule } from '@/modules/purchasing/domain/types'
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
    productTypeOverride: z.union([z.enum(['fresh', 'pasteurized', 'frozen']), z.literal('')]).optional(),
    leadTimeDaysOverride: z.number().min(0).optional(),
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

const leadTimeSchema = z.object({
  defaultLeadTimeDays: z.number().min(0, 'Minimo 0').optional(),
  freshLeadTimeDays: z.number().min(0, 'Minimo 0').optional(),
  pasteurizedLeadTimeDays: z.number().min(0, 'Minimo 0').optional(),
  frozenLeadTimeDays: z.number().min(0, 'Minimo 0').optional(),
})

type LeadTimeForm = z.infer<typeof leadTimeSchema>

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const supplier = useSupplier(id, !!session && !loading)
  const items = useSupplierItems(id, !!session && !loading)
  const leadTimes = useSupplierLeadTimes(id, !!session && !loading)
  const createItem = useCreateSupplierItem(id)
  const updateSupplierLeadTime = useUpdateSupplierLeadTime(id)
  const upsertLeadTime = useUpsertSupplierLeadTime(supplier.data?.orgId, id)
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createItem.error)
  const supplierError = useFormattedError(supplier.error)
  const itemsError = useFormattedError(items.error)
  const leadTimesError = useFormattedError(leadTimes.error)

  const {
    register,
    handleSubmit,
    reset,
    control,
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
      productTypeOverride: '',
      leadTimeDaysOverride: undefined,
    },
  })

  const {
    register: registerLeadTime,
    handleSubmit: handleSubmitLeadTime,
    reset: resetLeadTime,
    formState: { errors: leadTimeErrors, isSubmitting: leadTimeSubmitting },
  } = useForm<LeadTimeForm>({
    resolver: zodResolver(leadTimeSchema),
    defaultValues: {
      defaultLeadTimeDays: undefined,
      freshLeadTimeDays: undefined,
      pasteurizedLeadTimeDays: undefined,
      frozenLeadTimeDays: undefined,
    },
  })

  const roundingRule = useWatch({ control, name: 'roundingRule' })
  const supplierName = supplier.data?.name ?? 'Proveedor'

  const isPackRule = useMemo(() => roundingRule === 'ceil_pack', [roundingRule])
  const leadTimesByType = useMemo(() => {
    const map: Record<string, number | undefined> = {}
    for (const lt of leadTimes.data ?? []) {
      map[lt.productType] = lt.leadTimeDays
    }
    return map
  }, [leadTimes.data])

  useEffect(() => {
    resetLeadTime({
      defaultLeadTimeDays: typeof supplier.data?.leadTimeDays === 'number' ? supplier.data.leadTimeDays : undefined,
      freshLeadTimeDays: leadTimesByType.fresh,
      pasteurizedLeadTimeDays: leadTimesByType.pasteurized,
      frozenLeadTimeDays: leadTimesByType.frozen,
    })
  }, [leadTimesByType, resetLeadTime, supplier.data?.leadTimeDays])

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
    const productTypeOverride =
      typeof values.productTypeOverride === 'string' && values.productTypeOverride !== ''
        ? (values.productTypeOverride as ProductType)
        : undefined
    const leadTimeDaysOverride =
      typeof values.leadTimeDaysOverride === 'number' && !Number.isNaN(values.leadTimeDaysOverride)
        ? values.leadTimeDaysOverride
        : undefined

    await createItem.mutateAsync({
      name: values.name,
      purchaseUnit: values.purchaseUnit as PurchaseUnit,
      roundingRule: values.roundingRule as RoundingRule,
      packSize: packSize ?? null,
      pricePerUnit: pricePerUnit ?? null,
      notes: values.notes ?? null,
      productTypeOverride: productTypeOverride ?? null,
      leadTimeDaysOverride: leadTimeDaysOverride ?? null,
    })
    reset({
      name: '',
      purchaseUnit: 'ud',
      roundingRule: 'none',
      packSize: undefined,
      pricePerUnit: undefined,
      notes: '',
      productTypeOverride: '',
      leadTimeDaysOverride: undefined,
    })
  }

  const onSubmitLeadTimes = async (values: LeadTimeForm) => {
    if (typeof values.defaultLeadTimeDays === 'number') {
      await updateSupplierLeadTime.mutateAsync(values.defaultLeadTimeDays)
    }
    if (typeof values.freshLeadTimeDays === 'number') {
      await upsertLeadTime.mutateAsync({ productType: 'fresh', leadTimeDays: values.freshLeadTimeDays })
    }
    if (typeof values.pasteurizedLeadTimeDays === 'number') {
      await upsertLeadTime.mutateAsync({ productType: 'pasteurized', leadTimeDays: values.pasteurizedLeadTimeDays })
    }
    if (typeof values.frozenLeadTimeDays === 'number') {
      await upsertLeadTime.mutateAsync({ productType: 'frozen', leadTimeDays: values.frozenLeadTimeDays })
    }
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

      <section className="ds-card">
        <h3 className="text-sm font-semibold text-white">Lead times</h3>
        {leadTimes.isError && (
          <div className="mt-2">
            <ErrorBanner title="Error al cargar lead times" message={leadTimesError} />
          </div>
        )}
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmitLeadTime(onSubmitLeadTimes)}>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Lead time base (dias)</span>
            <input
              type="number"
              step="1"
              className="ds-input"
              placeholder="Ej: 2"
              {...registerLeadTime('defaultLeadTimeDays', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
            {leadTimeErrors.defaultLeadTimeDays && (
              <p className="text-xs text-red-500">{leadTimeErrors.defaultLeadTimeDays.message}</p>
            )}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Lead time fresco (dias)</span>
            <input
              type="number"
              step="1"
              className="ds-input"
              placeholder="Ej: 2"
              {...registerLeadTime('freshLeadTimeDays', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Lead time pasteurizado (dias)</span>
            <input
              type="number"
              step="1"
              className="ds-input"
              placeholder="Ej: 2"
              {...registerLeadTime('pasteurizedLeadTimeDays', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Lead time congelado (dias)</span>
            <input
              type="number"
              step="1"
              className="ds-input"
              placeholder="Ej: 7"
              {...registerLeadTime('frozenLeadTimeDays', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={leadTimeSubmitting || updateSupplierLeadTime.isPending || upsertLeadTime.isPending}
              className="ds-btn ds-btn-primary w-full disabled:opacity-60"
            >
              {leadTimeSubmitting ? 'Guardando...' : 'Guardar lead times'}
            </button>
          </div>
        </form>
      </section>

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
                    {item.productTypeOverride ? ` ú Tipo: ${item.productTypeOverride}` : ''}
                    {typeof item.leadTimeDaysOverride === 'number' ? ` ú Lead: ${item.leadTimeDaysOverride}d` : ''}
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

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Override tipo</span>
            <select className="ds-input" {...register('productTypeOverride')}>
              <option value="">Sin override</option>
              <option value="fresh">Fresh</option>
              <option value="pasteurized">Pasteurized</option>
              <option value="frozen">Frozen</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Override lead time (dias)</span>
            <input
              type="number"
              step="1"
              className="ds-input"
              placeholder="Ej: 2"
              {...register('leadTimeDaysOverride', {
                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
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
