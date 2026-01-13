import { useMemo, useState } from 'react'
import { Printer, Mail } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import {
  useAddPurchaseOrderLine,
  useIngredients,
  usePurchaseOrder,
  useReceivePurchaseOrder,
  useSupplierItemsList,
  useSuppliersLite,
  useUpdatePurchaseOrderStatus,
} from '../data/orders'
import { ApprovalActions } from './ApprovalActions'
import type { PurchaseUnit, RoundingRule } from '../domain/types'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'

const lineSchema = z
  .object({
    supplierItemId: z.string().min(1, 'Selecciona articulo proveedor'),
    ingredientId: z.string().min(1, 'Selecciona ingrediente'),
    requestedQty: z.number().min(0, 'Cantidad requerida'),
    purchaseUnit: z.enum(['kg', 'ud']),
    roundingRule: z.enum(['ceil_pack', 'ceil_unit', 'none']),
    packSize: z.number().optional(),
    unitPrice: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.roundingRule === 'ceil_pack' && (!data.packSize || data.packSize <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['packSize'],
        message: 'Obligatorio con redondeo por pack',
      })
    }
  })

type LineForm = z.infer<typeof lineSchema>

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const purchaseOrder = usePurchaseOrder(id)
  const suppliers = useSuppliersLite(activeOrgId ?? undefined)
  const supplierId = purchaseOrder.data?.order.supplierId
  const supplierItems = useSupplierItemsList(supplierId)
  const ingredients = useIngredients(purchaseOrder.data?.order.hotelId)
  const addLine = useAddPurchaseOrderLine(id)
  const updateStatus = useUpdatePurchaseOrderStatus(id)
  const receivePo = useReceivePurchaseOrder(id)
  const [received, setReceived] = useState<Record<string, number>>({})
  const sessionError = useFormattedError(error)
  const addLineError = useFormattedError(addLine.error)
  const poError = useFormattedError(purchaseOrder.error)
  const receiveError = useFormattedError(receivePo.error)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LineForm>({
    resolver: zodResolver(lineSchema),
    defaultValues: {
      requestedQty: 1,
      purchaseUnit: 'ud',
      roundingRule: 'none',
    },
  })

  const roundingRule = watch('roundingRule')
  const isDraft = purchaseOrder.data?.order.status === 'draft'
  const isConfirmed = purchaseOrder.data?.order.status === 'confirmed'

  const supplierName = useMemo(
    () => suppliers.data?.find((s) => s.id === supplierId)?.name ?? 'Proveedor',
    [suppliers.data, supplierId],
  )

  const ingredientMap = useMemo(
    () =>
      (ingredients.data ?? []).reduce<Record<string, string>>((acc, ing) => {
        acc[ing.id] = ing.name
        return acc
      }, {}),
    [ingredients.data],
  )
  const supplierItemMap = useMemo(
    () =>
      (supplierItems.data ?? []).reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.name
        return acc
      }, {}),
    [supplierItems.data],
  )

  const onSubmitLine = async (values: LineForm) => {
    await addLine.mutateAsync({
      supplierItemId: values.supplierItemId,
      ingredientId: values.ingredientId,
      requestedQty: values.requestedQty,
      purchaseUnit: values.purchaseUnit as PurchaseUnit,
      roundingRule: values.roundingRule as RoundingRule,
      packSize: values.packSize ?? null,
      unitPrice: values.unitPrice ?? null,
    })
    reset({ requestedQty: 1, purchaseUnit: 'ud', roundingRule: 'none', packSize: undefined })
  }

  const onReceive = async () => {
    const lines = purchaseOrder.data?.lines ?? []
    const payload = lines.map((l) => ({
      lineId: l.id,
      receivedQty: received[l.id] ?? l.requestedQty,
    }))
    await receivePo.mutateAsync(payload)
    await purchaseOrder.refetch()
  }

  const handleEmailExport = () => {
    if (!purchaseOrder.data) return
    const order = purchaseOrder.data.order
    const lines = purchaseOrder.data.lines
    const subject = `Pedido ${order.orderNumber} - ${supplierName}`
    const body =
      `Resumen del pedido:\n\n` +
      `Numero: ${order.orderNumber}\n` +
      `Proveedor: ${supplierName}\n` +
      `Total estimado: €${order.totalEstimated?.toFixed(2)}\n\n` +
      `Lineas:\n` +
      lines
        .map(
          (l) => `- ${ingredientMap[l.ingredientId] || l.ingredientId}: ${l.requestedQty} ${l.purchaseUnit}`,
        )
        .join('\n')

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  if (!session || error) {
    return <ErrorBanner title="Inicia sesion" message={sessionError || 'Inicia sesion para ver pedidos.'} />
  }

  if (purchaseOrder.isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }
  if (purchaseOrder.isError) {
    return <ErrorBanner title="Error al cargar pedido" message={poError} onRetry={() => purchaseOrder.refetch()} />
  }

  const order = purchaseOrder.data?.order
  const lines = purchaseOrder.data?.lines ?? []

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={`Pedido ${order?.orderNumber ?? ''}`}
        subtitle={`Proveedor: ${supplierName} - Estado: ${order?.status ?? 'N/D'}`}
        actions={
          <div className="flex gap-2 print:hidden">
            {isDraft && (
              <button
                className="ds-btn ds-btn-primary"
                onClick={async () => {
                  await updateStatus.mutateAsync('confirmed')
                }}
              >
                Confirmar
              </button>
            )}
            <button onClick={() => window.print()} className="ds-btn ds-btn-ghost">
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline">PDF</span>
            </button>
            <button onClick={handleEmailExport} className="ds-btn ds-btn-ghost">
              <Mail className="h-4 w-4" />
              <span className="hidden md:inline">Enviar</span>
            </button>
          </div>
        }
      />

      {order && (
        <ApprovalActions
          entityType="purchase_order"
          entityId={order.id}
          currentStatus={order.approvalStatus}
        />
      )}

      <section className="ds-card p-0">
        <div className="ds-section-header">
          <h2 className="text-sm font-semibold text-white">Lineas</h2>
          <span className="text-xs text-slate-400">Total €{order?.totalEstimated?.toFixed(2)}</span>
        </div>
        <div className="divide-y divide-white/10">
          {lines.length ? (
            lines.map((l) => (
              <div
                key={l.id}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-white/5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {ingredientMap[l.ingredientId] ?? l.ingredientId}
                  </p>
                  <p className="text-xs text-slate-500">
                    Articulo prov: {supplierItemMap[l.supplierItemId] ?? l.supplierItemId} • Solic:{' '}
                    {l.requestedQty} {l.purchaseUnit} • Regla {l.roundingRule}{' '}
                    {l.packSize ? `(pack ${l.packSize})` : ''} • €{l.unitPrice ?? 0} • Total €
                    {l.lineTotal?.toFixed(2)}
                  </p>
                </div>
                {isConfirmed && (
                  <input
                    type="number"
                    step="0.01"
                    className="ds-input w-32"
                    defaultValue={l.requestedQty}
                    onChange={(e) => setReceived({ ...received, [l.id]: Number(e.target.value) })}
                  />
                )}
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm italic text-slate-400">Sin lineas todavia.</p>
          )}
        </div>
      </section>

      {isDraft && (
        <section className="ds-card print:hidden">
          <h3 className="text-sm font-semibold text-white">Anadir linea</h3>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmitLine)}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-300">Articulo proveedor</span>
              <select className="ds-input" {...register('supplierItemId')}>
                <option value="">Selecciona</option>
                {supplierItems.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplierItemId && (
                <p className="text-xs text-red-500">{errors.supplierItemId.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-300">Ingrediente</span>
              <select className="ds-input" {...register('ingredientId')}>
                <option value="">Selecciona</option>
                {ingredients.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {errors.ingredientId && (
                <p className="text-xs text-red-500">{errors.ingredientId.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-300">Cantidad solicitada</span>
              <input
                type="number"
                step="0.01"
                className="ds-input"
                {...register('requestedQty', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                })}
              />
              {errors.requestedQty && (
                <p className="text-xs text-red-500">{errors.requestedQty.message}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-300">Unidad</span>
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
              <span className="text-sm font-medium text-slate-300">Tamano de pack</span>
              <input
                type="number"
                step="0.01"
                className="ds-input"
                {...register('packSize', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
              {errors.packSize && <p className="text-xs text-red-500">{errors.packSize.message}</p>}
              {roundingRule === 'ceil_pack' && (
                <p className="text-xs text-slate-400">Obligatorio si redondeas por pack.</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-300">Precio unitario</span>
              <input
                type="number"
                step="0.01"
                className="ds-input"
                {...register('unitPrice', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
              {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
            </label>

            {addLine.isError && (
              <div className="md:col-span-2">
                <ErrorBanner title="Error al anadir linea" message={addLineError} />
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="ds-btn ds-btn-primary w-full disabled:opacity-60"
              >
                {isSubmitting ? 'Anadiendo...' : 'Anadir linea'}
              </button>
            </div>
          </form>
        </section>
      )}

      {isConfirmed && (
        <section className="ds-card print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recepcion</h3>
            <button
              className="ds-btn ds-btn-primary"
              onClick={onReceive}
              disabled={receivePo.isPending}
            >
              {receivePo.isPending ? 'Recibiendo...' : 'Recibir'}
            </button>
          </div>
          {receivePo.isError && (
            <div className="mt-2">
              <ErrorBanner title="Error al recibir" message={receiveError} />
            </div>
          )}
        </section>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          .animate-fade-in { animation: none !important; }
          section { border: 1px solid #ddd !important; box-shadow: none !important; background: white !important; }
          h1, h2, h3, p, span, div { color: black !important; }
          .divide-white\\/10 > * { border-color: #eee !important; }
          .border-white\\/10 { border-color: #eee !important; }
          .bg-nano-navy-800\\/50 { background: white !important; }
          .bg-nano-navy-900 { background: white !important; }
        }
      `}</style>
    </div>
  )
}
