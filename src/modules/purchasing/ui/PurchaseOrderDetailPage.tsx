import { useMemo, useState } from 'react'
import { Mail, Printer, Download, CheckCircle, Clock3 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import {
  useAddPurchaseOrderLine,
  useIngredients,
  usePurchaseOrder,
  useReceivePurchaseOrder,
  useSupplierItemsList,
  useSuppliersLite,
} from '../data/orders'
import { ApprovalActions } from './ApprovalActions'
import type { PurchaseUnit, RoundingRule } from '../domain/types'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Card } from '@/modules/shared/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'

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
  const ingredients = useIngredients(purchaseOrder.data?.order.orgId, purchaseOrder.data?.order.hotelId)
  const addLine = useAddPurchaseOrderLine(id)
  const receivePo = useReceivePurchaseOrder(id)
  const sessionError = useFormattedError(error)
  const addLineError = useFormattedError(addLine.error)
  const poError = useFormattedError(purchaseOrder.error)
  const receiveError = useFormattedError(receivePo.error)
  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LineForm>({
    resolver: zodResolver(lineSchema),
    defaultValues: {
      requestedQty: 1,
      purchaseUnit: 'ud',
      roundingRule: 'none',
    },
  })

  const roundingRule = useWatch({ control, name: 'roundingRule' })
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
      receivedQty: l.requestedQty,
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
      `Total estimado: $${order.totalEstimated?.toFixed(2)}\n\n` +
      `Lineas:\n` +
      lines
        .map((l) => `- ${ingredientMap[l.ingredientId] || l.ingredientId}: ${l.requestedQty} ${l.purchaseUnit}`)
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
  const totalLines = lines.length
  const totalCost = order?.totalEstimated ?? 0
  const statusTone = order?.approvalStatus === 'approved' ? 'success' : order?.approvalStatus === 'pending' ? 'warning' : 'neutral'

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Purchasing / Suppliers</p>
            <h1 className="text-3xl font-semibold text-foreground">Purchase Order #{order?.orderNumber ?? ''}</h1>
            <p className="text-sm text-muted-foreground">Supplier: {supplierName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone} className="capitalize">
              {order?.approvalStatus ?? 'pending'}
            </Badge>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              PDF
            </Button>
            <Button variant="secondary" onClick={handleEmailExport}>
              <Mail size={16} />
              Email PO
            </Button>
            <Button variant="primary">
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier</p>
            <p className="text-lg font-semibold text-foreground">{supplierName}</p>
            <p className="text-sm text-muted-foreground">contact@{supplierName.toLowerCase().replace(/\s+/g, '')}.com</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery Date</p>
            <p className="text-lg font-semibold text-foreground">Not set</p>
            <p className="text-sm text-muted-foreground">Expected</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Items</p>
            <p className="text-lg font-semibold text-foreground">{totalLines}</p>
            <p className="text-sm text-muted-foreground">Open lines</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Estimated</p>
            <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
            <p className="text-sm text-success">Awaiting Approval</p>
          </div>
        </div>
      </Card>

      {order && (
        <ApprovalActions entityType="purchase_order" entityId={order.id} currentStatus={order.approvalStatus} />
      )}

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-0 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Line Items</p>
            <p className="text-xs text-muted-foreground">Supplier Items mapped to Catalog</p>
          </div>
          {isDraft && (
            <Button size="sm" onClick={() => {}} variant="secondary">
              Add Line
            </Button>
          )}
        </div>
        {lines.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Sin lineas" description="Agrega articulos para este pedido." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id} className="hover:bg-white/5">
                  <TableCell className="space-y-1">
                    <p className="font-semibold text-foreground">{ingredientMap[l.ingredientId] ?? l.ingredientId}</p>
                    <p className="text-xs text-muted-foreground">
                      Supplier: {supplierItemMap[l.supplierItemId] ?? l.supplierItemId}
                    </p>
                  </TableCell>
                  <TableCell className="text-foreground">{l.requestedQty} {l.purchaseUnit}</TableCell>
                  <TableCell className="text-foreground">${(l.unitPrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-foreground">${(l.lineTotal ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="gap-1">
                      <CheckCircle size={14} />
                      Requested
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground flex items-center gap-1">
                    <Clock3 size={14} className="text-muted-foreground" />
                    TBD
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isDraft && (
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Add Line Item</p>
            {addLine.isError && <p className="text-xs text-danger">{addLineError}</p>}
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmitLine)}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="supplierItemId">Articulo proveedor</label>
              <select id="supplierItemId" className="ds-input" {...register('supplierItemId')}>
                <option value="">Selecciona</option>
                {supplierItems.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplierItemId && <p className="text-xs text-danger">{errors.supplierItemId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="ingredientId">Ingrediente</label>
              <select id="ingredientId" className="ds-input" {...register('ingredientId')}>
                <option value="">Selecciona</option>
                {ingredients.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {errors.ingredientId && <p className="text-xs text-danger">{errors.ingredientId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="requestedQty">Cantidad solicitada</label>
              <input
                id="requestedQty"
                type="number"
                step="0.01"
                className="ds-input"
                {...register('requestedQty', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                })}
              />
              {errors.requestedQty && <p className="text-xs text-danger">{errors.requestedQty.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="purchaseUnit">Unidad</label>
              <select id="purchaseUnit" className="ds-input" {...register('purchaseUnit')}>
                <option value="ud">Unidades</option>
                <option value="kg">Kilogramos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="roundingRule">Regla de redondeo</label>
              <select id="roundingRule" className="ds-input" {...register('roundingRule')}>
                <option value="none">Sin redondeo</option>
                <option value="ceil_unit">Redondear a unidad</option>
                <option value="ceil_pack">Redondear por pack</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="packSize">Tamano de pack</label>
              <input
                id="packSize"
                type="number"
                step="0.01"
                className="ds-input"
                {...register('packSize', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
              {errors.packSize && <p className="text-xs text-danger">{errors.packSize.message}</p>}
              {roundingRule === 'ceil_pack' && (
                <p className="text-xs text-muted-foreground">Obligatorio si redondeas por pack.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="unitPrice">Precio unitario</label>
              <input
                id="unitPrice"
                type="number"
                step="0.01"
                className="ds-input"
                {...register('unitPrice', {
                  setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)),
                })}
              />
              {errors.unitPrice && <p className="text-xs text-danger">{errors.unitPrice.message}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Anadiendo...' : 'Guardar linea'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isConfirmed && (
        <>
          <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recepcion</h3>
              <Button variant="primary" onClick={() => setConfirmReceiveOpen(true)} disabled={receivePo.isPending}>
                {receivePo.isPending ? 'Recibiendo...' : 'Recibir'}
              </Button>
            </div>
            {receivePo.isError && (
              <div className="mt-2">
                <ErrorBanner title="Error al recibir" message={receiveError} />
              </div>
            )}
          </Card>
          <ConfirmDialog
            open={confirmReceiveOpen}
            title="Confirmar recepcion"
            description="Recibir este pedido actualizara el stock y cerrara el pedido."
            confirmLabel="Recibir"
            onCancel={() => setConfirmReceiveOpen(false)}
            onConfirm={async () => {
              await onReceive()
              setConfirmReceiveOpen(false)
            }}
          />
        </>
      )}
    </div>
  )
}
