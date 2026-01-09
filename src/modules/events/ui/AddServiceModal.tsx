import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

const serviceSchema = z
    .object({
        serviceType: z.enum(['desayuno', 'coffee_break', 'comida', 'merienda', 'cena', 'coctel', 'otros']),
        format: z.enum(['sentado', 'de_pie']),
        startsAt: z.string().min(1, 'Inicio obligatorio'),
        endsAt: z.string().optional(),
        pax: z.number().nonnegative('Pax >= 0'),
        notes: z.string().optional(),
    })
    .refine(
        (data) => {
            if (!data.endsAt) return true
            const start = new Date(data.startsAt).getTime()
            const end = new Date(data.endsAt).getTime()
            return Number.isFinite(start) && Number.isFinite(end) && end > start
        },
        { message: 'Fin debe ser posterior al inicio', path: ['endsAt'] },
    )

export type ServiceForm = z.infer<typeof serviceSchema>

interface AddServiceModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: ServiceForm) => Promise<void>
}

export function AddServiceModal({ isOpen, onClose, onSubmit }: AddServiceModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ServiceForm>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            serviceType: 'cena',
            format: 'sentado',
            pax: 0,
            startsAt: '',
            endsAt: '',
            notes: '',
        },
    })

    const handleFormSubmit = async (data: ServiceForm) => {
        await onSubmit(data)
        reset({
            serviceType: 'cena',
            format: 'sentado',
            pax: 0,
            startsAt: '',
            endsAt: '',
            notes: '',
        })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Añadir servicio</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleFormSubmit)}>
                    <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-300">Tipo de servicio</span>
                        <select
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all"
                            {...register('serviceType')}
                        >
                            <option value="desayuno" className="bg-nano-navy-900">Desayuno</option>
                            <option value="coffee_break" className="bg-nano-navy-900">Coffee break</option>
                            <option value="comida" className="bg-nano-navy-900">Comida</option>
                            <option value="merienda" className="bg-nano-navy-900">Merienda</option>
                            <option value="cena" className="bg-nano-navy-900">Cena</option>
                            <option value="coctel" className="bg-nano-navy-900">Cóctel</option>
                            <option value="otros" className="bg-nano-navy-900">Otros</option>
                        </select>
                        {errors.serviceType && (
                            <p className="text-xs text-red-400">{errors.serviceType.message}</p>
                        )}
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-300">Formato</span>
                        <select
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all"
                            {...register('format')}
                        >
                            <option value="sentado" className="bg-nano-navy-900">Sentado</option>
                            <option value="de_pie" className="bg-nano-navy-900">De pie</option>
                        </select>
                        {errors.format && <p className="text-xs text-red-400">{errors.format.message}</p>}
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-300">Inicio</span>
                        <input
                            type="datetime-local"
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                            {...register('startsAt')}
                        />
                        {errors.startsAt && <p className="text-xs text-red-400">{errors.startsAt.message}</p>}
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-300">Fin (opcional)</span>
                        <input
                            type="datetime-local"
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                            {...register('endsAt')}
                        />
                        {errors.endsAt && <p className="text-xs text-red-400">{errors.endsAt.message}</p>}
                    </label>

                    <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-300">Pax</span>
                        <input
                            type="number"
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                            {...register('pax', {
                                setValueAs: (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v)),
                            })}
                        />
                        {errors.pax && <p className="text-xs text-red-400">{errors.pax.message}</p>}
                    </label>

                    <label className="md:col-span-2 space-y-1">
                        <span className="text-xs font-medium text-slate-300">Notas</span>
                        <textarea
                            className="w-full rounded-md border border-white/10 bg-nano-navy-900/50 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:ring-1 focus:ring-nano-blue-500 outline-none transition-all placeholder:text-slate-600"
                            rows={2}
                            {...register('notes')}
                        />
                    </label>

                    <div className="md:col-span-2 mt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Añadir servicio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
