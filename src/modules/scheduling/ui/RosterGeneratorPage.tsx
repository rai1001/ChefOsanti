import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useGenerateRoster, useSchedulingRules, useSaveSchedulingRules } from '../data/h2'
import { useFormattedError } from '@/lib/shared/useFormattedError'

export function RosterGeneratorPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const hotels = useHotels()
  const { formatError } = useFormattedError()
  const [hotelId, setHotelId] = useState('')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return monday.toISOString().slice(0, 10)
  })
  const rules = useSchedulingRules(hotelId)
  const saveRules = useSaveSchedulingRules()
  const generate = useGenerateRoster(hotelId, weekStart)
  const [preview, setPreview] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    const { title, description } = formatError(error || new Error('Selecciona una organización válida.'))
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20">
        <p className="text-sm font-semibold text-red-500">{title}</p>
        <p className="text-xs text-red-400 opacity-90">{description}</p>
      </div>
    )
  }

  const onPreview = async () => {
    setErrorMsg(null)
    try {
      const data = await generate.mutateAsync(false)
      setPreview(data)
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al generar')
    }
  }

  const onApply = async () => {
    setErrorMsg(null)
    try {
      await generate.mutateAsync(true)
      const data = await generate.mutateAsync(false)
      setPreview(data)
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al aplicar')
    }
  }

  const ruleForm = rules.data || {
    orgId: activeOrgId,
    hotelId,
    morningRequiredWeekday: 1,
    morningRequiredWeekend: 2,
    afternoonRequiredDaily: 1,
    enforceTwoConsecutiveDaysOff: true,
    enforceOneWeekendOffPer30d: true,
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Roster</p>
        <h1 className="text-2xl font-bold text-white">Generador semanal (H2)</h1>
        <p className="text-sm text-slate-400">Previsualiza turnos mañana/tarde respetando reglas básicas.</p>
        {errorMsg && <p className="mt-2 rounded bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{errorMsg}</p>}
      </header>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm md:grid-cols-3">
        <label className="text-sm">
          <span className="text-xs font-semibold text-slate-300">Hotel</span>
          <select
            className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Selecciona hotel</option>
            {(hotels.data ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs font-semibold text-slate-300">Semana (lunes)</span>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onPreview}
            disabled={!hotelId || !weekStart}
          >
            Previsualizar
          </button>
          <button
            className="rounded-md border border-white/10 bg-nano-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            onClick={onApply}
            disabled={!hotelId || !weekStart}
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Reglas del hotel</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!hotelId) return
            saveRules.mutate({
              orgId: activeOrgId,
              hotelId,
              morningRequiredWeekday: ruleForm.morningRequiredWeekday,
              morningRequiredWeekend: ruleForm.morningRequiredWeekend,
              afternoonRequiredDaily: ruleForm.afternoonRequiredDaily,
              enforceTwoConsecutiveDaysOff: ruleForm.enforceTwoConsecutiveDaysOff,
              enforceOneWeekendOffPer30d: ruleForm.enforceOneWeekendOffPer30d,
            })
          }}
        >
          <label className="text-sm">
            <span className="text-xs font-semibold text-slate-300">Mañana entre semana</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={ruleForm.morningRequiredWeekday}
              onChange={(e) => (ruleForm.morningRequiredWeekday = Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="text-xs font-semibold text-slate-300">Mañana finde</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={ruleForm.morningRequiredWeekend}
              onChange={(e) => (ruleForm.morningRequiredWeekend = Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="text-xs font-semibold text-slate-300">Tarde diario</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={ruleForm.afternoonRequiredDaily}
              onChange={(e) => (ruleForm.afternoonRequiredDaily = Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-3">
            <input
              type="checkbox"
              className="rounded border-white/10 bg-nano-navy-900 text-nano-blue-500 focus:ring-nano-blue-500"
              checked={ruleForm.enforceTwoConsecutiveDaysOff}
              onChange={(e) => (ruleForm.enforceTwoConsecutiveDaysOff = e.target.checked)}
            />
            2 días consecutivos libres (warning si no se cumple)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-3">
            <input
              type="checkbox"
              className="rounded border-white/10 bg-nano-navy-900 text-nano-blue-500 focus:ring-nano-blue-500"
              checked={ruleForm.enforceOneWeekendOffPer30d}
              onChange={(e) => (ruleForm.enforceOneWeekendOffPer30d = e.target.checked)}
            />
            1 finde libre cada 30 días (warning)
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-md border border-white/10 bg-nano-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={!hotelId}
            >
              Guardar reglas
            </button>
          </div>
        </form>
      </div>

      {preview && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white">Propuesta</h3>
          {preview.warnings?.length ? (
            <ul className="list-disc px-4 text-xs text-amber-500">
              {preview.warnings.map((w: any, idx: number) => (
                <li key={idx}>{w.message ?? w.code}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Sin warnings</p>
          )}
          <div className="overflow-auto rounded-lg border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-300">Fecha</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-300">Turno</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-300">Asignaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {preview.assignments?.map((a: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-2 py-1 text-slate-300">{a.shift_date}</td>
                    <td className="px-2 py-1 text-slate-300">{a.shift_type}</td>
                    <td className="px-2 py-1 text-slate-300">{a.staff_member_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
