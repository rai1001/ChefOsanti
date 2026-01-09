import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type SchedulingRules = {
  orgId: string
  hotelId: string
  morningRequiredWeekday: number
  morningRequiredWeekend: number
  afternoonRequiredDaily: number
  enforceTwoConsecutiveDaysOff: boolean
  enforceOneWeekendOffPer30d: boolean
}

export async function getSchedulingRules(hotelId?: string): Promise<SchedulingRules | null> {
  if (!hotelId) return null
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('scheduling_rules').select('*').eq('hotel_id', hotelId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'getSchedulingRules',
      hotelId,
    })
  }
  if (!data) return null
  return {
    orgId: data.org_id,
    hotelId: data.hotel_id,
    morningRequiredWeekday: data.morning_required_weekday,
    morningRequiredWeekend: data.morning_required_weekend,
    afternoonRequiredDaily: data.afternoon_required_daily,
    enforceTwoConsecutiveDaysOff: data.enforce_two_consecutive_days_off,
    enforceOneWeekendOffPer30d: data.enforce_one_weekend_off_per_30d,
  }
}

export async function saveSchedulingRules(params: SchedulingRules) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('scheduling_rules')
    .upsert({
      org_id: params.orgId,
      hotel_id: params.hotelId,
      morning_required_weekday: params.morningRequiredWeekday,
      morning_required_weekend: params.morningRequiredWeekend,
      afternoon_required_daily: params.afternoonRequiredDaily,
      enforce_two_consecutive_days_off: params.enforceTwoConsecutiveDaysOff,
      enforce_one_weekend_off_per_30d: params.enforceOneWeekendOffPer30d,
    })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'saveSchedulingRules',
      hotelId: params.hotelId,
    })
  }
}

export async function createTimeOff(params: {
  orgId: string
  staffMemberId: string
  startDate: string
  endDate: string
  type: string
  notes?: string | null
}) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('staff_time_off')
    .insert({
      org_id: params.orgId,
      staff_member_id: params.staffMemberId,
      start_date: params.startDate,
      end_date: params.endDate,
      type: params.type,
      notes: params.notes ?? null,
      approved: true,
    })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'createTimeOff',
      orgId: params.orgId,
      staffMemberId: params.staffMemberId,
    })
  }
}

export async function generateRoster(params: { hotelId: string; weekStart: string; apply?: boolean }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('generate_week_roster_v2', {
    hotel_id: params.hotelId,
    week_start: params.weekStart,
    dry_run: !(params.apply ?? false),
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'scheduling',
      operation: 'generateRoster',
      hotelId: params.hotelId,
      weekStart: params.weekStart,
    })
  }
  return data
}

export function useSchedulingRules(hotelId?: string) {
  return useQuery({ queryKey: ['scheduling-rules', hotelId], queryFn: () => getSchedulingRules(hotelId), enabled: Boolean(hotelId) })
}

export function useSaveSchedulingRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SchedulingRules) => saveSchedulingRules(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['scheduling-rules', variables.hotelId] })
    },
  })
}

export function useGenerateRoster(hotelId?: string, weekStart?: string) {
  return useMutation({
    mutationFn: (apply: boolean) => {
      if (!hotelId || !weekStart) throw new Error('Falta hotel o semana')
      return generateRoster({ hotelId, weekStart, apply })
    },
  })
}

export function useCreateTimeOff(orgId?: string, hotelId?: string, weekStart?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { staffMemberId: string; startDate: string; endDate: string; type: string; notes?: string | null }) => {
      if (!orgId) throw new Error('Falta org')
      return createTimeOff({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff_time_off', orgId] })
      qc.invalidateQueries({ queryKey: ['shifts', hotelId, weekStart] })
    },
  })
}
