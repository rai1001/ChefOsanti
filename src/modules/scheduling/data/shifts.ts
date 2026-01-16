import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { ShiftType } from '../domain/shifts'

export type ShiftRow = {
  id: string
  orgId: string
  hotelId: string
  shiftDate: string
  shiftType: ShiftType
  startsAt: string
  endsAt: string
  requiredCount: number
  notes?: string | null
  assignments: {
    id: string
    staffMemberId: string
    staffName: string
  }[]
}

function mapShift(row: any): ShiftRow {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    shiftDate: row.shift_date,
    shiftType: row.shift_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    requiredCount: row.required_count,
    notes: row.notes,
    assignments:
      row.staff_assignments?.map((a: any) => ({
        id: a.id,
        staffMemberId: a.staff_member_id,
        staffName: a.staff_members?.full_name ?? a.staff_member_id,
      })) ?? [],
  }
}

export async function listShifts(params: {
  hotelId?: string
  rangeStart?: string
  rangeEnd?: string
}): Promise<ShiftRow[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('shifts')
    .select('*, staff_assignments(id, staff_member_id, staff_members(full_name))')
    .order('shift_date', { ascending: true })
    .order('shift_type', { ascending: true })
  if (params.hotelId) query = query.eq('hotel_id', params.hotelId)
  if (params.rangeStart) {
    const start = params.rangeStart
    const end =
      params.rangeEnd ??
      (() => {
        const fallback = new Date(start + 'T00:00:00')
        fallback.setDate(fallback.getDate() + 6)
        return fallback.toISOString().slice(0, 10)
      })()
    query = query.gte('shift_date', start).lte('shift_date', end)
  }
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'listShifts',
      hotelId: params.hotelId,
      rangeStart: params.rangeStart,
    })
  }
  return data?.map(mapShift) ?? []
}

export async function upsertShift(params: {
  orgId: string
  hotelId: string
  shiftDate: string
  shiftType: ShiftType
  startsAt: string
  endsAt: string
  requiredCount: number
  notes?: string | null
}): Promise<ShiftRow> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shifts')
    .upsert(
      {
        org_id: params.orgId,
        hotel_id: params.hotelId,
        shift_date: params.shiftDate,
        shift_type: params.shiftType,
        starts_at: params.startsAt,
        ends_at: params.endsAt,
        required_count: params.requiredCount,
        notes: params.notes ?? null,
      },
      { onConflict: 'hotel_id,shift_date,shift_type' },
    )
    .select('*, staff_assignments(id, staff_member_id, staff_members(full_name))')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'upsertShift',
      orgId: params.orgId,
      hotelId: params.hotelId,
    })
  }
  return mapShift(data)
}

export async function assignStaff(params: { orgId: string; shiftId: string; staffMemberId: string }) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('staff_assignments')
    .insert({
      org_id: params.orgId,
      shift_id: params.shiftId,
      staff_member_id: params.staffMemberId,
    })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'assignStaff',
      orgId: params.orgId,
      shiftId: params.shiftId,
    })
  }
}

export async function unassignStaff(assignmentId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('staff_assignments').delete().eq('id', assignmentId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'unassignStaff',
      assignmentId,
    })
  }
}

export function useShifts(hotelId?: string, rangeStart?: string, rangeEnd?: string) {
  return useQuery({
    queryKey: ['shifts', hotelId, rangeStart, rangeEnd],
    queryFn: () => listShifts({ hotelId, rangeStart, rangeEnd }),
    enabled: Boolean(hotelId),
  })
}

export function useUpsertShift(orgId?: string, hotelId?: string, rangeStart?: string, rangeEnd?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { shiftDate: string; shiftType: ShiftType; startsAt: string; endsAt: string; requiredCount: number; notes?: string | null }) => {
      if (!orgId || !hotelId) throw new Error('Falta org u hotel')
      return upsertShift({ orgId, hotelId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts', hotelId, rangeStart, rangeEnd] })
    },
  })
}

export function useAssignStaff(orgId?: string, hotelId?: string, rangeStart?: string, rangeEnd?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { shiftId: string; staffMemberId: string }) => {
      if (!orgId) throw new Error('Falta org')
      return assignStaff({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts', hotelId, rangeStart, rangeEnd] })
    },
  })
}

export function useUnassignStaff(hotelId?: string, rangeStart?: string, rangeEnd?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => unassignStaff(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts', hotelId, rangeStart, rangeEnd] })
    },
  })
}
