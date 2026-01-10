export default function ReportsPage() {

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Reportes</h1>
                    <p className="mt-2 text-slate-400">
                        Informes operativos para dirección (Semanal / Mensual).
                    </p>
                </div>
                <button
                    disabled
                    className="btn-primary opacity-50 cursor-not-allowed"
                >
                    Generar Informe
                </button>
            </div>

            <div className="glass-panel p-12 text-center border-dashed border-white/10">
                <div className="mx-auto h-16 w-16 bg-nano-blue-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-medium text-white">Módulo en construcción</h3>
                <p className="mt-2 text-slate-400 max-w-md mx-auto">
                    Próximamente podrás generar informes automáticos con KPIs de eventos, compras y personal, analizados por IA.
                </p>
            </div>
        </div>
    );
}
