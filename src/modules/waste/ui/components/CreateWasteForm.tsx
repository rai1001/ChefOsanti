
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/modules/shared/ui/Button'
import { FormField } from '@/modules/shared/ui/FormField'
import { useActiveOrgId } from '@/modules/shared/auth/useActiveOrgId'
import { useWasteReasons } from '../../data/wasteReasons'
import { useProducts } from '@/modules/recipes/data/recipes'
import { useHotels } from '@/modules/purchasing/data/orders'
import { useCreateWasteEntry } from '../../data/wasteEntries'
import { formatCurrency } from '@/lib/utils'

const wasteSchema = z.object({
    occurredAt: z.string().min(1, 'Required'),
    hotelId: z.string().min(1, 'Required'),
    productId: z.string().min(1, 'Required'),
    quantity: z.number().min(0.001, 'Min 0.001'),
    unit: z.string().min(1, 'Required'),
    unitCost: z.number().min(0, 'Min 0'),
    reasonId: z.string().min(1, 'Required'),
    notes: z.string().optional(),
})

type WasteFormValues = z.infer<typeof wasteSchema>

interface Props {
    onSuccess: () => void
    onCancel: () => void
}

export function CreateWasteForm({ onSuccess, onCancel }: Props) {
    const orgId = useActiveOrgId()
    const { data: reasons } = useWasteReasons(orgId)
    const { data: products } = useProducts(orgId)
    const { data: hotels } = useHotels(orgId)
    const { mutateAsync: createEntry, isPending } = useCreateWasteEntry(orgId)

    const defaultHotel = hotels?.[0]?.id || ''

    const form = useForm<WasteFormValues>({
        resolver: zodResolver(wasteSchema),
        defaultValues: {
            occurredAt: new Date().toISOString().slice(0, 16), // datetime-local format
            hotelId: defaultHotel,
            productId: '',
            quantity: 0,
            unit: 'kg',
            unitCost: 0,
            reasonId: '',
            notes: '',
        },
    })

    // Watch for dependent fields
    const watchedProductId = form.watch('productId')
    const quantity = form.watch('quantity')
    const unitCost = form.watch('unitCost')

    // Auto-fill unit and cost when product changes
    useEffect(() => {
        if (watchedProductId && products) {
            const product = products.find((p) => p.id === watchedProductId)
            if (product) {
                form.setValue('unit', product.baseUnit)
                form.setValue('unitCost', product.cost)
            }
        }
    }, [watchedProductId, products, form])

    const onSubmit = async (data: WasteFormValues) => {
        try {
            await createEntry({
                occurredAt: new Date(data.occurredAt),
                hotelId: data.hotelId,
                productId: data.productId,
                quantity: data.quantity,
                unit: data.unit,
                unitCost: data.unitCost,
                totalCost: data.quantity * data.unitCost,
                reasonId: data.reasonId,
                notes: data.notes
            })
            onSuccess()
        } catch (err) {
            console.error(err)
            // Error is handled by global query error or we can add toast here
        }
    }

    const selectedProduct = products?.find(p => p.id === watchedProductId)
    const calculatedTotal = quantity && unitCost ? quantity * unitCost : 0

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Fecha y Hora" error={form.formState.errors.occurredAt}>
                    <input
                        type="datetime-local"
                        className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                        {...form.register('occurredAt')}
                    />
                </FormField>

                <FormField label="Hotel" error={form.formState.errors.hotelId}>
                    <select
                        className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                        {...form.register('hotelId')}
                    >
                        <option value="">Seleccionar Hotel</option>
                        {hotels?.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            <FormField label="Producto" error={form.formState.errors.productId}>
                <select
                    className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                    {...form.register('productId')}
                >
                    <option value="">Seleccionar Producto</option>
                    {products?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </FormField>

            <div className="grid grid-cols-3 gap-4 mobile:grid-cols-1">
                <FormField label="Cantidad" error={form.formState.errors.quantity}>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            step="0.001"
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                            {...form.register('quantity', { valueAsNumber: true })}
                        />
                        <span className="text-sm text-slate-400 w-8">{selectedProduct?.baseUnit || '-'}</span>
                    </div>
                </FormField>

                <FormField label="Coste Unitario (€)" error={form.formState.errors.unitCost}>
                    <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                        {...form.register('unitCost', { valueAsNumber: true })}
                    />
                </FormField>

                <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-slate-300">Total Estimado</span>
                    <div className="h-10 flex items-center px-3 text-nano-blue-400 font-bold bg-white/5 rounded-md">
                        {formatCurrency(calculatedTotal)}
                    </div>
                </div>
            </div>

            <FormField label="Motivo de Merma" error={form.formState.errors.reasonId}>
                <select
                    className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                    {...form.register('reasonId')}
                >
                    <option value="">Seleccionar Motivo</option>
                    {reasons?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </FormField>

            <FormField label="Notas (Opcional)" error={form.formState.errors.notes}>
                <textarea
                    className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-nano-blue-500 min-h-[80px]"
                    {...form.register('notes')}
                />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Registrando...' : 'Registrar Merma'}
                </Button>
            </div>
        </form>
    )
}
