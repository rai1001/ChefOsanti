import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';
import { GenerateReportDialog } from './components/GenerateReportDialog';
import type { GeneratedReport } from '../domain/types';

export default function ReportsPage() {
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            {!activeReport && (
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Reportes</h1>
                        <p className="mt-2 text-slate-400">
                            Informes operativos para dirección (Semanal / Mensual).
                        </p>
                    </div>
                    <button
                        onClick={() => setIsGenerateOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Generar Informe
                    </button>
                </div>
            )}

            {activeReport ? (
                <ReportDetail
                    report={activeReport}
                    onBack={() => setActiveReport(null)}
                />
            ) : (
                <ReportList
                    onSelectReport={setActiveReport}
                    refreshKey={refreshKey}
                />
            )}

            <GenerateReportDialog
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
