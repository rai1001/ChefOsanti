export function PurchasingPlaceholder() {
  return (
    <section className="space-y-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Módulo</p>
          <h2 className="text-2xl font-semibold text-slate-900">Purchasing</h2>
          <p className="text-sm text-slate-600">
            Placeholder A0. Aquí vivirá la gestión de compras, órdenes y proveedores.
          </p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
          En construcción
        </span>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Próximos pasos del slice P1/P2</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Conectar a Supabase con RLS por organización.</li>
          <li>Listados iniciales de hoteles y proveedores.</li>
          <li>Flujos de aprobación y adjuntos por orden.</li>
        </ul>
      </div>
    </section>
  )
}
