import { useMemo, useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useStaffMembers } from '@/modules/staff/data/staff'
import { computeMissing, getWeekDays, type ShiftType } from '../domain/shifts'
import { useAssignStaff, useShifts, useUnassignStaff, useUpsertShift, type ShiftRow } from '../data/shifts'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const shiftDefaults: Record<ShiftType, { starts: string; ends: string }> = {
  desayuno: { starts: '07:00', ends: '15:00' },
  bar_tarde: { starts: '15:00', ends: '23:00' },
  eventos: { starts: '10:00', ends: '18:00' },
  produccion: { starts: '08:00', ends: '16:00' },
  libre: { starts: '00:00', ends: '23:59' },
}

const shiftOrder: ShiftType[] = ['desayuno', 'bar_tarde', 'eventos', 'produccion', 'libre']

function getMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export default function SchedulingPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const hotels = useHotels()
  const formattedError = useFormattedError(error)
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [weekStart, setWeekStart] = useState<string>(getMonday())
  const shifts = useShifts(selectedHotel, weekStart)
  const staff = useStaffMembers(activeOrgId ?? undefined, true)
  const upsertShift = useUpsertShift(activeOrgId ?? undefined, selectedHotel, weekStart)
  const assign = useAssignStaff(activeOrgId ?? undefined, selectedHotel, weekStart)
  const unassign = useUnassignStaff(selectedHotel, weekStart)
  const [assignTarget, setAssignTarget] = useState<{ shiftId: string; staffId: string }>({ shiftId: '', staffId: '' })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'scheduling:write')

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])

  const hotelOptions = hotels.data ?? []

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, ShiftRow>()
    shifts.data?.forEach((s) => {
      map.set(`${s.shiftDate}-${s.shiftType}`, s)
    })
    return map
  }, [shifts.data])

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20">
        <p className="text-sm font-semibold text-red-500">Error</p>
        <p className="text-xs text-red-400 opacity-90">{formattedError || 'Selecciona una organización válida.'}</p>
      </div>
    )
  }

  const handleCreate = async (day: string, type: ShiftType) => {
    if (!selectedHotel || !canWrite) return
    setErrorMsg(null)
    try {
      const defaults = shiftDefaults[type]
      await upsertShift.mutateAsync({
        shiftDate: day,
        shiftType: type,
        startsAt: defaults.starts,
        endsAt: defaults.ends,
        requiredCount: 1,
      })
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al crear turno')
    }
  }

  const handleAssign = async () => {
    if (!assignTarget.shiftId || !assignTarget.staffId || !canWrite) return
    setErrorMsg(null)
    try {
      await assign.mutateAsync({ shiftId: assignTarget.shiftId, staffMemberId: assignTarget.staffId })
      setAssignTarget({ shiftId: '', staffId: '' })
    } catch (e: any) {
      if (String(e?.message || '').includes('already assigned')) {
        setErrorMsg('Este empleado ya tiene turno ese día en este hotel.')
      } else {
        setErrorMsg('Error al asignar empleado')
      }
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Horarios</p>
          <h1 className="text-2xl font-bold text-white">Planificación de turnos</h1>
          <p className="text-sm text-slate-400">Turnos por hotel y semana, con asignación de personal.</p>
        </div>
        {errorMsg && <p className="rounded bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{errorMsg}</p>}
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm md:flex-row md:items-end md:justify-between">
        <label className="flex flex-col text-sm">
          <span className="text-xs font-semibold text-slate-300">Hotel</span>
          <select
            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
          >
            <option value="">Selecciona hotel</option>
            {hotelOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-xs font-semibold text-slate-300">Semana (lunes)</span>
          <input
            type="date"
            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white focus:border-nano-blue-500 outline-none transition-colors"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </label>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white hover:bg-white/5 transition-colors"
            onClick={() => {
              const d = new Date(weekStart + 'T00:00:00')
              d.setDate(d.getDate() - 7)
              setWeekStart(d.toISOString().slice(0, 10))
            }}
          >
            Semana anterior
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-white hover:bg-white/5 transition-colors"
            onClick={() => {
              const d = new Date(weekStart + 'T00:00:00')
              d.setDate(d.getDate() + 7)
              setWeekStart(d.toISOString().slice(0, 10))
            }}
          >
            Semana siguiente
          </button>
        </div>
      </div>

      {!selectedHotel ? (
        <p className="text-sm text-slate-400">Selecciona un hotel para ver turnos.</p>
      ) : shifts.isLoading ? (
        <p className="text-sm text-slate-400">Cargando turnos...</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">Turno</th>
                {days.map((d) => (
                  <th key={d} className="px-3 py-2 text-left text-xs font-semibold text-slate-300">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {shiftOrder.map((type) => (
                <tr key={type} className="align-top hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2 font-semibold text-white">{type}</td>
                  {days.map((day) => {
                    const key = `${day}-${type}`
                    const shift = shiftsByKey.get(key)
                    const missing = shift ? computeMissing(shift.requiredCount, shift.assignments.length) : 0
                    return (
                      <td key={key} className="min-w-[180px] px-3 py-2" data-testid={`cell-${day}-${type}`}>
                        {shift ? (
                          <div className="space-y-2 rounded border border-white/10 bg-nano-navy-900/50 p-2" data-testid={`shift-${shift.id}`}>
                            <p className="text-xs text-slate-300">
                              {shift.startsAt} - {shift.endsAt} · Req {shift.requiredCount}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {shift.assignments.map((a: any) => (
                                <span
                                  key={a.id}
                                  className="flex items-center gap-1 rounded-full bg-nano-blue-500/20 border border-nano-blue-500/30 px-2 py-1 text-xs text-nano-blue-100"
                                >
                                  {a.staffName}
                                  <button
                                    type="button"
                                    className="text-red-400 hover:text-red-300 disabled:text-slate-600 ml-1"
                                    onClick={() => canWrite && unassign.mutate(a.id)}
                                    aria-label="Quitar asignacion"
                                    disabled={!canWrite}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {!shift.assignments.length && <span className="text-xs text-slate-500">Sin asignar</span>}
                            </div>
                            {missing > 0 && (
                              <p className="text-xs font-semibold text-amber-500">Faltan {missing}</p>
                            )}
                            <div className="flex flex-col gap-1">
                              <select
                                className="rounded border border-white/10 bg-nano-navy-900 px-2 py-1 text-xs text-white outline-none focus:border-nano-blue-500"
                                aria-label={`Asignar-${day}-${type}`}
                                value={assignTarget.shiftId === shift.id ? assignTarget.staffId : ''}
                                onChange={(e) =>
                                  setAssignTarget({ shiftId: shift.id, staffId: e.target.value || '' })
                                }
                                disabled={!canWrite}
                              >
                                <option value="">Selecciona empleado</option>
                                {staff.data?.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.fullName}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="rounded bg-nano-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                disabled={
                                  assign.isPending ||
                                  !assignTarget.staffId ||
                                  assignTarget.shiftId !== shift.id ||
                                  !canWrite
                                }
                                onClick={handleAssign}
                              >
                                Asignar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="rounded border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-white/40 hover:text-white transition-colors"
                            onClick={() => handleCreate(day, type)}
                            disabled={!canWrite}
                          >
                            Crear turno
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
