import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels, useSuppliersLite, useCreatePurchaseOrder } from '../data/orders'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const schema = z.object({
  hotelId: z.string().min(1, 'Hotel obligatorio'),
  supplierId: z.string().min(1, 'Proveedor obligatorio'),
  orderNumber: z.string().min(1, 'Número de pedido obligatorio'),
  notes: z.string().optional(),
})

type Form = z.infer<typeof schema>

export default function NewPurchaseOrderPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const suppliers = useSuppliersLite(activeOrgId ?? undefined)
  const createOrder = useCreatePurchaseOrder()
  const navigate = useNavigate()

  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createOrder.error)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    },
  })

  const onSubmit = async (values: Form) => {
    const orgId = hotels.data?.find((h) => h.id === values.hotelId)?.orgId
    const po = await createOrder.mutateAsync({ ...values, orgId: orgId ?? '' })
    navigate(`/purchasing/orders/${po.id}`)
  }

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando sesión...</p>
  if (!session || error) {
    return (
      <div className="rounded border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm font-semibold text-red-500">Error</p>
        <p className="text-xs text-red-400 opacity-90">{sessionError || 'Inicia sesión para crear pedidos.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Compras</p>
        <h1 className="text-2xl font-bold text-white">Nuevo pedido</h1>
        <p className="text-sm text-slate-400">Selecciona hotel y proveedor, y asigna un número.</p>
      </header>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Hotel</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('hotelId')}
            >
              <option value="">Selecciona hotel</option>
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {errors.hotelId && <p className="text-xs text-red-500">{errors.hotelId.message}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Proveedor</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              {...register('supplierId')}
            >
              <option value="">Selecciona proveedor</option>
              {suppliers.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Número de pedido</span>
            <input
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              placeholder="PO-20240101-001"
              {...register('orderNumber')}
            />
            {errors.orderNumber && (
              <p className="text-xs text-red-500">{errors.orderNumber.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-300">Notas</span>
            <textarea
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              rows={3}
              placeholder="Detalle opcional"
              {...register('notes')}
            />
          </label>

          {createOrder.isError && (
            <div className="text-sm text-red-500">
              <span className="font-semibold block">Error:</span>
              <span className="text-xs opacity-90">{createError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear pedido'}
          </button>
        </form>
      </div>
    </div>
  )
}
