import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';
import { GenerateReportDialog } from './components/GenerateReportDialog';
import type { GeneratedReport } from '../domain/types';
import { PageHeader } from '@/modules/shared/ui/PageHeader';

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
                <PageHeader
                    title="Reportes"
                    subtitle="Informes operativos para dirección (Semanal / Mensual)."
                    actions={
                        <button
                            onClick={() => setIsGenerateOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Generar Informe
                        </button>
                    }
                />
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
