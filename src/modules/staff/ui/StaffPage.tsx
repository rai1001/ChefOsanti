import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useCreateStaffMember, useStaffMembers, useToggleStaffActive } from '../data/staff'
import type { EmploymentType, StaffRole } from '../domain/staff'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { useQueryClient } from '@tanstack/react-query'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

const roles: StaffRole[] = ['jefe_cocina', 'cocinero', 'ayudante', 'pasteleria', 'office', 'otros']
const types: EmploymentType[] = ['fijo', 'eventual', 'extra']

export default function StaffPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const [onlyActive, setOnlyActive] = useState(true)
  const staff = useStaffMembers(activeOrgId ?? undefined, onlyActive)
  const hotels = useHotels()
  const createStaff = useCreateStaffMember(activeOrgId ?? undefined)
  const toggleActive = useToggleStaffActive(activeOrgId ?? undefined)
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

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20">
        <p className="text-sm font-semibold text-red-500">Error</p>
        <p className="text-xs text-red-400 opacity-90">{formattedError || 'Selecciona una organización.'}</p>
      </div>
    )
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

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Personal</p>
          <h1 className="text-2xl font-bold text-white">Staff por organización</h1>
          <p className="text-sm text-slate-400">Gestión global de empleados, con hotel base opcional.</p>
        </div>
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
      </header>

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
        <h2 className="text-sm font-semibold text-white">Listado</h2>
        {staff.isLoading && <p className="text-xs text-slate-400">Cargando staff...</p>}
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
          {!staff.data?.length && <p className="text-sm text-slate-400 italic">Sin empleados aún.</p>}
        </div>
      </div>

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="Personal"
        entity="staff"
        fields={[
          { key: 'fullName', label: 'Nombre Completo' },
          { key: 'role', label: 'Rol', transform: (val) => roles.includes(val as any) ? val : 'cocinero' },
          { key: 'employmentType', label: 'Tipo (fijo/eventual)', transform: (val) => types.includes(val as any) ? val : 'fijo' },
          { key: 'maxShifts', label: 'Max Turnos', transform: (val) => Number(val) || 5 },
        ]}
      />
    </div>
  )
}
