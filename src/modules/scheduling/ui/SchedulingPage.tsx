import { useMemo, useState } from 'react'
import { Filter, LayoutGrid, MapPin, PlayCircle } from 'lucide-react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useStaffMembers } from '@/modules/staff/data/staff'
import { computeMissing, getWeekDays, type ShiftType } from '../domain/shifts'
import { useAssignStaff, useShifts, useUnassignStaff, useUpsertShift, type ShiftRow } from '../data/shifts'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Card } from '@/modules/shared/ui/Card'
import { Button } from '@/modules/shared/ui/Button'

const shiftOrder: ShiftType[] = ['desayuno', 'bar_tarde', 'eventos', 'produccion', 'libre']

function getMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function ShiftPill({
  staffName,
  role,
  starts,
  ends,
  status,
}: {
  staffName: string
  role: string
  starts: string
  ends: string
  status?: 'under' | 'overtime'
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_18px_44px_rgba(3,7,18,0.45)]">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{staffName}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
          {role}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground">
        {starts} - {ends}
      </p>
      {status === 'under' && (
        <p className="mt-1 text-[11px] font-semibold text-warning">Understaffed: 2 more needed</p>
      )}
      {status === 'overtime' && (
        <p className="mt-1 text-[11px] font-semibold text-warning">Overtime alert: &gt;40 hrs</p>
      )}
    </div>
  )
}

export default function SchedulingPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const hotels = useHotels()
  const formattedError = useFormattedError(error)
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [weekStart] = useState<string>(getMonday())
  const shifts = useShifts(selectedHotel, weekStart)
  const staff = useStaffMembers(activeOrgId ?? undefined, true)
  useUpsertShift(activeOrgId ?? undefined, selectedHotel, weekStart)
  useAssignStaff(activeOrgId ?? undefined, selectedHotel, weekStart)
  useUnassignStaff(selectedHotel, weekStart)
  const shiftsError = useFormattedError(shifts.error)

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const hotelOptions = hotels.data ?? []

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, ShiftRow>()
    shifts.data?.forEach((s) => {
      map.set(`${s.shiftDate}-${s.shiftType}`, s)
    })
    return map
  }, [shifts.data])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  if (error || !activeOrgId) {
    return <ErrorBanner title="Selecciona organizacion" message={formattedError || 'Selecciona una organizacion valida.'} />
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Staff Scheduling</p>
          <h1 className="text-3xl font-semibold text-foreground">Staff Scheduling</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" className="gap-2">
            <PlayCircle size={16} />
            Generate Schedule
          </Button>
          <Button variant="secondary" className="gap-2">
            <LayoutGrid size={16} />
            Week
          </Button>
          <Button variant="ghost" className="gap-2">
            <Filter size={16} />
            Filters
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutGrid size={16} />
            Multi-Tenant
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={16} />
            <select
              className="ds-input"
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
            >
              <option value="">Select Hotel</option>
              {hotelOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary">Day</Button>
            <Button size="sm" variant="primary">Week</Button>
            <Button size="sm" variant="secondary">Month</Button>
          </div>
        </div>
      </Card>

      {!selectedHotel ? (
        <div className="rounded-2xl border border-dashed border-border/30 bg-surface/60 p-6 text-center text-sm text-muted-foreground">
          Selecciona un hotel para ver turnos.
        </div>
      ) : shifts.isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : shifts.isError ? (
        <ErrorBanner title="Error al cargar turnos" message={shiftsError} onRetry={() => shifts.refetch()} />
      ) : (
        <div className="overflow-auto rounded-2xl border border-border/25 bg-surface/80 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Staff
                </th>
                {days.map((d) => (
                  <th key={d} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.data?.map((member) => (
                <tr key={member.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/10" />
                      <div>
                        <p className="font-semibold">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const shift = shiftsByKey.get(`${day}-${shiftOrder[0]}`) // simplified mapping for demo
                    const missing = shift ? computeMissing(shift.requiredCount, shift.assignments.length) : 0
                    return (
                      <td key={day} className="px-4 py-3 align-top">
                        {shift ? (
                          <div className="space-y-2">
                            <ShiftPill
                              staffName={member.fullName}
                              role={shift.shiftType}
                              starts={shift.startsAt}
                              ends={shift.endsAt}
                              status={missing > 0 ? 'under' : undefined}
                            />
                            {missing > 0 && (
                              <p className="text-[11px] text-warning font-semibold">
                                Understaffed: {missing} more needed
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted-foreground">
                            No shift
                          </div>
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
