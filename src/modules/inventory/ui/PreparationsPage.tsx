import { useMemo, useState } from 'react'
import { PlusCircle, FlaskConical } from 'lucide-react'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { usePreparations, useCreatePreparation, useCreatePreparationRun } from '@/modules/inventory/data/preparations'
import { useLocations } from '@/modules/inventory/data/batches'
import type { Preparation } from '@/modules/inventory/data/preparations'

type PrepForm = {
  name: string
  defaultYieldQty: number
  defaultYieldUnit: string
  shelfLifeDays: number
  storage: 'ambient' | 'fridge' | 'freezer'
  defaultProcessType: 'cooked' | 'pasteurized' | 'vacuum' | 'frozen' | 'pasteurized_frozen'
  allergens?: string
}

type ProduceForm = {
  locationId: string
  producedQty: number
  producedUnit: string
  producedAt: string
  labelsCount: number
  processType: 'cooked' | 'pasteurized' | 'vacuum' | 'frozen' | 'pasteurized_frozen'
}

function printLabel(
  prep: Preparation,
  run: {
    producedAt: string
    expiresAt?: string | null
    locationName?: string
    batchId: string
    processType?: string
    packedBy?: string
  },
) {
  const win = window.open('', '_blank', 'width=400,height=300')
  if (!win) return
  const produced = new Date(run.producedAt).toLocaleString()
  const expires = run.expiresAt ? new Date(run.expiresAt).toLocaleString() : 'N/A'
  const content = `
  <html>
    <head>
      <style>
        @page { size: 62mm 29mm; margin: 4mm; }
        body { font-family: Arial, sans-serif; }
        .label { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
        .name { font-size: 14px; font-weight: bold; }
        .meta { font-size: 11px; }
        .code { font-family: monospace; font-size: 11px; margin-top: 4px; }
        .bar { height: 3px; background: black; margin: 4px 0; }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 500);">
      <div class="label">
        <div class="name">${prep.name}</div>
        <div class="meta">Elaborado: ${produced}</div>
        <div class="meta">Caduca: ${expires}</div>
        <div class="meta">Ubicacion: ${run.locationName ?? '-'}</div>
        <div class="meta">Proceso: ${run.processType ?? prep.defaultProcessType ?? 'cooked'}</div>
        <div class="meta">Empaquetado por: ${run.packedBy ?? '-'}</div>
        <div class="meta">Almacenaje: ${prep.storage}</div>
        <div class="bar"></div>
        <div class="code">BATCH:${run.batchId}</div>
      </div>
    </body>
  </html>`
  win.document.write(content)
  win.document.close()
}

export default function PreparationsPage() {
  const { activeOrgId } = useActiveOrgId()
  const { session, loading, error } = useSupabaseSession()
  const sessionError = useFormattedError(error)
  const preps = usePreparations(activeOrgId ?? undefined)
  const createPrep = useCreatePreparation()
  const createRun = useCreatePreparationRun()
  const locations = useLocations(activeOrgId ?? undefined, undefined)
  const [showForm, setShowForm] = useState(false)
  const [showProduceFor, setShowProduceFor] = useState<Preparation | null>(null)
  const [form, setForm] = useState<PrepForm>({
    name: '',
    defaultYieldQty: 1,
    defaultYieldUnit: 'kg',
    shelfLifeDays: 3,
    storage: 'fridge',
    defaultProcessType: 'cooked',
    allergens: '',
  })
  const [produceForm, setProduceForm] = useState<ProduceForm>({
    locationId: '',
    producedQty: 1,
    producedUnit: 'kg',
    producedAt: new Date().toISOString(),
    labelsCount: 1,
    processType: 'cooked',
  })

  const formattedError = useFormattedError(preps.error || createPrep.error || createRun.error)
  const createPrepError = useFormattedError(createPrep.error)
  const createRunError = useFormattedError(createRun.error)

  const locationOptions = locations.data ?? []
  const locationNameById = useMemo(
    () => Object.fromEntries(locationOptions.map((l) => [l.id, l.name])),
    [locationOptions],
  )

  if (loading) {
    return <Skeleton className="h-6 w-40" />
  }
  if (!session || error) {
    return <ErrorBanner title="Inicia sesión" message={sessionError || 'Necesitas iniciar sesión.'} />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Elaboraciones"
        subtitle="Define preparaciones con vida útil y genera etiquetas."
        actions={
          <button className="ds-btn ds-btn-primary" onClick={() => setShowForm(true)}>
            <PlusCircle className="h-4 w-4" /> Nueva preparación
          </button>
        }
      />

      {preps.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : preps.isError ? (
        <ErrorBanner title="Error al cargar" message={formattedError} onRetry={() => preps.refetch()} />
      ) : (
        <div className="ds-card">
          <div className="ds-section-header">
            <div>
              <h3 className="text-sm font-semibold text-white">Preparaciones</h3>
              <p className="text-xs text-slate-400">Vida útil y almacenaje</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-full">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="is-num">Rendimiento</th>
                  <th>Vida útil (días)</th>
                  <th>Almacenaje</th>
                  <th>Alérgenos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {preps.data?.length ? (
                  preps.data.map((prep) => (
                    <tr key={prep.id}>
                      <td className="font-semibold text-slate-200">{prep.name}</td>
                      <td className="is-num">
                        {prep.defaultYieldQty} {prep.defaultYieldUnit}
                      </td>
                      <td className="is-num">{prep.shelfLifeDays}</td>
                      <td className="capitalize">{prep.storage}</td>
                      <td className="text-xs text-slate-400">{prep.allergens || '-'}</td>
                      <td className="text-right">
                        <button
                          className="ds-btn ds-btn-ghost text-xs"
                          onClick={() => {
                            setShowProduceFor(prep)
                            setProduceForm((prev) => ({
                              ...prev,
                              producedQty: prep.defaultYieldQty || 1,
                              producedUnit: prep.defaultYieldUnit,
                              producedAt: new Date().toISOString(),
                              processType: prep.defaultProcessType ?? 'cooked',
                            }))
                          }}
                        >
                          <FlaskConical className="h-4 w-4" /> Producir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-slate-400">
                      Aún no hay preparaciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Nueva preparación</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-300 space-y-1">
                <span>Nombre</span>
                <input className="ds-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Rendimiento</span>
                <input
                  className="ds-input"
                  type="number"
                  value={form.defaultYieldQty}
                  onChange={(e) => setForm((f) => ({ ...f, defaultYieldQty: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Unidad</span>
                <select
                  className="ds-input"
                  value={form.defaultYieldUnit}
                  onChange={(e) => setForm((f) => ({ ...f, defaultYieldUnit: e.target.value }))}
                >
                  <option value="kg">kg</option>
                  <option value="ud">ud</option>
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Vida útil (días)</span>
                <input
                  className="ds-input"
                  type="number"
                  value={form.shelfLifeDays}
                  onChange={(e) => setForm((f) => ({ ...f, shelfLifeDays: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Almacenaje</span>
                <select className="ds-input" value={form.storage} onChange={(e) => setForm((f) => ({ ...f, storage: e.target.value as any }))}>
                  <option value="ambient">Ambiente</option>
                  <option value="fridge">Refrigerado</option>
                  <option value="freezer">Congelado</option>
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Proceso por defecto</span>
                <select
                  className="ds-input"
                  value={form.defaultProcessType}
                  onChange={(e) => setForm((f) => ({ ...f, defaultProcessType: e.target.value as any }))}
                >
                  <option value="cooked">Cocinado</option>
                  <option value="pasteurized">Pasteurizado</option>
                  <option value="vacuum">Vacio</option>
                  <option value="frozen">Congelado</option>
                  <option value="pasteurized_frozen">Pasteurizado + congelado</option>
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1 md:col-span-2">
                <span>Alérgenos</span>
                <input
                  className="ds-input"
                  value={form.allergens}
                  onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
                  placeholder="Gluten, frutos secos..."
                />
              </label>
            </div>
            {createPrep.isError && <ErrorBanner title="Error al crear" message={createPrepError} />}
            <div className="mt-4 flex justify-end gap-3">
              <button className="ds-btn ds-btn-ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button
                className="ds-btn ds-btn-primary"
                disabled={createPrep.isPending}
                onClick={async () => {
                  if (!activeOrgId || !form.name) return
                  await createPrep.mutateAsync({
                    orgId: activeOrgId,
                    name: form.name,
                    defaultYieldQty: form.defaultYieldQty,
                    defaultYieldUnit: form.defaultYieldUnit,
                    shelfLifeDays: form.shelfLifeDays,
                    storage: form.storage,
                    defaultProcessType: form.defaultProcessType,
                    allergens: form.allergens,
                  })
                  setShowForm(false)
                }}
              >
                {createPrep.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProduceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Producir {showProduceFor.name}</h3>
              <button onClick={() => setShowProduceFor(null)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-300 space-y-1">
                <span>Ubicacion</span>
                <select
                  className="ds-input"
                  value={produceForm.locationId}
                  onChange={(e) => setProduceForm((f) => ({ ...f, locationId: e.target.value }))}
                >
                  <option value="">Selecciona</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Cantidad producida</span>
                <input
                  type="number"
                  className="ds-input"
                  value={produceForm.producedQty}
                  onChange={(e) => setProduceForm((f) => ({ ...f, producedQty: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Unidad</span>
                <select
                  className="ds-input"
                  value={produceForm.producedUnit}
                  onChange={(e) => setProduceForm((f) => ({ ...f, producedUnit: e.target.value }))}
                >
                  <option value="kg">kg</option>
                  <option value="ud">ud</option>
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Fecha/hora</span>
                <input
                  type="datetime-local"
                  className="ds-input"
                  value={produceForm.producedAt.slice(0, 16)}
                  onChange={(e) => setProduceForm((f) => ({ ...f, producedAt: new Date(e.target.value).toISOString() }))}
                />
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Proceso</span>
                <select
                  className="ds-input"
                  value={produceForm.processType}
                  onChange={(e) => setProduceForm((f) => ({ ...f, processType: e.target.value as any }))}
                >
                  <option value="cooked">Cocinado</option>
                  <option value="pasteurized">Pasteurizado</option>
                  <option value="vacuum">Vacio</option>
                  <option value="frozen">Congelado</option>
                  <option value="pasteurized_frozen">Pasteurizado + congelado</option>
                </select>
              </label>
              <label className="text-xs text-slate-300 space-y-1">
                <span>Etiquetas</span>
                <input
                  type="number"
                  className="ds-input"
                  value={produceForm.labelsCount}
                  onChange={(e) => setProduceForm((f) => ({ ...f, labelsCount: Number(e.target.value) || 1 }))}
                />
              </label>
            </div>
            {createRun.isError && <ErrorBanner title="Error al producir" message={createRunError} />}
            <div className="mt-4 flex justify-end gap-3">
              <button className="ds-btn ds-btn-ghost" onClick={() => setShowProduceFor(null)}>
                Cancelar
              </button>
              <button
                className="ds-btn ds-btn-primary"
                disabled={createRun.isPending || !produceForm.locationId}
                onClick={async () => {
                  if (!activeOrgId || !showProduceFor) return
                  const res = await createRun.mutateAsync({
                    orgId: activeOrgId,
                    preparationId: showProduceFor.id,
                    locationId: produceForm.locationId,
                    producedQty: produceForm.producedQty,
                    producedUnit: produceForm.producedUnit,
                    producedAt: produceForm.producedAt,
                    processType: produceForm.processType,
                    labelsCount: produceForm.labelsCount,
                  })
                  printLabel(showProduceFor, {
                    producedAt: produceForm.producedAt,
                    expiresAt: res.expiresAt,
                    locationName: locationNameById[produceForm.locationId],
                    batchId: res.batchId,
                    processType: produceForm.processType,
                    packedBy: session?.user?.email ?? session?.user?.id ?? '-',
                  })
                  setShowProduceFor(null)
                }}
              >
                {createRun.isPending ? 'Creando lote...' : 'Confirmar producción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

