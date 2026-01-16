import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, LayoutGrid, MapPin, PlayCircle } from 'lucide-react'
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
import { Badge } from '@/modules/shared/ui/Badge'
import { useVirtualizer } from '@tanstack/react-virtual'

const shiftOrder: ShiftType[] = ['desayuno', 'bar_tarde', 'eventos', 'produccion', 'libre']

function getMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const base = new Date(dateStr + 'T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const formatter = new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' })
  return `${formatter.format(start)} - ${formatter.format(end)}`
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
  const [weekStart, setWeekStart] = useState<string>(getMonday())
  const shifts = useShifts(selectedHotel, weekStart)
  const staff = useStaffMembers(activeOrgId ?? undefined, true)
  useUpsertShift(activeOrgId ?? undefined, selectedHotel, weekStart)
  useAssignStaff(activeOrgId ?? undefined, selectedHotel, weekStart)
  useUnassignStaff(selectedHotel, weekStart)
  const shiftsError = useFormattedError(shifts.error)
  const weekLabel = useMemo(() => formatWeekRange(weekStart), [weekStart])

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const hotelOptions = hotels.data ?? []

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, ShiftRow>()
    shifts.data?.forEach((s) => {
      map.set(`${s.shiftDate}-${s.shiftType}`, s)
    })
    return map
  }, [shifts.data])
  const staffCount = staff.data?.length ?? 0
  const gridRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: staffCount,
    getScrollElement: () => gridRef.current,
    estimateSize: () => 132,
    overscan: 6,
  })
  const virtualRows = virtualizer.getVirtualItems()

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
          <div className="flex items-center gap-1 rounded-2xl border border-white/20 px-2 text-sm text-muted-foreground backdrop-blur">
            <Button
              size="sm"
              variant="ghost"
              className="p-1 text-muted-foreground"
              aria-label="Previous day"
              onClick={() => setWeekStart((prev) => addDays(prev, -1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2 text-xs font-semibold uppercase tracking-wide">{weekLabel}</span>
            <Button
              size="sm"
              variant="ghost"
              className="p-1 text-muted-foreground"
              aria-label="Next day"
              onClick={() => setWeekStart((prev) => addDays(prev, 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
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
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span>Week</span>
            <Badge variant="info">{weekLabel}</Badge>
            <span>Role: All</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost">Copy week</Button>
            <Button size="sm" variant="ghost">Paste shifts</Button>
            <Button size="sm" variant="primary">Publish roster</Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wide">Legend:</span>
          <Badge variant="warning">Understaffed</Badge>
          <Badge variant="danger">Overtime</Badge>
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
        <div className="overflow-hidden rounded-3xl border border-border/25 bg-surface/80 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <div className="grid grid-cols-[220px_repeat(7,1fr)] gap-2 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Staff</span>
            {days.map((day) => (
              <span key={day}>{new Date(day).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
            ))}
          </div>
          {staffCount === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin personal activo en esta sucursal.</div>
          ) : (
            <div ref={gridRef} className="relative max-h-[540px] overflow-y-auto">
              <div style={{ height: virtualizer.getTotalSize() }} className="relative">
                {virtualRows.map((virtualRow) => {
                  const member = staff.data?.[virtualRow.index]
                  if (!member) return null
                  return (
                    <div
                      key={member.id}
                      className="absolute left-0 right-0 px-5 py-3"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <div className="grid grid-cols-[220px_repeat(7,1fr)] gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_10px_30px_rgba(3,7,18,0.35)]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10" />
                          <div>
                            <p className="font-semibold text-foreground">{member.fullName}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        {days.map((day) => {
                          const shift = shiftsByKey.get(`${day}-${shiftOrder[0]}`)
                          const missing = shift ? computeMissing(shift.requiredCount, shift.assignments.length) : 0
                          const overtime = shift ? shift.assignments.length > shift.requiredCount : false
                          return (
                            <div key={`${member.id}-${day}`} className="min-h-[90px]">
                              {shift ? (
                                <div className="space-y-2">
                                  <ShiftPill
                                    staffName={member.fullName}
                                    role={shift.shiftType}
                                    starts={shift.startsAt}
                                    ends={shift.endsAt}
                                    status={missing > 0 ? 'under' : overtime ? 'overtime' : undefined}
                                  />
                                  {missing > 0 && (
                                    <p className="text-[11px] text-warning font-semibold">
                                      Understaffed: {missing} más
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-[11px] text-muted-foreground">
                                  No shift
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
