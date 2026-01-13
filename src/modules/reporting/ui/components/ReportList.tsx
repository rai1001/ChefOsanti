import { useQuery } from '@tanstack/react-query';
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg';
import { listReports } from '../../data/reportsRepository';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, ChevronRight } from 'lucide-react';
import type { GeneratedReport } from '../../domain/types';
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner';
import { Skeleton } from '@/modules/shared/ui/Skeleton';

interface Props {
    onSelectReport: (report: GeneratedReport) => void;
    refreshKey: number; // To trigger refetch
}

export function ReportList({ onSelectReport, refreshKey }: Props) {
    const { activeOrgId } = useActiveOrgId();
    const { data: reports, isLoading, error } = useQuery({
        queryKey: ['reports', activeOrgId, refreshKey],
        queryFn: () => activeOrgId ? listReports(activeOrgId) : Promise.resolve([]),
        enabled: !!activeOrgId
    });

    if (isLoading) return (
        <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/4" />
        </div>
    );
    if (error) return <ErrorBanner title="Error al cargar informes" message="Intenta recargar la página." />;

    if (!reports?.length) {
        return (
            <div className="glass-panel p-12 text-center border-dashed border-white/10">
                <div className="mx-auto h-16 w-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-white">No hay informes generados</h3>
                <p className="mt-2 text-slate-400">Genera tu primer informe para ver el análisis de IA.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reports.map((report) => (
                <div
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className="glass-panel p-4 flex items-center justify-between cursor-pointer hover:border-nano-blue-500/50 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.type === 'weekly' ? 'bg-nano-blue-500/10 text-nano-blue-400' : 'bg-purple-500/10 text-purple-400'
                            }`}>
                            <span className="font-bold text-lg">{report.type === 'weekly' ? 'S' : 'M'}</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-white capitalize">
                                Informe {report.type === 'weekly' ? 'Semanal' : 'Mensual'}
                            </h4>
                            <p className="text-sm text-slate-400">
                                {format(new Date(report.period_start), 'd MMM', { locale: es })} - {format(new Date(report.period_end), 'd MMM yyyy', { locale: es })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${report.status === 'generated' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                {report.status === 'generated' ? 'Completado' : 'Error'}
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                                {format(new Date(report.created_at), "d MMM, HH:mm", { locale: es })}
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                </div>
            ))}
        </div>
    );
}
