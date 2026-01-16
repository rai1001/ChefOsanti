import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type VacationBalance = {
  orgId: string
  staffMemberId: string
  year: number
  daysTotal: number
  daysUsed: number
  daysRemaining: number
}

export type CompensationBalance = {
  orgId: string
  staffMemberId: string
  hoursOpen: number
}

export async function listVacationBalances(orgId: string | undefined): Promise<VacationBalance[]> {
  if (!orgId) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('staff_vacation_balances')
    .select('*')
    .eq('org_id', orgId)
    .order('staff_member_id')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'listVacationBalances',
      orgId,
    })
  }
  return (
    data?.map((row: any) => ({
      orgId: row.org_id,
      staffMemberId: row.staff_member_id,
      year: row.year,
      daysTotal: Number(row.days_total ?? 0),
      daysUsed: Number(row.days_used ?? 0),
      daysRemaining: Number(row.days_remaining ?? 0),
    })) ?? []
  )
}

export async function listCompensationBalances(orgId: string | undefined): Promise<CompensationBalance[]> {
  if (!orgId) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('staff_compensation_balances')
    .select('*')
    .eq('org_id', orgId)
    .order('staff_member_id')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'listCompensationBalances',
      orgId,
    })
  }
  return (
    data?.map((row: any) => ({
      orgId: row.org_id,
      staffMemberId: row.staff_member_id,
      hoursOpen: Number(row.hours_open ?? 0),
    })) ?? []
  )
}

export async function requestTimeOff(input: {
  orgId: string
  staffMemberId: string
  startDate: string
  endDate: string
  type: 'vacaciones' | 'permiso' | 'baja' | 'otros'
  notes?: string | null
  approved?: boolean
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('request_time_off', {
    p_org_id: input.orgId,
    p_staff_member_id: input.staffMemberId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_type: input.type,
    p_notes: input.notes ?? null,
    p_approved: input.approved ?? true,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'requestTimeOff',
      orgId: input.orgId,
      staffMemberId: input.staffMemberId,
    })
  }
  return data as string
}

export async function registerExtraShift(input: {
  orgId: string
  staffMemberId: string
  shiftDate: string
  hours: number
  reason?: string | null
  shiftId?: string | null
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('register_extra_shift', {
    p_org_id: input.orgId,
    p_staff_member_id: input.staffMemberId,
    p_shift_date: input.shiftDate,
    p_hours: input.hours,
    p_reason: input.reason ?? null,
    p_shift_id: input.shiftId ?? null,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'registerExtraShift',
      orgId: input.orgId,
      staffMemberId: input.staffMemberId,
    })
  }
  return data as string
}

export function useVacationBalances(orgId: string | undefined) {
  return useQuery({
    queryKey: ['staff_vacation_balances', orgId],
    queryFn: () => listVacationBalances(orgId),
    enabled: Boolean(orgId),
  })
}

export function useCompensationBalances(orgId: string | undefined) {
  return useQuery({
    queryKey: ['staff_compensation_balances', orgId],
    queryFn: () => listCompensationBalances(orgId),
    enabled: Boolean(orgId),
  })
}

export function useRequestTimeOff(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      staffMemberId: string
      startDate: string
      endDate: string
      type: 'vacaciones' | 'permiso' | 'baja' | 'otros'
      notes?: string | null
      approved?: boolean
    }) => {
      if (!orgId) throw new Error('Falta orgId')
      return requestTimeOff({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff_vacation_balances', orgId] })
      qc.invalidateQueries({ queryKey: ['staff_time_off', orgId] })
    },
  })
}

export function useRegisterExtraShift(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { staffMemberId: string; shiftDate: string; hours: number; reason?: string | null }) => {
      if (!orgId) throw new Error('Falta orgId')
      return registerExtraShift({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff_compensation_balances', orgId] })
      qc.invalidateQueries({ queryKey: ['staff_extra_shifts', orgId] })
    },
  })
}
