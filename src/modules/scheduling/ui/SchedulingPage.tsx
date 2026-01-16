import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, LayoutGrid, MapPin, PlayCircle } from 'lucide-react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useStaffMembers } from '@/modules/staff/data/staff'
import { computeMissing, getWeekDays } from '../domain/shifts'
import { useAssignStaff, useShifts, useUnassignStaff, useUpsertShift, type ShiftRow } from '../data/shifts'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Card } from '@/modules/shared/ui/Card'
import { Button } from '@/modules/shared/ui/Button'
import { Badge } from '@/modules/shared/ui/Badge'
import { useVirtualizer } from '@tanstack/react-virtual'


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

type ViewMode = 'day' | 'week' | 'month'

function formatDayLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00Z')
  return new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' }).format(date)
}

function formatMonthLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00Z')
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date)
}

function startOfMonth(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(1)
  return date.toISOString().slice(0, 10)
}

function endOfMonth(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return date.toISOString().slice(0, 10)
}

function getMonthDays(dateStr: string): string[] {
  const start = new Date(startOfMonth(dateStr) + 'T00:00:00Z')
  const end = new Date(endOfMonth(dateStr) + 'T00:00:00Z')
  const days: string[] = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function addMonths(dateStr: string, delta: number): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCMonth(date.getUTCMonth() + delta)
  return date.toISOString().slice(0, 10)
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
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const rangeStart = useMemo(() => (viewMode === 'month' ? startOfMonth(weekStart) : weekStart), [viewMode, weekStart])
  const rangeEnd = useMemo(() => {
    if (viewMode === 'month') return endOfMonth(weekStart)
    if (viewMode === 'day') return weekStart
    return addDays(weekStart, 6)
  }, [viewMode, weekStart])
  const shifts = useShifts(selectedHotel, rangeStart, rangeEnd)
  const staff = useStaffMembers(activeOrgId ?? undefined, true)
  useUpsertShift(activeOrgId ?? undefined, selectedHotel, rangeStart, rangeEnd)
  useAssignStaff(activeOrgId ?? undefined, selectedHotel, rangeStart, rangeEnd)
  useUnassignStaff(selectedHotel, rangeStart, rangeEnd)
  const shiftsError = useFormattedError(shifts.error)
  const weekLabel = useMemo(() => {
    if (viewMode === 'month') return formatMonthLabel(weekStart)
    if (viewMode === 'day') return formatDayLabel(weekStart)
    return formatWeekRange(weekStart)
  }, [viewMode, weekStart])

  const handlePrev = () => {
    setWeekStart((prev) => (viewMode === 'month' ? addMonths(prev, -1) : addDays(prev, -1)))
  }

  const handleNext = () => {
    setWeekStart((prev) => (viewMode === 'month' ? addMonths(prev, 1) : addDays(prev, 1)))
  }

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const displayDays = useMemo(() => {
    if (viewMode === 'month') return getMonthDays(weekStart)
    if (viewMode === 'day') return [weekStart]
    return weekDays
  }, [viewMode, weekStart, weekDays])
  const gridTemplateColumns = useMemo(() => {
    const minWidth = viewMode === 'month' ? '70px' : '120px'
    return `220px repeat(${displayDays.length}, minmax(${minWidth}, 1fr))`
  }, [displayDays.length, viewMode])
  const hotelOptions = hotels.data ?? []

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftRow[]>()
    shifts.data?.forEach((s) => {
      const list = map.get(s.shiftDate) ?? []
      list.push(s)
      map.set(s.shiftDate, list)
    })
    return map
  }, [shifts.data])
  const missingByDay = useMemo(() => {
    const map = new Map<string, number>()
    shifts.data?.forEach((s) => {
      const missing = computeMissing(s.requiredCount, s.assignments.length)
      if (missing > 0) {
        map.set(s.shiftDate, (map.get(s.shiftDate) ?? 0) + missing)
      }
    })
    return map
  }, [shifts.data])
  const staffCount = staff.data?.length ?? 0
  const gridRef = useRef<HTMLDivElement>(null)
  const rowSize = viewMode === 'month' ? 96 : 132
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: staffCount,
    getScrollElement: () => gridRef.current,
    estimateSize: () => rowSize,
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
              onClick={handlePrev}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2 text-xs font-semibold uppercase tracking-wide">{weekLabel}</span>
            <Button
              size="sm"
              variant="ghost"
              className="p-1 text-muted-foreground"
              aria-label="Next day"
              onClick={handleNext}
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
            <Button size="sm" variant={viewMode === 'day' ? 'primary' : 'secondary'} onClick={() => setViewMode('day')}>Day</Button>
            <Button size="sm" variant={viewMode === 'week' ? 'primary' : 'secondary'} onClick={() => setViewMode('week')}>Week</Button>
            <Button size="sm" variant={viewMode === 'month' ? 'primary' : 'secondary'} onClick={() => setViewMode('month')}>Month</Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span>{viewMode === 'month' ? 'Mes' : viewMode === 'day' ? 'Día' : 'Week'}</span>
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
        <div className="overflow-x-auto rounded-3xl border border-border/25 bg-surface/80 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <div
            className="grid gap-2 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns }}
          >
            <span>Staff</span>
            {displayDays.map((day) => {
              const missing = missingByDay.get(day) ?? 0
              return (
                <div key={day} className="flex flex-col gap-1">
                  <span>{formatDayLabel(day)}</span>
                  {missing > 0 && <span className="text-[10px] text-warning">Faltan {missing}</span>}
                </div>
              )
            })}
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
                      <div
                        className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_10px_30px_rgba(3,7,18,0.35)]"
                        style={{ gridTemplateColumns }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/10" />
                          <div>
                            <p className="font-semibold text-foreground">{member.fullName}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        {displayDays.map((day) => {
                          const shiftsForDay = shiftsByDay.get(day) ?? []
                          const assigned = shiftsForDay.filter((s) =>
                            s.assignments.some((a) => a.staffMemberId === member.id),
                          )
                          return (
                            <div key={`${member.id}-${day}`} className="min-h-[90px]">
                              {viewMode === 'month' ? (
                                assigned.length ? (
                                  <div className="flex h-full items-center justify-center">
                                    <Badge variant="neutral">{assigned.length}</Badge>
                                  </div>
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">-</div>
                                )
                              ) : assigned.length ? (
                                <div className="space-y-2">
                                  {assigned.map((shift) => (
                                    <ShiftPill
                                      key={shift.id}
                                      staffName={member.fullName}
                                      role={shift.shiftType}
                                      starts={shift.startsAt}
                                      ends={shift.endsAt}
                                    />
                                  ))}
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
