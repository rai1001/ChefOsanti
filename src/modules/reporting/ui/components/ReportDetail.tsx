import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Calendar, DollarSign, Users } from 'lucide-react';
import type { GeneratedReport } from '../../domain/types';

interface Props {
    report: GeneratedReport;
    onBack: () => void;
}

export function ReportDetail({ report, onBack }: Props) {
    const kpis = report.metrics_json;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver
                </button>
                <div className="text-right">
                    <span className="text-sm text-slate-500">Generado el {format(new Date(report.created_at), "PPP p", { locale: es })}</span>
                </div>
            </div>

            <div className="glass-panel p-6 border-l-4 border-l-nano-blue-500">
                <h1 className="text-3xl font-bold text-white mb-2 capitalize">
                    Informe {report.type === 'weekly' ? 'Semanal' : 'Mensual'}
                </h1>
                <p className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(report.period_start), 'PPP', { locale: es })} - {format(new Date(report.period_end), 'PPP', { locale: es })}
                </p>
            </div>

            {/* KPI Cards Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Calendar className="w-5 h-5" /></div>
                        <h3 className="font-medium text-slate-300">Eventos</h3>
                    </div>
                    <div className="text-2xl font-bold text-white">{kpis.events?.total_events || 0}</div>
                    <div className="text-sm text-slate-400 mt-1">
                        {kpis.events?.confirmed_events || 0} Confirmados
                        {kpis.trends?.events_growth_pct ? (
                            <span className={`ml-2 ${kpis.trends.events_growth_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {kpis.trends.events_growth_pct > 0 ? '+' : ''}{kpis.trends.events_growth_pct}%
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="glass-panel p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><DollarSign className="w-5 h-5" /></div>
                        <h3 className="font-medium text-slate-300">Compras Estimadas</h3>
                    </div>
                    <div className="text-2xl font-bold text-white">${kpis.purchasing?.total_spend?.toLocaleString() || 0}</div>
                    <div className="text-sm text-slate-400 mt-1">
                        {kpis.trends?.spend_growth_pct ? (
                            <span className={`${kpis.trends.spend_growth_pct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {kpis.trends.spend_growth_pct > 0 ? '+' : ''}{kpis.trends.spend_growth_pct}%
                            </span>
                        ) : null} vs anterior
                    </div>
                </div>

                <div className="glass-panel p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><Users className="w-5 h-5" /></div>
                        <h3 className="font-medium text-slate-300">Staff Horas</h3>
                    </div>
                    <div className="text-2xl font-bold text-white">{kpis.staff?.total_hours || 0}h</div>
                    <div className="text-sm text-slate-400 mt-1">
                        {kpis.staff?.total_shifts || 0} Turnos
                    </div>
                </div>
            </div>

            {/* Markdown Content */}
            <div className="glass-panel p-8">
                <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-nano-blue-400">
                    <ReactMarkdown>{report.report_md || '*Sin contenido generado*'}</ReactMarkdown>
                </article>
            </div>

        </div>
    );
}
