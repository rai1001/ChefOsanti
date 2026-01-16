import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useCreateStaffMember, useStaffMembers, useToggleStaffActive } from '../data/staff'
import { useCompensationBalances, useRegisterExtraShift, useRequestTimeOff, useVacationBalances } from '../data/vacations'
import type { EmploymentType, StaffRole } from '../domain/staff'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'

const roles: StaffRole[] = ['jefe_cocina', 'cocinero', 'ayudante', 'pasteleria', 'office', 'otros']
const types: EmploymentType[] = ['fijo', 'eventual', 'extra']

export default function StaffPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const [onlyActive, setOnlyActive] = useState(true)
  const staff = useStaffMembers(activeOrgId ?? undefined, onlyActive)
  const vacationBalances = useVacationBalances(activeOrgId ?? undefined)
  const compensationBalances = useCompensationBalances(activeOrgId ?? undefined)
  const hotels = useHotels()
  const createStaff = useCreateStaffMember(activeOrgId ?? undefined)
  const toggleActive = useToggleStaffActive(activeOrgId ?? undefined)
  const requestTimeOff = useRequestTimeOff(activeOrgId ?? undefined)
  const registerExtraShift = useRegisterExtraShift(activeOrgId ?? undefined)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'staff:write')
  const [isImporterOpen, setIsImporterOpen] = useState(false)
  // queryClient removed
  const formattedError = useFormattedError(error)
  const createError = useFormattedError(createStaff.error)

  const [fullName, setFullName] = useState('')
  const [roleInput, setRoleInput] = useState<StaffRole>('cocinero')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('fijo')
  const [homeHotelId, setHomeHotelId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [shiftPattern, setShiftPattern] = useState<'mañana' | 'tarde' | 'rotativo'>('rotativo')
  const [maxShifts, setMaxShifts] = useState<number>(5)
  const [timeOffStaffId, setTimeOffStaffId] = useState<string>('')
  const [timeOffStart, setTimeOffStart] = useState<string>('')
  const [timeOffEnd, setTimeOffEnd] = useState<string>('')
  const [timeOffType, setTimeOffType] = useState<'vacaciones' | 'permiso' | 'baja' | 'otros'>('vacaciones')
  const [timeOffNotes, setTimeOffNotes] = useState('')
  const [extraStaffId, setExtraStaffId] = useState<string>('')
  const [extraDate, setExtraDate] = useState<string>('')
  const [extraHours, setExtraHours] = useState<number>(0)
  const [extraReason, setExtraReason] = useState('')

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  if (error || !activeOrgId) {
    return (
      <ErrorBanner title="Selecciona una organización" message={formattedError || 'Selecciona una organización.'} />
    )
  }

  const onSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!timeOffStaffId || !timeOffStart || !timeOffEnd || !canWrite) return
    await requestTimeOff.mutateAsync({
      staffMemberId: timeOffStaffId,
      startDate: timeOffStart,
      endDate: timeOffEnd,
      type: timeOffType,
      notes: timeOffNotes || null,
      approved: true,
    })
    setTimeOffStaffId('')
    setTimeOffStart('')
    setTimeOffEnd('')
    setTimeOffType('vacaciones')
    setTimeOffNotes('')
  }

  const onSubmitExtraShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!extraStaffId || !extraDate || extraHours <= 0 || !canWrite) return
    await registerExtraShift.mutateAsync({
      staffMemberId: extraStaffId,
      shiftDate: extraDate,
      hours: extraHours,
      reason: extraReason || null,
    })
    setExtraStaffId('')
    setExtraDate('')
    setExtraHours(0)
    setExtraReason('')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !canWrite) return
    await createStaff.mutateAsync({
      fullName: fullName.trim(),
      role: roleInput,
      employmentType,
      homeHotelId: homeHotelId || null,
      notes: notes || null,
      shiftPattern,
      maxShiftsPerWeek: maxShifts,
    })
    setFullName('')
    setRoleInput('cocinero')
    setEmploymentType('fijo')
    setHomeHotelId('')
    setNotes('')
    setShiftPattern('rotativo')
    setMaxShifts(5)
  }

  const hotelMap = (hotels.data ?? []).reduce<Record<string, string>>((acc, h) => {
    acc[h.id] = h.name
    return acc
  }, {})

  const vacationByStaff = (vacationBalances.data ?? []).reduce<Record<string, { remaining: number; total: number }>>((acc, row) => {
    acc[row.staffMemberId] = { remaining: row.daysRemaining, total: row.daysTotal }
    return acc
  }, {})

  const compensationByStaff = (compensationBalances.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.staffMemberId] = row.hoursOpen
    return acc
  }, {})

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Staff por organización"
        subtitle="Gestión global de empleados, con hotel base opcional."
        actions={
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1 text-slate-300">
              <input
                type="checkbox"
                className="rounded border-white/10 bg-nano-navy-900 text-nano-blue-500 focus:ring-nano-blue-500"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              Mostrar solo activos
            </label>
            {canWrite && (
              <button
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-nano-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Importar
              </button>
            )}
          </div>
        }
      />

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Nuevo empleado</h2>
        {!canWrite && <p className="text-xs text-slate-400">Sin permisos para crear o editar.</p>}
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Nombre completo</span>
            <input
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Rol</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value as StaffRole)}
              disabled={!canWrite}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Tipo</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              disabled={!canWrite}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Hotel base (opcional)</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={homeHotelId}
              onChange={(e) => setHomeHotelId(e.target.value)}
              disabled={!canWrite}
            >
              <option value="">Sin asignar</option>
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Notas</span>
            <textarea
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canWrite}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Patrón de turno</span>
            <select
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={shiftPattern}
              onChange={(e) => setShiftPattern(e.target.value as 'mañana' | 'tarde' | 'rotativo')}
              disabled={!canWrite}
            >
              <option value="mañana">mañana</option>
              <option value="tarde">tarde</option>
              <option value="rotativo">rotativo</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Max turnos/semana</span>
            <input
              type="number"
              className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white focus:border-nano-blue-500 outline-none transition-colors"
              value={maxShifts}
              onChange={(e) => setMaxShifts(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!canWrite || createStaff.isPending}
              className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              title={!canWrite ? 'Sin permisos' : undefined}
            >
              {createStaff.isPending ? 'Guardando...' : 'Crear empleado'}
            </button>
            {createStaff.isError && (
              <div className="mt-2 text-sm text-red-500">
                <span className="font-semibold block">Error:</span>
                <span className="text-xs opacity-90">{createError}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Vacaciones y compensaciones</h2>
        {!canWrite && <p className="text-xs text-slate-400">Sin permisos para registrar ajustes.</p>}
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <form className="space-y-3" onSubmit={onSubmitTimeOff}>
            <p className="text-xs font-semibold text-slate-300">Registrar vacaciones</p>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Empleado</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                value={timeOffStaffId}
                onChange={(e) => setTimeOffStaffId(e.target.value)}
                disabled={!canWrite}
              >
                <option value="">Selecciona</option>
                {staff.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Desde</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                  value={timeOffStart}
                  onChange={(e) => setTimeOffStart(e.target.value)}
                  disabled={!canWrite}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Hasta</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                  value={timeOffEnd}
                  onChange={(e) => setTimeOffEnd(e.target.value)}
                  disabled={!canWrite}
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Tipo</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                value={timeOffType}
                onChange={(e) => setTimeOffType(e.target.value as typeof timeOffType)}
                disabled={!canWrite}
              >
                <option value="vacaciones">Vacaciones</option>
                <option value="permiso">Permiso</option>
                <option value="baja">Baja</option>
                <option value="otros">Otros</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Notas</span>
              <input
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                value={timeOffNotes}
                onChange={(e) => setTimeOffNotes(e.target.value)}
                disabled={!canWrite}
              />
            </label>
            <button
              type="submit"
              disabled={!canWrite || requestTimeOff.isPending}
              className="w-full rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {requestTimeOff.isPending ? 'Guardando...' : 'Registrar vacaciones'}
            </button>
          </form>

          <form className="space-y-3" onSubmit={onSubmitExtraShift}>
            <p className="text-xs font-semibold text-slate-300">Registrar turno extra</p>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Empleado</span>
              <select
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                value={extraStaffId}
                onChange={(e) => setExtraStaffId(e.target.value)}
                disabled={!canWrite}
              >
                <option value="">Selecciona</option>
                {staff.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Fecha</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                  value={extraDate}
                  onChange={(e) => setExtraDate(e.target.value)}
                  disabled={!canWrite}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Horas</span>
                <input
                  type="number"
                  step="0.5"
                  className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                  value={extraHours}
                  onChange={(e) => setExtraHours(Number(e.target.value) || 0)}
                  disabled={!canWrite}
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Motivo</span>
              <input
                className="w-full rounded-md border border-white/10 bg-nano-navy-900 px-3 py-2 text-sm text-white"
                value={extraReason}
                onChange={(e) => setExtraReason(e.target.value)}
                disabled={!canWrite}
              />
            </label>
            <button
              type="submit"
              disabled={!canWrite || registerExtraShift.isPending}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {registerExtraShift.isPending ? 'Guardando...' : 'Registrar turno extra'}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Listado</h2>
        {staff.isLoading && (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        <div className="mt-3 space-y-2">
          {staff.data?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <div>
                <p className="font-semibold text-slate-200">{s.fullName}</p>
                <p className="text-xs text-slate-400">
                  Rol: {s.role} · Tipo: {s.employmentType} · Patrón: {s.shiftPattern} · Max:{' '}
                  {s.maxShiftsPerWeek}
                </p>
                <p className="text-xs text-slate-500">
                  Hotel base: {s.homeHotelId ? hotelMap[s.homeHotelId] ?? s.homeHotelId : 'N/A'}
                </p>
                <p className="text-xs text-slate-500">
                  Vacaciones: {vacationByStaff[s.id] ? `${vacationByStaff[s.id].remaining}/${vacationByStaff[s.id].total}` : '--'} | Comp: {(compensationByStaff[s.id] ?? 0).toFixed(1)}h
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${s.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                >
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  type="button"
                  className="rounded border border-white/10 bg-nano-navy-900 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  onClick={() => canWrite && toggleActive.mutate({ id: s.id, active: !s.active })}
                  disabled={!canWrite}
                >
                  {s.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
          {!staff.isLoading && !staff.data?.length && <p className="text-sm text-slate-400 italic">Sin empleados aún.</p>}
        </div>
      </div>

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="Personal"
        entity="staff"
        fields={[
          { key: 'full_name', label: 'Nombre Completo', aliases: ['nombre', 'fullName', 'full name'] },
          { key: 'role', label: 'Rol', aliases: ['role'], transform: (val) => roles.includes(val as any) ? val : 'cocinero' },
          { key: 'employment_type', label: 'Tipo (fijo/eventual)', aliases: ['tipo', 'employmentType', 'employment type'], transform: (val) => types.includes(val as any) ? val : 'fijo' },
          { key: 'max_shifts', label: 'Max Turnos', aliases: ['max turnos', 'maxShifts', 'max_shifts'], transform: (val) => Number(val) || 5 },
        ]}
      />
    </div>
  )
}
