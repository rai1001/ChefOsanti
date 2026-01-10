import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { generateReport } from '../../data/reportsRepository';
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg';

const schema = z.object({
    type: z.enum(['weekly', 'monthly'] as const),
    referenceDate: z.string().optional(), // YYYY-MM-DD
});

type FormData = z.infer<typeof schema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GenerateReportDialog({ isOpen, onClose, onSuccess }: Props) {
    const { activeOrgId } = useActiveOrgId();
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: 'weekly',
            referenceDate: new Date().toISOString().split('T')[0]
        }
    });

    const onSubmit = async (data: FormData) => {
        if (!activeOrgId) return;
        setIsLoading(true);
        try {
            const date = data.referenceDate ? new Date(data.referenceDate) : new Date();
            await generateReport(activeOrgId, data.type, date);
            toast.success('Informe generado correctamente');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al generar el informe: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Generar Nuevo Informe</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Informe</label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="cursor-pointer">
                                <input type="radio" value="weekly" {...register('type')} className="sr-only peer" />
                                <div className="bg-slate-800 border-2 border-slate-700 peer-checked:border-nano-blue-500 peer-checked:bg-nano-blue-500/10 rounded-lg p-3 text-center transition-all">
                                    <span className="font-semibold text-white">Semanal</span>
                                </div>
                            </label>
                            <label className="cursor-pointer">
                                <input type="radio" value="monthly" {...register('type')} className="sr-only peer" />
                                <div className="bg-slate-800 border-2 border-slate-700 peer-checked:border-purple-500 peer-checked:bg-purple-500/10 rounded-lg p-3 text-center transition-all">
                                    <span className="font-semibold text-white">Mensual</span>
                                </div>
                            </label>
                        </div>
                        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Referencia</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="date"
                                {...register('referenceDate')}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-nano-blue-500 transition-colors"
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">El informe incluirá el periodo completo anterior a esta fecha.</p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
