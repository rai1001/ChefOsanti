import { useQuery } from '@tanstack/react-query'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { listReports } from '../../data/reportsRepository'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileText, ChevronRight } from 'lucide-react'
import type { GeneratedReport } from '../../domain/types'
import { DataState } from '@/modules/shared/ui/DataState'

interface Props {
  onSelectReport: (report: GeneratedReport) => void
  refreshKey: number // To trigger refetch
}

export function ReportList({ onSelectReport, refreshKey }: Props) {
  const { activeOrgId } = useActiveOrgId()
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['reports', activeOrgId, refreshKey],
    queryFn: () => (activeOrgId ? listReports(activeOrgId) : Promise.resolve([])),
    enabled: !!activeOrgId,
  })

  return (
    <DataState
      loading={isLoading}
      error={error}
      errorTitle="Error al cargar informes"
      errorMessage="Intenta recargar la página."
      empty={!reports?.length}
      emptyState={
        <div className="glass-panel border-dashed border-white/10 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700/50">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white">No hay informes generados</h3>
          <p className="mt-2 text-slate-400">Genera tu primer informe para ver el análisis de IA.</p>
        </div>
      }
    >
      <div className="space-y-4">
        {reports?.map((report) => (
          <div
            key={report.id}
            onClick={() => onSelectReport(report)}
            className="glass-panel group flex cursor-pointer items-center justify-between p-4 transition-colors hover:border-nano-blue-500/50"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  report.type === 'weekly' ? 'bg-nano-blue-500/10 text-nano-blue-400' : 'bg-purple-500/10 text-purple-400'
                }`}
              >
                <span className="text-lg font-bold">{report.type === 'weekly' ? 'S' : 'M'}</span>
              </div>
              <div>
                <h4 className="font-medium text-white capitalize">
                  Informe {report.type === 'weekly' ? 'Semanal' : 'Mensual'}
                </h4>
                <p className="text-sm text-slate-400">
                  {format(new Date(report.period_start), 'd MMM', { locale: es })} -{' '}
                  {format(new Date(report.period_end), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    report.status === 'generated' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {report.status === 'generated' ? 'Completado' : 'Error'}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {format(new Date(report.created_at), 'd MMM, HH:mm', { locale: es })}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-white" />
            </div>
          </div>
        ))}
      </div>
    </DataState>
  )
}
